"""
KelanaAI - FastAPI Web Service
Session 8: Teaching KelanaAI to Know Its Users

Every trip endpoint now requires a bearer token and is scoped to the account
that owns the trip: you only ever see your own trips, and touching somebody
else's returns 403.
"""

import os
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models.trip import Trip
from models.user import User
from services.auth_service import (
    MAX_PASSWORD_BYTES,
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from services.bedrock_service import generate_itinerary
from services.trip_service import calculate_daily_budget, get_trip_category

app = FastAPI()

# The Next.js frontend runs on a different origin, so the browser needs CORS
# headers before it will let the page read any response from this API.
frontend_origins = os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# create tables on startup if they don't exist yet
init_db()


# --- Database session dependency -------------------------------------------


def get_db():
    """One session per request, always closed - even when the endpoint raises."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Request / response models ---------------------------------------------

# Who the trip is for. Literal gives a 422 instead of silently storing junk.
TravelStyle = Literal["Solo", "Couple", "Family"]


class TripRequest(BaseModel):
    destination: str = Field(min_length=1, max_length=120)
    days: int = Field(ge=1, le=365)
    budget: float = Field(gt=0)
    travel_style: TravelStyle = "Solo"


class TripUpdateRequest(BaseModel):
    budget: float = Field(gt=0)


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    destination: str
    days: int
    budget: float
    daily_budget: float
    category: str
    ai_recommendation: Optional[str] = None
    travel_style: Optional[str] = None
    user_id: Optional[int] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    # bcrypt ignores anything past 72 bytes, so cap it rather than truncate.
    password: str = Field(min_length=8, max_length=MAX_PASSWORD_BYTES)
    full_name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_BYTES)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Authentication --------------------------------------------------------

# auto_error=False so a missing header produces our own 401 with a clear
# message instead of FastAPI's bare 403.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the bearer token to a real user, or fail with 401."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or not credentials.credentials:
        raise unauthorized

    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidTokenError:
        raise unauthorized

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        # Token is validly signed but the account is gone.
        raise unauthorized

    return user


def get_owned_trip(trip_id: int, db: Session, user: User) -> Trip:
    """
    Fetch a trip and enforce ownership.

    404 when it does not exist, 403 when it belongs to somebody else. Trips
    with no owner (saved before accounts existed) are nobody's, so they are
    403 too rather than free for the taking.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with id {trip_id} not found",
        )

    if trip.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This trip belongs to another user",
        )

    return trip


# --- Part 1: Welcome endpoint ---
@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}


# --- Part 2: Health check ---
@app.get("/health")
def health():
    return {"status": "OK"}


# --- Auth: register ---
@app.post("/api/v1/auth/register", response_model=AuthResponse, status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()

    if db.query(User).filter(User.email == email).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=email,
        full_name=(request.full_name or "").strip() or None,
        password_hash=hash_password(request.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
    )


# --- Auth: login ---
@app.post("/api/v1/auth/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    # Same message and same work either way, so the response does not reveal
    # which emails have accounts.
    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserResponse.model_validate(user),
    )


# --- Auth: the signed-in account ---
@app.get("/api/v1/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


# --- Create: reuse Session 2 business logic + persist to PostgreSQL ---
@app.post("/api/v1/trips", response_model=TripResponse)
def create_trip(
    request: TripRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category = get_trip_category(request.budget)

    trip = Trip(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        category=category,
        daily_budget=daily_budget,
        travel_style=request.travel_style,
        user_id=current_user.id,
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)

    return TripResponse.model_validate(trip)


# --- Read: list the signed-in user's trips, newest first ---
@app.get("/api/v1/trips", response_model=list[TripResponse])
def list_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trips = (
        db.query(Trip)
        .filter(Trip.user_id == current_user.id)
        .order_by(Trip.id.desc())
        .all()
    )
    return [TripResponse.model_validate(trip) for trip in trips]


# --- Read: get one of your own trips by id ---
@app.get("/api/v1/trips/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TripResponse.model_validate(get_owned_trip(trip_id, db, current_user))


# --- Update: PUT /api/v1/trips/{id} ---
@app.put("/api/v1/trips/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: int,
    request: TripUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = get_owned_trip(trip_id, db, current_user)

    # recalculate category and daily_budget based on the new budget
    trip.budget = request.budget
    trip.category = get_trip_category(request.budget)
    trip.daily_budget = calculate_daily_budget(request.budget, trip.days)

    db.commit()
    db.refresh(trip)

    return TripResponse.model_validate(trip)


# --- Delete: DELETE /api/v1/trips/{id} ---
@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = get_owned_trip(trip_id, db, current_user)

    db.delete(trip)
    db.commit()

    return {"message": f"Trip with id {trip_id} deleted"}


# --- Generate: POST /api/v1/trips/{id}/generate (Session 5) ---
@app.post("/api/v1/trips/{trip_id}/generate", response_model=TripResponse)
def generate_trip_recommendation(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = get_owned_trip(trip_id, db, current_user)

    try:
        itinerary = generate_itinerary(trip)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate itinerary from Amazon Bedrock: {error}",
        )

    # persist the enriched AI itinerary into PostgreSQL
    trip.ai_recommendation = itinerary

    db.commit()
    db.refresh(trip)

    return TripResponse.model_validate(trip)


# --- Session 3 homework: static recommendation lists ---
@app.get("/api/v1/recommendations")
def get_recommendations():
    return ["Tokyo Tower", "Mount Fuji", "Shibuya"]


@app.get("/api/v1/transportations")
def get_transportations():
    return ["Bus", "Train", "Flight"]
