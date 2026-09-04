"""
KelanaAI - FastAPI Web Service
Session 10: Teaching KelanaAI to Remember Conversations

Every trip and conversation endpoint requires a bearer token and is scoped to
the account that owns the resource: you only ever see your own data, and
touching somebody else's returns 403.
"""

import os
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models.conversation import Conversation, Message
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
from services import kb_service
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


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    # "rag" answers from the knowledge base; "base" deliberately skips it, which
    # is what the Session 9 comparison uses.
    mode: Literal["rag", "base"] = "rag"


class SourceResponse(BaseModel):
    source: str
    score: float
    excerpt: str


class AskResponse(BaseModel):
    mode: str
    backend: str
    answer: str
    sources: list[SourceResponse]


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


def _assume_utc(value: datetime) -> datetime:
    """
    Attach a UTC tzinfo to a naive datetime; leave an already-aware one alone.

    Every timestamp in this app is written with datetime.now(timezone.utc),
    but SQLite (unlike PostgreSQL's TIMESTAMPTZ) does not store a timezone -
    SQLAlchemy reads the column back as a naive datetime regardless of what
    went in. Serialized as-is, that naive value has no "Z" or offset, and a
    browser reading a timezone-less timestamp treats it as *local* time, not
    UTC - a client seven hours ahead of UTC would show a message sent seconds
    ago as "7 hours ago". Stamping UTC back on before the response leaves this
    app is correct on every backend: a value that already carries a timezone
    (Postgres) passes through unchanged, since it is not naive.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    created_at: datetime

    _normalize_created_at = field_validator("created_at", mode="before")(_assume_utc)


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # None until the first message exists - the frontend shows a
    # "New conversation" placeholder for that case.
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    _normalize_timestamps = field_validator("created_at", "updated_at", mode="before")(
        _assume_utc
    )


class ConversationDetail(ConversationSummary):
    messages: list[MessageResponse] = []


class SendMessageResponse(BaseModel):
    conversation: ConversationSummary
    user_message: MessageResponse
    assistant_message: MessageResponse


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


def get_owned_conversation(
    conversation_id: int, db: Session, user: User
) -> Conversation:
    """Fetch a conversation and enforce ownership. 404 vs 403, same rule as trips."""
    conversation = (
        db.query(Conversation).filter(Conversation.id == conversation_id).first()
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found",
        )

    if conversation.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This conversation belongs to another user",
        )

    return conversation


def _make_title(first_message: str) -> str:
    """
    Derive a conversation title from its first message.

    A dedicated model call to summarise a title was considered and dropped: it
    doubles the latency and cost of starting every conversation for a title
    that is usually obvious from the first sentence anyway. Truncating is
    instant and free, and the title only has to be recognisable in a list of
    conversations, not a perfect summary.
    """
    cleaned = " ".join(first_message.split())
    if len(cleaned) <= 60:
        return cleaned
    return cleaned[:57].rstrip() + "..."


def _append_message_and_reply(
    conversation: Conversation, content: str, db: Session
) -> tuple[Message, Message]:
    """
    Store the traveller's message, ask Bedrock for a reply, store that too.

    The user's message is committed before the model is called and is not
    rolled back if that call fails, so a Bedrock error never costs the
    traveller what they just typed - they see it was sent and can try again,
    rather than losing it to a request that happened to fail.
    """
    user_message = Message(conversation_id=conversation.id, role="user", content=content)
    db.add(user_message)

    if conversation.title is None:
        conversation.title = _make_title(content)

    db.commit()
    db.refresh(user_message)

    history = [
        {"role": message.role, "content": message.content}
        for message in db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.id)
        .all()
    ]

    try:
        result = kb_service.answer_conversation(history)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to answer from Amazon Bedrock: {error}",
        )

    assistant_message = Message(
        conversation_id=conversation.id, role="assistant", content=result["answer"]
    )
    db.add(assistant_message)
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(assistant_message)
    db.refresh(conversation)

    return user_message, assistant_message


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


# --- Ask: POST /api/v1/ask (Session 9) ---
@app.post("/api/v1/ask", response_model=AskResponse)
def ask(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
):
    """Answer a travel question from the KelanaAI knowledge base."""
    try:
        if request.mode == "rag":
            result = kb_service.answer_with_rag(request.question)
        else:
            result = kb_service.answer_with_base_model(request.question)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to answer from Amazon Bedrock: {error}",
        )

    return AskResponse(**result)


# --- Retrieval only, no model call: useful for debugging the knowledge base ---
@app.get("/api/v1/kb/search", response_model=list[SourceResponse])
def kb_search(
    q: str,
    current_user: User = Depends(get_current_user),
):
    passages = kb_service.retrieve(q)
    return [
        SourceResponse(source=p.source, score=p.score, excerpt=p.text[:280])
        for p in passages
    ]


# --- Conversations: teaching KelanaAI to remember (Session 10) -------------
#
# Bedrock has no memory of its own. These endpoints are the memory: every
# turn is stored in "messages", and _append_message_and_reply() reassembles
# the full history for a conversation into the model's context on every call.


# --- Create: start a new, empty conversation ---
@app.post("/api/v1/conversations", response_model=ConversationDetail, status_code=201)
def create_conversation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = Conversation(user_id=current_user.id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return ConversationDetail.model_validate(conversation)


# --- Read: list the signed-in user's conversations, most recently active first ---
@app.get("/api/v1/conversations", response_model=list[ConversationSummary])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [ConversationSummary.model_validate(c) for c in conversations]


# --- Read: one conversation with its full message history ---
@app.get("/api/v1/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = get_owned_conversation(conversation_id, db, current_user)
    return ConversationDetail.model_validate(conversation)


# --- Send a message: store it, reassemble history, ask Bedrock, store the reply ---
@app.post(
    "/api/v1/conversations/{conversation_id}/messages",
    response_model=SendMessageResponse,
)
def send_message(
    conversation_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = get_owned_conversation(conversation_id, db, current_user)
    user_message, assistant_message = _append_message_and_reply(
        conversation, request.content, db
    )

    return SendMessageResponse(
        conversation=ConversationSummary.model_validate(conversation),
        user_message=MessageResponse.model_validate(user_message),
        assistant_message=MessageResponse.model_validate(assistant_message),
    )


# --- Delete: DELETE /api/v1/conversations/{id} ---
@app.delete("/api/v1/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = get_owned_conversation(conversation_id, db, current_user)

    db.delete(conversation)
    db.commit()

    return {"message": f"Conversation with id {conversation_id} deleted"}


# --- Session 3 homework: static recommendation lists ---
@app.get("/api/v1/recommendations")
def get_recommendations():
    return ["Tokyo Tower", "Mount Fuji", "Shibuya"]


@app.get("/api/v1/transportations")
def get_transportations():
    return ["Bus", "Train", "Flight"]
