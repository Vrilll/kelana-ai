"""
KelanaAI - FastAPI Web Service
Session 3: Teaching KelanaAI to Communicate (REST API)
Homework: /api/v1/recommendations and /api/v1/transportations
"""

from fastapi import FastAPI
from pydantic import BaseModel

from services.trip_service import (
    calculate_daily_budget,
    get_trip_category,
)

app = FastAPI()


class TripRequest(BaseModel):
    destination: str
    days: int
    budget: float


# --- Part 1: Welcome endpoint ---
@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}


# --- Part 2: Health check ---
@app.get("/health")
def health():
    return {"status": "OK"}


# --- Part 3: Reuse Session 2 business logic ---
@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category = get_trip_category(request.budget)

    return {
        "destination": request.destination,
        "days": request.days,
        "budget": request.budget,
        "daily_budget": daily_budget,
        "category": category,
    }


# --- Homework: recommendations list endpoint ---
@app.get("/api/v1/recommendations")
def get_recommendations():
    return ["Tokyo Tower", "Mount Fuji", "Shibuya"]


# --- Homework: transportations list endpoint ---
@app.get("/api/v1/transportations")
def get_transportations():
    return ["Bus", "Train", "Flight"]
