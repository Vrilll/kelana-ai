"""
KelanaAI - Auth Service
Session 8: password hashing and JSON Web Tokens.

Passwords are hashed with bcrypt and never stored or logged in plain text.
Tokens are signed with HS256 and carry only the user id plus an expiry.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

# bcrypt hashes at most 72 bytes and silently ignores anything past that, so
# the API rejects longer passwords instead of quietly truncating them.
MAX_PASSWORD_BYTES = 72

ALGORITHM = "HS256"

TOKEN_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "24"))

_DEV_SECRET = "kelana-ai-dev-secret-change-me"

JWT_SECRET = os.getenv("JWT_SECRET") or _DEV_SECRET

if JWT_SECRET == _DEV_SECRET:
    print(
        "WARNING: JWT_SECRET is not set, falling back to the shared development "
        "secret. Set JWT_SECRET in .env before deploying - anyone who knows the "
        "default can mint valid tokens for any account."
    )


class InvalidTokenError(Exception):
    """Raised when a token is missing, malformed, expired or badly signed."""


def hash_password(password: str) -> str:
    """Hash a plain password with a per-password bcrypt salt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Check a plain password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"), password_hash.encode("utf-8")
        )
    except ValueError:
        # Stored value is not a valid bcrypt hash - treat as a failed login
        # rather than crashing the endpoint.
        return False


def create_access_token(user_id: int) -> str:
    """Sign a token that identifies the user for TOKEN_TTL_HOURS."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    """Return the user id carried by a valid token, or raise InvalidTokenError."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError as error:
        raise InvalidTokenError(str(error)) from error

    subject = payload.get("sub")
    if subject is None:
        raise InvalidTokenError("Token is missing a subject")

    try:
        return int(subject)
    except (TypeError, ValueError) as error:
        raise InvalidTokenError("Token subject is not a user id") from error
