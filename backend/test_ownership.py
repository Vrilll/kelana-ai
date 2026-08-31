"""
KelanaAI - Ownership and authentication checks (Session 8)

Runs the real FastAPI app against a throwaway SQLite database and asserts that
one user can never read, change or delete another user's trip.

    cd backend
    pip install httpx          # only needed for this file
    python test_ownership.py
"""

import os
import pathlib
import sys
import tempfile

BACKEND_DIR = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

# Point at a scratch database *before* importing the app, so the real
# DATABASE_URL in .env is never touched.
DB_PATH = pathlib.Path(tempfile.gettempdir()) / "kelana_ownership_test.db"
if DB_PATH.exists():
    DB_PATH.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
os.environ.setdefault("JWT_SECRET", "ownership-test-secret")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from database import SessionLocal  # noqa: E402
from models.trip import Trip  # noqa: E402

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


def register(email, password, full_name=None):
    body = {"email": email, "password": password}
    if full_name:
        body["full_name"] = full_name
    return client.post("/api/v1/auth/register", json=body)


print("\n== register and login ==")
response = register("Alice@Example.com", "alice-password", "Alice")
check("register returns 201", response.status_code, 201)
alice = response.json()["access_token"]
check("email is normalised", response.json()["user"]["email"], "alice@example.com")

bob = register("bob@example.com", "bob-password").json()["access_token"]

check("duplicate email is rejected", register("alice@example.com", "x" * 10).status_code, 409)
check("short password is rejected", register("new@example.com", "short").status_code, 422)
check("invalid email is rejected", register("not-an-email", "longenough").status_code, 422)

check(
    "correct password logs in",
    client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "alice-password"},
    ).status_code,
    200,
)

wrong = client.post(
    "/api/v1/auth/login", json={"email": "alice@example.com", "password": "nope"}
)
unknown = client.post(
    "/api/v1/auth/login", json={"email": "ghost@example.com", "password": "nope"}
)
check("wrong password is rejected", wrong.status_code, 401)
check("unknown email is rejected", unknown.status_code, 401)
check(
    "both failures give the same message, so accounts cannot be enumerated",
    wrong.json()["detail"],
    unknown.json()["detail"],
)


print("\n== every trip endpoint needs a token ==")
for method, path in [
    ("get", "/api/v1/trips"),
    ("post", "/api/v1/trips"),
    ("get", "/api/v1/trips/1"),
    ("put", "/api/v1/trips/1"),
    ("delete", "/api/v1/trips/1"),
    ("post", "/api/v1/trips/1/generate"),
]:
    kwargs = {"json": {}} if method in ("post", "put") else {}
    check(
        f"{method.upper()} {path} without a token",
        getattr(client, method)(path, **kwargs).status_code,
        401,
    )

check(
    "a malformed token",
    client.get("/api/v1/trips", headers={"Authorization": "Bearer nonsense"}).status_code,
    401,
)


print("\n== trips are scoped to their owner ==")
alice_trip = client.post(
    "/api/v1/trips",
    json={"destination": "Kyoto, Japan", "days": 5, "budget": 1500, "travel_style": "Couple"},
    headers=auth(alice),
).json()["id"]

bob_trip = client.post(
    "/api/v1/trips",
    json={"destination": "Bali, Indonesia", "days": 7, "budget": 900},
    headers=auth(bob),
).json()["id"]

check(
    "alice's list holds only her trip",
    [t["id"] for t in client.get("/api/v1/trips", headers=auth(alice)).json()],
    [alice_trip],
)
check(
    "bob's list holds only his trip",
    [t["id"] for t in client.get("/api/v1/trips", headers=auth(bob)).json()],
    [bob_trip],
)


print("\n== touching someone else's trip is 403 ==")
check(
    "GET",
    client.get(f"/api/v1/trips/{alice_trip}", headers=auth(bob)).status_code,
    403,
)
check(
    "PUT",
    client.put(
        f"/api/v1/trips/{alice_trip}", json={"budget": 99999}, headers=auth(bob)
    ).status_code,
    403,
)
check(
    "DELETE",
    client.delete(f"/api/v1/trips/{alice_trip}", headers=auth(bob)).status_code,
    403,
)
check(
    "POST generate",
    client.post(f"/api/v1/trips/{alice_trip}/generate", headers=auth(bob)).status_code,
    403,
)
check(
    "the trip survived the attempts",
    client.get(f"/api/v1/trips/{alice_trip}", headers=auth(alice)).status_code,
    200,
)
check(
    "a trip that does not exist is 404, not 403",
    client.get("/api/v1/trips/9999", headers=auth(alice)).status_code,
    404,
)


print("\n== the owner is still in charge ==")
updated = client.put(
    f"/api/v1/trips/{alice_trip}", json={"budget": 4000}, headers=auth(alice)
)
check("owner can update", updated.status_code, 200)
check("category is recalculated", updated.json()["category"], "Luxury")
check("daily budget is recalculated", updated.json()["daily_budget"], 800)

check(
    "owner can delete",
    client.delete(f"/api/v1/trips/{alice_trip}", headers=auth(alice)).status_code,
    200,
)
check(
    "the deleted trip is gone",
    client.get(f"/api/v1/trips/{alice_trip}", headers=auth(alice)).status_code,
    404,
)


print("\n== trips with no owner belong to nobody ==")
db = SessionLocal()
legacy = Trip(
    destination="Trip from before accounts existed",
    days=3,
    budget=600,
    category="Backpacker",
    daily_budget=200,
    user_id=None,
)
db.add(legacy)
db.commit()
db.refresh(legacy)
legacy_id = legacy.id
db.close()

check(
    "it is hidden from the list",
    legacy_id in [t["id"] for t in client.get("/api/v1/trips", headers=auth(alice)).json()],
    False,
)
check(
    "it cannot be read",
    client.get(f"/api/v1/trips/{legacy_id}", headers=auth(alice)).status_code,
    403,
)
check(
    "it cannot be deleted",
    client.delete(f"/api/v1/trips/{legacy_id}", headers=auth(alice)).status_code,
    403,
)


print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
