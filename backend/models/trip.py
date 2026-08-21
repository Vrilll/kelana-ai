"""
KelanaAI - Trip Model
SQLAlchemy ORM model for the "trips" table.
"""

from sqlalchemy import Column, Float, Integer, String

from database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True)
    destination = Column(String, nullable=False)
    days = Column(Integer, nullable=False)
    budget = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    daily_budget = Column(Float, nullable=False)
