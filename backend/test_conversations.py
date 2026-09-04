"""
KelanaAI - Conversational memory checks (Session 10)

Runs the real FastAPI app against a throwaway SQLite database and asserts:

  - every conversation endpoint requires a token and enforces ownership,
    the same way test_ownership.py checks trips
  - a stored conversation is reassembled into the exact history sent to the
    model - that reassembly *is* the "memory" this session is about
  - a Bedrock failure keeps the traveller's own message instead of losing it

services.kb_service.answer_conversation is monkeypatched to a fake that
records what it was called with, so this suite needs no AWS credentials and
no network access - the same convention test_ownership.py uses for
/trips/{id}/generate, which it also never calls successfully.

    cd backend
    python test_conversations.py
"""

import os
import pathlib
import sys
import tempfile

BACKEND_DIR = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

DB_PATH = pathlib.Path(tempfile.gettempdir()) / "kelana_conversations_test.db"
if DB_PATH.exists():
    DB_PATH.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
os.environ.setdefault("JWT_SECRET", "conversations-test-secret")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from services import kb_service  # noqa: E402

# --- fake Bedrock, so this suite runs with no AWS account -------------------

calls: list[list[dict]] = []
next_error: Exception | None = None


def fake_answer_conversation(history, **kwargs):
    calls.append([dict(turn) for turn in history])

    if next_error is not None:
        raise next_error

    latest = history[-1]["content"]
    return {
        "answer": f"(fake reply #{len(calls)} to: {latest})",
        "backend": "fake",
        "sources": [],
    }


kb_service.answer_conversation = fake_answer_conversation

client = TestClient(main.app)

passed = 0
failed = 0


def check(label, actual, expected):
    global passed, failed
    if actual == expected:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        print(f"  FAIL  {label}: got {actual!r}, expected {expected!r}")


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def register(email, password):
    return client.post(
        "/api/v1/auth/register", json={"email": email, "password": password}
    ).json()["access_token"]


alice = register("alice@example.com", "alice-password")
bob = register("bob@example.com", "bob-password")


print("\n== every conversation endpoint needs a token ==")
for method, path, body in [
    ("post", "/api/v1/conversations", {}),
    ("get", "/api/v1/conversations", None),
    ("get", "/api/v1/conversations/1", None),
    ("post", "/api/v1/conversations/1/messages", {"content": "hi"}),
    ("delete", "/api/v1/conversations/1", None),
]:
    kwargs = {"json": body} if body is not None else {}
    check(
        f"{method.upper()} {path} without a token",
        getattr(client, method)(path, **kwargs).status_code,
        401,
    )


print("\n== creating a conversation ==")
response = client.post("/api/v1/conversations", headers=auth(alice))
check("create returns 201", response.status_code, 201)
created = response.json()
check("a fresh conversation has no title", created["title"], None)
check("a fresh conversation has no messages", created["messages"], [])
alice_conversation_id = created["id"]


print("\n== sending the first message ==")
calls.clear()
response = client.post(
    f"/api/v1/conversations/{alice_conversation_id}/messages",
    json={"content": "What happens if a supplier cancels my flight?"},
    headers=auth(alice),
)
check("send returns 200", response.status_code, 200)
body = response.json()

check(
    "title is derived from the first message",
    body["conversation"]["title"],
    "What happens if a supplier cancels my flight?",
)
check("user message role", body["user_message"]["role"], "user")
check("assistant message role", body["assistant_message"]["role"], "assistant")
check(
    "assistant message answers the question",
    "supplier cancels my flight" in body["assistant_message"]["content"],
    True,
)
check("exactly one model call was made", len(calls), 1)
check(
    "the model saw only the new user turn on a first message",
    calls[0],
    [{"role": "user", "content": "What happens if a supplier cancels my flight?"}],
)


print("\n== the second message replays the whole history ==")
calls.clear()
response = client.post(
    f"/api/v1/conversations/{alice_conversation_id}/messages",
    json={"content": "And what if I reject all three alternatives?"},
    headers=auth(alice),
)
check("send returns 200", response.status_code, 200)
check("exactly one model call was made", len(calls), 1)
check(
    "the model saw all four prior turns plus the new one, in order",
    [turn["role"] for turn in calls[0]],
    ["user", "assistant", "user"],
)
check(
    "the new user turn is last and unmodified",
    calls[0][-1],
    {"role": "user", "content": "And what if I reject all three alternatives?"},
)
check(
    "the first assistant reply is replayed verbatim as history for the next call",
    calls[0][1]["content"],
    body["assistant_message"]["content"],
)

# Fetch the conversation back and confirm all four messages persisted in order.
response = client.get(
    f"/api/v1/conversations/{alice_conversation_id}", headers=auth(alice)
)
fetched = response.json()
check("conversation now holds four messages", len(fetched["messages"]), 4)
check(
    "messages are stored oldest first",
    [m["role"] for m in fetched["messages"]],
    ["user", "assistant", "user", "assistant"],
)
check(
    "every message carries a timestamp",
    all(m["created_at"] for m in fetched["messages"]),
    True,
)
check(
    "title is not overwritten by later messages",
    fetched["title"],
    "What happens if a supplier cancels my flight?",
)


print("\n== a Bedrock failure keeps the traveller's message ==")
next_error = RuntimeError("model is unavailable")
response = client.post(
    f"/api/v1/conversations/{alice_conversation_id}/messages",
    json={"content": "are you there?"},
    headers=auth(alice),
)
check("a model failure returns 502", response.status_code, 502)
next_error = None

response = client.get(
    f"/api/v1/conversations/{alice_conversation_id}", headers=auth(alice)
)
after_failure = response.json()
check(
    "the failed turn's user message was still saved",
    after_failure["messages"][-1]["content"],
    "are you there?",
)
check(
    "no assistant reply was appended for the failed turn",
    after_failure["messages"][-1]["role"],
    "user",
)
check("message count reflects the saved user turn", len(after_failure["messages"]), 5)


print("\n== conversations are scoped to their owner ==")
bob_conversation_id = client.post(
    "/api/v1/conversations", headers=auth(bob)
).json()["id"]
client.post(
    f"/api/v1/conversations/{bob_conversation_id}/messages",
    json={"content": "Bali zones question"},
    headers=auth(bob),
)

alice_ids = [c["id"] for c in client.get("/api/v1/conversations", headers=auth(alice)).json()]
bob_ids = [c["id"] for c in client.get("/api/v1/conversations", headers=auth(bob)).json()]
check("alice's list holds only her conversation", alice_ids, [alice_conversation_id])
check("bob's list holds only his conversation", bob_ids, [bob_conversation_id])

check(
    "GET another user's conversation is 403",
    client.get(f"/api/v1/conversations/{alice_conversation_id}", headers=auth(bob)).status_code,
    403,
)
check(
    "POST a message to another user's conversation is 403",
    client.post(
        f"/api/v1/conversations/{alice_conversation_id}/messages",
        json={"content": "sneaking in"},
        headers=auth(bob),
    ).status_code,
    403,
)
check(
    "DELETE another user's conversation is 403",
    client.delete(f"/api/v1/conversations/{alice_conversation_id}", headers=auth(bob)).status_code,
    403,
)
check(
    "a nonexistent conversation is 404, not 403",
    client.get("/api/v1/conversations/999999", headers=auth(alice)).status_code,
    404,
)
check(
    "alice's conversation survived bob's attempts",
    client.get(f"/api/v1/conversations/{alice_conversation_id}", headers=auth(alice)).status_code,
    200,
)


print("\n== the owner can delete their own conversation ==")
check(
    "owner delete succeeds",
    client.delete(f"/api/v1/conversations/{bob_conversation_id}", headers=auth(bob)).status_code,
    200,
)
check(
    "the deleted conversation is gone",
    client.get(f"/api/v1/conversations/{bob_conversation_id}", headers=auth(bob)).status_code,
    404,
)


print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
