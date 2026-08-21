"""
KelanaAI - Database Connection
Session 4: Persistence Layer (PostgreSQL + SQLAlchemy)
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# load .env so os.getenv() can read it
load_dotenv()

# connection string from .env - never hardcode secrets
DATABASE_URL = os.getenv("DATABASE_URL")

# engine = the connection pool
engine = create_engine(DATABASE_URL)

# SessionLocal = a factory for DB sessions
SessionLocal = sessionmaker(bind=engine, autoflush=False)

# Base = all ORM models inherit from this
Base = declarative_base()


def init_db() -> None:
      """Create all SQLAlchemy tables for the configured database."""
      Base.metadata.create_all(bind=engine)
  
