"""
KelanaAI - Knowledge Base Service
Session 9: Teaching KelanaAI to Read Knowledge (RAG)

Two ways to answer a question:

  answer_with_rag(question)         retrieve passages first, then answer
  answer_with_base_model(question)  ask the model with no context at all

Retrieval has two backends. When BEDROCK_KNOWLEDGE_BASE_ID is set the Bedrock
Knowledge Base is queried. Otherwise the same documents are searched locally
with BM25, so the pipeline is testable without any AWS account.
"""

import math
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Optional

import boto3
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# MODEL_ID is accepted as a fallback because that is the name the workshop
# .env files use.
BEDROCK_MODEL_ID = (
    os.getenv("BEDROCK_MODEL_ID")
    or os.getenv("MODEL_ID")
    or "anthropic.claude-3-5-sonnet-20240620-v1:0"
)

# Set this once the Bedrock Knowledge Base exists; leave it empty to use the
# local retriever over the same markdown files.
KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID", "").strip()

KB_DIR = Path(__file__).resolve().parent.parent / "knowledge_base"

DEFAULT_TOP_K = 6

# Roughly a paragraph or two - small enough to be specific, large enough to
# keep a table with its heading.
CHUNK_CHARS = 1200
CHUNK_OVERLAP = 150


@dataclass
class Passage:
    """One retrieved chunk of a knowledge base document."""

    text: str
    source: str
    score: float

    def cite(self) -> str:
        return f"[{self.source}]"


# --------------------------------------------------------------------------
# Local corpus: chunking
# --------------------------------------------------------------------------


def _strip_front_matter(text: str) -> tuple[str, dict]:
    """Pull the YAML-ish front matter off a document, if present."""
    if not text.startswith("---"):
        return text, {}

    end = text.find("\n---", 3)
    if end == -1:
        return text, {}

    raw = text[3:end]
    meta = {}
    for line in raw.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()

    return text[end + 4 :].lstrip("\n"), meta


def _split_sections(body: str) -> list[tuple[str, str]]:
    """Split markdown on ## headings, keeping each heading with its section."""
    parts: list[tuple[str, str]] = []
    current_heading = ""
    buffer: list[str] = []

    for line in body.splitlines():
        if line.startswith("## "):
            if buffer:
                parts.append((current_heading, "\n".join(buffer).strip()))
                buffer = []
            current_heading = line.lstrip("# ").strip()
        buffer.append(line)

    if buffer:
        parts.append((current_heading, "\n".join(buffer).strip()))

    return [(h, b) for h, b in parts if b]


# A markdown table row: | a | b | c |
_TABLE_ROW = re.compile(r"^\s*\|.*\|\s*$")

# Rows per table chunk. A 14-city table in one chunk buries any single city:
# BM25 divides by chunk length, so one mention of "Yogyakarta" among 14 cities
# scored below short sections that merely shared the topic words. Splitting the
# table lifts each row's term density.
TABLE_ROWS_PER_CHUNK = 5


def _split_table(text: str) -> Optional[list[str]]:
    """
    Split a section built around one long markdown table.

    Returns None when the section is not mostly a table, so the caller falls
    back to plain character windows. Each piece repeats the header row, so a
    retrieved chunk still says what its columns mean.
    """
    lines = text.splitlines()
    row_indexes = [i for i, line in enumerate(lines) if _TABLE_ROW.match(line)]

    # Needs a header, a separator and enough body rows to be worth splitting.
    if len(row_indexes) < TABLE_ROWS_PER_CHUNK + 4:
        return None

    start, end = row_indexes[0], row_indexes[-1]
    if row_indexes != list(range(start, end + 1)):
        return None  # not one contiguous table

    preamble = lines[:start]
    header = lines[start : start + 2]  # header + |---|---| separator
    body = lines[start + 2 : end + 1]
    trailer = lines[end + 1 :]

    chunks = []
    for offset in range(0, len(body), TABLE_ROWS_PER_CHUNK):
        slice_ = body[offset : offset + TABLE_ROWS_PER_CHUNK]
        piece = preamble + header + slice_
        if offset + TABLE_ROWS_PER_CHUNK >= len(body):
            piece += trailer
        chunks.append("\n".join(piece).strip())

    return [c for c in chunks if c]


def _window(text: str) -> list[str]:
    """Break an over-long section into overlapping windows."""
    table_chunks = _split_table(text)
    if table_chunks:
        return table_chunks

    if len(text) <= CHUNK_CHARS:
        return [text]

    windows = []
    start = 0
    while start < len(text):
        end = start + CHUNK_CHARS
        # Prefer to break at a line boundary so tables stay readable.
        if end < len(text):
            newline = text.rfind("\n", start + CHUNK_CHARS // 2, end)
            if newline != -1:
                end = newline
        windows.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)

    return [w for w in windows if w]


@lru_cache(maxsize=1)
def load_corpus() -> tuple[tuple[str, str], ...]:
    """
    Every chunk in the knowledge base as (source_label, text).

    Cached, because the documents do not change while the server is running.
    """
    chunks: list[tuple[str, str]] = []

    for path in sorted(KB_DIR.glob("*.md")):
        body, meta = _strip_front_matter(path.read_text(encoding="utf-8"))
        title = meta.get("title", path.stem)
        doc_id = meta.get("doc_id", path.stem)

        for heading, section in _split_sections(body):
            for window in _window(section):
                label = f"{doc_id} {title}"
                if heading:
                    label += f" > {heading}"
                chunks.append((label, window))

    return tuple(chunks)


# --------------------------------------------------------------------------
# Local retrieval: BM25
# --------------------------------------------------------------------------

_TOKEN = re.compile(r"[a-z0-9]+")

# Words too common in this corpus to carry a signal.
_STOPWORDS = frozenset(
    """a an and are as at be by for from has have how in is it its of on or that
    the to was what when where which who why with you your kelanaai trip trips
    traveller travellers travel""".split()
)


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOPWORDS]


@lru_cache(maxsize=1)
def _bm25_index():
    """Document frequencies and lengths for the local corpus."""
    corpus = load_corpus()
    tokenized = [_tokenize(text) for _, text in corpus]

    doc_freq: dict[str, int] = {}
    for tokens in tokenized:
        for token in set(tokens):
            doc_freq[token] = doc_freq.get(token, 0) + 1

    lengths = [len(t) for t in tokenized]
    avg_len = (sum(lengths) / len(lengths)) if lengths else 0.0

    return tokenized, doc_freq, lengths, avg_len


def _bm25_search(question: str, top_k: int) -> list[Passage]:
    """Classic BM25. No dependencies, and good enough for a few hundred chunks."""
    corpus = load_corpus()
    tokenized, doc_freq, lengths, avg_len = _bm25_index()

    if not corpus:
        return []

    k1, b = 1.5, 0.75
    total_docs = len(corpus)
    query = _tokenize(question)

    scored: list[tuple[float, int]] = []
    for index, tokens in enumerate(tokenized):
        if not tokens:
            continue

        counts: dict[str, int] = {}
        for token in tokens:
            counts[token] = counts.get(token, 0) + 1

        score = 0.0
        for term in query:
            freq = counts.get(term, 0)
            if freq == 0:
                continue
            idf = math.log(
                1 + (total_docs - doc_freq.get(term, 0) + 0.5) / (doc_freq.get(term, 0) + 0.5)
            )
            denominator = freq + k1 * (1 - b + b * lengths[index] / (avg_len or 1))
            score += idf * (freq * (k1 + 1)) / denominator

        if score > 0:
            scored.append((score, index))

    scored.sort(reverse=True)
    chosen = _guarantee_rare_terms(query, scored, tokenized, doc_freq, top_k)

    return [
        Passage(text=corpus[index][1], source=corpus[index][0], score=round(score, 3))
        for score, index in chosen
    ]


# A term this rare names something specific - a city, a policy id - rather than
# the topic. Above 2.0 means it appears in roughly the top sixth of chunks.
RARE_TERM_IDF = 2.0

# At most this many results are given up to the guarantee, so a question full of
# rare words cannot crowd out everything BM25 ranked highly.
MAX_GUARANTEED = 2


def _guarantee_rare_terms(query, scored, tokenized, doc_freq, top_k):
    """
    Make sure a chunk mentioning each rare query term survives into the result.

    Without this, asking about Yogyakarta returned six chunks about budgets in
    general and none containing the Yogyakarta row: BM25 divides by chunk
    length, so the long city table lost to short chunks that merely shared the
    topic words. When a question names something specific, the passage
    mentioning it has to reach the model.

    Pure numbers are skipped. "900" and "20" in "USD 900 for 20 days" are the
    traveller's own figures, not entities in the corpus, and guaranteeing a
    chunk because it happens to contain "20" only adds noise.
    """
    total_docs = len(tokenized)
    ranked = list(scored[:top_k])
    covered = {index for _, index in ranked}

    candidates = []
    for term in dict.fromkeys(query):
        if term.isdigit():
            continue

        freq = doc_freq.get(term, 0)
        if freq == 0:
            continue

        idf = math.log(1 + (total_docs - freq + 0.5) / (freq + 0.5))
        if idf < RARE_TERM_IDF:
            continue

        if any(term in tokenized[index] for index in covered):
            continue  # a selected passage already mentions it

        best = next(((s, i) for s, i in scored if term in tokenized[i]), None)
        if best is not None:
            candidates.append((idf, best))

    if not candidates:
        return ranked

    # Rarest first, and never promote the same chunk twice.
    candidates.sort(key=lambda pair: pair[0], reverse=True)

    promoted = []
    seen = set(covered)
    for _, (score, index) in candidates:
        if len(promoted) >= MAX_GUARANTEED:
            break
        if index in seen:
            continue
        promoted.append((score, index))
        seen.add(index)

    if not promoted:
        return ranked

    # Keep the strongest BM25 hits, then append the guaranteed ones. Promoted
    # entries are added last and never evicted by a later promotion, which the
    # first version of this got wrong.
    keep = ranked[: max(top_k - len(promoted), 1)]
    return sorted(keep + promoted, key=lambda pair: pair[0], reverse=True)


# --------------------------------------------------------------------------
# Bedrock Knowledge Base retrieval
# --------------------------------------------------------------------------


def _bedrock_kb_search(question: str, top_k: int) -> list[Passage]:
    """Query the managed Bedrock Knowledge Base."""
    client = boto3.client("bedrock-agent-runtime", region_name=AWS_REGION)

    response = client.retrieve(
        knowledgeBaseId=KNOWLEDGE_BASE_ID,
        retrievalQuery={"text": question},
        retrievalConfiguration={
            "vectorSearchConfiguration": {"numberOfResults": top_k}
        },
    )

    passages = []
    for result in response.get("retrievalResults", []):
        location = result.get("location", {})
        source = (
            location.get("s3Location", {}).get("uri")
            or location.get("type")
            or "knowledge base"
        )
        passages.append(
            Passage(
                text=result.get("content", {}).get("text", ""),
                source=source,
                score=round(result.get("score", 0.0), 3),
            )
        )

    return passages


def retrieve(question: str, top_k: int = DEFAULT_TOP_K) -> list[Passage]:
    """Find the passages most likely to answer the question."""
    if KNOWLEDGE_BASE_ID:
        return _bedrock_kb_search(question, top_k)
    return _bm25_search(question, top_k)


def retrieval_backend() -> str:
    """Which retriever is live - useful in responses and in the comparison report."""
    return "bedrock-knowledge-base" if KNOWLEDGE_BASE_ID else "local-bm25"


# --------------------------------------------------------------------------
# Generation
# --------------------------------------------------------------------------

GROUNDED_SYSTEM = """You are the KelanaAI travel assistant.

Answer ONLY from the context below. The context is KelanaAI's own internal
documentation, so it outranks anything you think you know.

If the context does not contain the answer, say exactly:
"I don't have that in the KelanaAI knowledge base."
Do not fill the gap from memory and do not guess.

Cite the source label in square brackets after each fact you use."""

BASE_SYSTEM = """You are a travel assistant. Answer the question from your own
knowledge. Be concrete and give specific figures where you can."""


def _converse(
    system: str,
    messages: list[dict],
    max_tokens: int = 900,
    temperature: float = 0.2,
) -> str:
    """
    Send a message list to the configured Bedrock model and return the text.

    Uses the Converse API rather than invoke_model, because Converse takes the
    same request shape for every provider. invoke_model needs a different body
    per family - Anthropic wants "anthropic_version" and a messages array,
    Amazon Nova wants something else - so a hardcoded body only works until the
    model id changes.

    `messages` carries the whole conversation so far, oldest first, each item
    shaped like {"role": "user" | "assistant", "content": [{"text": ...}]}.
    Bedrock itself keeps no memory between calls - this list *is* the memory,
    reassembled by the caller from whatever it persisted.
    """
    client = boto3.client("bedrock-runtime", region_name=AWS_REGION)

    response = client.converse(
        modelId=BEDROCK_MODEL_ID,
        system=[{"text": system}],
        messages=messages,
        inferenceConfig={"maxTokens": max_tokens, "temperature": temperature},
    )

    return "".join(
        block.get("text", "")
        for block in response["output"]["message"]["content"]
    ).strip()


def _invoke(
    system: str, question: str, max_tokens: int = 900, temperature: float = 0.2
) -> str:
    """Single-turn convenience wrapper around _converse for a one-off question."""
    return _converse(
        system,
        [{"role": "user", "content": [{"text": question}]}],
        max_tokens=max_tokens,
        temperature=temperature,
    )


def build_grounded_prompt(question: str, passages: list[Passage]) -> str:
    """The user turn for a grounded answer: context first, then the question."""
    if not passages:
        context = "(no passages retrieved)"
    else:
        context = "\n\n".join(
            f"--- source: {p.source} ---\n{p.text}" for p in passages
        )

    return f"Context:\n{context}\n\nQuestion: {question}"


def answer_with_rag(
    question: str, top_k: int = DEFAULT_TOP_K, temperature: float = 0.2
) -> dict:
    """Retrieve, then answer strictly from what was retrieved."""
    passages = retrieve(question, top_k)
    answer = _invoke(
        GROUNDED_SYSTEM,
        build_grounded_prompt(question, passages),
        temperature=temperature,
    )

    return {
        "mode": "rag",
        "backend": retrieval_backend(),
        "answer": answer,
        "sources": [
            {"source": p.source, "score": p.score, "excerpt": p.text[:280]}
            for p in passages
        ],
    }


def answer_with_base_model(question: str, temperature: float = 0.2) -> dict:
    """Answer the same question with no knowledge base at all."""
    return {
        "mode": "base-model",
        "backend": "none",
        "answer": _invoke(BASE_SYSTEM, question, temperature=temperature),
        "sources": [],
    }


# --------------------------------------------------------------------------
# Multi-turn conversation (Session 10)
# --------------------------------------------------------------------------

CONVERSATION_SYSTEM = """You are the KelanaAI travel assistant, chatting with a
traveller across multiple turns.

You will be given retrieved context for the traveller's latest message. That
context is KelanaAI's own internal documentation, so it outranks anything you
think you know: never state a KelanaAI-specific policy, price or rule that is
not in the context, and never guess at one. If the context does not cover
something the traveller asked about KelanaAI specifically, say so plainly.

You may still use your own general travel knowledge for things the context
does not claim to own - small talk, well-known facts about a place, generic
tips - since this is a conversation, not a compliance document.

Cite the source label in square brackets after each KelanaAI-specific fact.
Keep replies conversational and reasonably brief; this is a chat, not a report."""


def answer_conversation(
    history: list[dict[str, str]],
    top_k: int = DEFAULT_TOP_K,
    temperature: float = 0.3,
    max_tokens: int = 900,
) -> dict:
    """
    Continue a conversation and answer the latest turn.

    `history` is every turn so far, oldest first, each item
    {"role": "user" | "assistant", "content": "..."}, ending with the newest
    user message. The caller (main.py) is responsible for loading this from
    the database - this function has no memory of its own between calls.

    Retrieval runs only against the latest user message, not the whole
    conversation, so an unrelated fact from three turns ago cannot dilute the
    search for what is actually being asked right now.
    """
    if not history or history[-1]["role"] != "user":
        raise ValueError("history must be non-empty and end with a user message")

    passages = retrieve(history[-1]["content"], top_k)

    if passages:
        context = "\n\n".join(
            f"--- source: {p.source} ---\n{p.text}" for p in passages
        )
    else:
        context = "(no passages retrieved for this question)"

    system = f"{CONVERSATION_SYSTEM}\n\nContext for the latest question:\n{context}"
    messages = [
        {"role": turn["role"], "content": [{"text": turn["content"]}]}
        for turn in history
    ]

    answer = _converse(system, messages, max_tokens=max_tokens, temperature=temperature)

    return {
        "answer": answer,
        "backend": retrieval_backend(),
        "sources": [
            {"source": p.source, "score": p.score, "excerpt": p.text[:280]}
            for p in passages
        ],
    }
