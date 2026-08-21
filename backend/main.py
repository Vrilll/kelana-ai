"""
KelanaAI - FastAPI Web Service
Session 5: Teaching KelanaAI to Think with AI (Amazon Bedrock Integration)

Full CRUD: Create, Read (list + by id), Update, Delete,
plus an AI-generated itinerary endpoint backed by Amazon Bedrock.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from database import SessionLocal, init_db
from models.trip import Trip
from services.bedrock_service import generate_itinerary
from services.trip_service import calculate_daily_budget, get_trip_category

app = FastAPI()

# create tables on startup if they don't exist yet
init_db()


class TripRequest(BaseModel):
    destination: str
    days: int
    budget: float


class TripUpdateRequest(BaseModel):
    budget: float


# --- Part 1: Welcome endpoint ---
@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}


# --- Part 2: Health check ---
@app.get("/health")
def health():
    return {"status": "OK"}


# --- Create: reuse Session 2 business logic + persist to PostgreSQL ---
@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category = get_trip_category(request.budget)

    trip = Trip(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        category=category,
        daily_budget=daily_budget,
    )

    db = SessionLocal()
    db.add(trip)
    db.commit()
    db.refresh(trip)
    db.close()

    return trip


# --- Read: list all trips ---
@app.get("/api/v1/trips")
def list_trips():
    db = SessionLocal()
    trips = db.query(Trip).all()
    db.close()
    return trips


# --- Read: get one trip by id ---
@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    db.close()

    if trip is None:
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    return trip


# --- Update: PUT /api/v1/trips/{id} (Homework) ---
@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, request: TripUpdateRequest):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    # recalculate category and daily_budget based on the new budget
    trip.budget = request.budget
    trip.category = get_trip_category(request.budget)
    trip.daily_budget = calculate_daily_budget(request.budget, trip.days)

    db.commit()
    db.refresh(trip)
    db.close()

    return trip


# --- Delete: DELETE /api/v1/trips/{id} (Homework) ---
@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    db.delete(trip)
    db.commit()
    db.close()

    return {"message": f"Trip with id {trip_id} deleted"}


# --- Generate: POST /api/v1/trips/{id}/generate (Session 5) ---
@app.post("/api/v1/trips/{trip_id}/generate")
def generate_trip_recommendation(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    try:
        itinerary = generate_itinerary(trip)
    except Exception as error:
        db.close()
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate itinerary from Amazon Bedrock: {error}",
        )

    # persist the enriched AI itinerary into PostgreSQL
    trip.ai_recommendation = itinerary

    db.commit()
    db.refresh(trip)
    db.close()

    return trip


# --- Session 3 homework: static recommendation lists ---
@app.get("/api/v1/recommendations")
def get_recommendations():
    return ["Tokyo Tower", "Mount Fuji", "Shibuya"]


@app.get("/api/v1/transportations")
def get_transportations():
    return ["Bus", "Train", "Flight"]
