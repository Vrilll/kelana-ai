"""
KelanaAI - User Model
SQLAlchemy ORM model for the "users" table (Session 8).
"""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)

    # Only ever the bcrypt hash - the plain password is never stored.
    password_hash = Column(String, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
