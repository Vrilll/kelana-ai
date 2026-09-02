"""
KelanaAI - Sync the knowledge base to S3
Session 9

Uploads backend/knowledge_base/*.md to the configured S3 bucket and, when a
Bedrock Knowledge Base id is set, starts an ingestion job so the new documents
are chunked and embedded.

    cd backend
    python scripts/sync_kb.py            # upload, then ingest if configured
    python scripts/sync_kb.py --dry-run  # list what would be uploaded

Requires AWS credentials with s3:PutObject on the bucket and, for ingestion,
bedrock:StartIngestionJob on the knowledge base.

This script never creates the bucket, the knowledge base or the vector store -
those are provisioned once, deliberately, because a Bedrock Knowledge Base
carries a standing cost. It only syncs content into infrastructure that already
exists.
"""

import argparse
import hashlib
import os
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import boto3  # noqa: E402
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")

KB_DIR = BACKEND_DIR / "knowledge_base"

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET = os.getenv("KB_S3_BUCKET", "").strip()
PREFIX = os.getenv("KB_S3_PREFIX", "knowledge-base/").strip()
KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID", "").strip()
DATA_SOURCE_ID = os.getenv("BEDROCK_DATA_SOURCE_ID", "").strip()


def local_documents() -> list[Path]:
    return sorted(KB_DIR.glob("*.md"))


def checksum(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def upload(dry_run: bool) -> list[str]:
    """Upload every document, skipping ones whose content is already in S3."""
    documents = local_documents()
    if not documents:
        print(f"No documents found in {KB_DIR}")
        return []

    print(f"{len(documents)} documents in {KB_DIR}")

    if dry_run:
        for path in documents:
            print(f"  would upload {path.name} -> s3://{BUCKET}/{PREFIX}{path.name}")
        return []

    s3 = boto3.client("s3", region_name=AWS_REGION)
    uploaded = []

    for path in documents:
        key = f"{PREFIX}{path.name}"
        digest = checksum(path)

        try:
            head = s3.head_object(Bucket=BUCKET, Key=key)
            if head.get("Metadata", {}).get("content-md5") == digest:
                print(f"  unchanged  {path.name}")
                continue
        except ClientError as error:
            if error.response["Error"]["Code"] not in ("404", "NoSuchKey", "403"):
                raise

        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=path.read_bytes(),
            ContentType="text/markdown; charset=utf-8",
            Metadata={"content-md5": digest},
        )
        print(f"  uploaded   {path.name}")
        uploaded.append(key)

    return uploaded


def ingest(wait: bool) -> None:
    """Tell Bedrock to re-read the data source."""
    if not (KNOWLEDGE_BASE_ID and DATA_SOURCE_ID):
        print(
            "\nBEDROCK_KNOWLEDGE_BASE_ID / BEDROCK_DATA_SOURCE_ID are not set, so no "
            "ingestion job was started.\nThe documents are in S3; the app will use the "
            "local BM25 retriever until you set them."
        )
        return

    agent = boto3.client("bedrock-agent", region_name=AWS_REGION)
    job = agent.start_ingestion_job(
        knowledgeBaseId=KNOWLEDGE_BASE_ID, dataSourceId=DATA_SOURCE_ID
    )["ingestionJob"]

    job_id = job["ingestionJobId"]
    print(f"\nIngestion job {job_id} started ({job['status']})")

    if not wait:
        return

    while True:
        time.sleep(10)
        current = agent.get_ingestion_job(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            dataSourceId=DATA_SOURCE_ID,
            ingestionJobId=job_id,
        )["ingestionJob"]

        status = current["status"]
        print(f"  {status}")

        if status in ("COMPLETE", "FAILED", "STOPPED"):
            stats = current.get("statistics", {})
            if stats:
                print(f"  scanned {stats.get('numberOfDocumentsScanned', '?')}, "
                      f"indexed {stats.get('numberOfNewDocumentsIndexed', '?')}, "
                      f"failed {stats.get('numberOfDocumentsFailed', '?')}")
            if status != "COMPLETE":
                raise SystemExit(f"Ingestion finished with status {status}")
            break


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync the KelanaAI knowledge base to S3")
    parser.add_argument("--dry-run", action="store_true", help="list files, upload nothing")
    parser.add_argument("--no-wait", action="store_true", help="do not poll the ingestion job")
    args = parser.parse_args()

    if args.dry_run:
        upload(dry_run=True)
        return 0

    if not BUCKET:
        print(
            "KB_S3_BUCKET is not set in backend/.env.\n"
            "Set it to the bucket your Bedrock Knowledge Base reads from, then rerun.\n"
            "Use --dry-run to see which files would be uploaded."
        )
        return 1

    try:
        upload(dry_run=False)
        ingest(wait=not args.no_wait)
    except NoCredentialsError:
        print(
            "\nNo AWS credentials found. Configure them with `aws configure`, an SSO "
            "profile, or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in backend/.env."
        )
        return 1
    except (ClientError, BotoCoreError) as error:
        print(f"\nAWS call failed: {error}")
        return 1

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
