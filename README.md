# KelanaAI

AI Travel Planner built with Python, Next.js & Amazon Bedrock.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
- [API Endpoints](#api-endpoints)
- [Input](#input)
- [Example Output](#example-output)
- [Roadmap](#roadmap)

## Overview

### Session 1 — Trip Summary Generator (Console App)

A simple console application that collects trip details from the user and prints a formatted summary.

### Session 2 — Recommendation Engine (Layered Architecture)

The app is now split into a layered architecture:

- **`backend/services/trip_service.py`** — business logic layer. Contains the trip category, travel season, daily budget calculation, and recommended places logic.
- **`backend/main.py`** — presentation layer. Handles user input/output only and calls into `trip_service` for all business logic.

### Session 3 — Teaching KelanaAI to Communicate (REST API)

`backend/main.py` is now a **FastAPI** web service instead of a console app. It reuses the Session 2 business logic in `trip_service.py` and exposes it over HTTP.

### Session 4 — Teaching KelanaAI to Remember (PostgreSQL Persistence)

The app is now **stateful**: trip data is persisted to a **PostgreSQL** database using **SQLAlchemy** as the ORM, instead of only living in memory for the duration of a request.

- **`backend/database.py`** — database connection layer. Creates the SQLAlchemy engine and session factory from the `DATABASE_URL` in `.env`, and initializes tables on startup.
- **`backend/models/trip.py`** — SQLAlchemy ORM model for the `trips` table.
- **`backend/main.py`** — full CRUD (Create, Read, Update, Delete) for trips, backed by PostgreSQL. `PUT` recalculates `category` and `daily_budget` from the new budget before saving, and both `PUT` and `DELETE` return `404` when the trip id does not exist.

## Project Structure

```
kelana-ai/
├── README.md
├── backend/
│ ├── main.py
│ ├── database.py
│ ├── requirements.txt
│ ├── .env.example
│ ├── models/
│ │ ├── __init__.py
│ │ └── trip.py
│ └── services/
│ ├── __init__.py
│ └── trip_service.py
└── frontend/
└── .gitkeep
```

## How to Run

1. Copy `.env.example` to `.env` and set your PostgreSQL connection string:

   ```
   DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost/kelana_ai
   ```

2. Install dependencies and start the server:

   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

The API will be available at `http://127.0.0.1:8000`, and interactive Swagger docs at `http://127.0.0.1:8000/docs`.

## API Endpoints

| Method | Endpoint                   | Description                                              |
|--------|-----------------------------|-----------------------------------------------------------|
| GET    | `/`                         | Welcome message                                            |
| GET    | `/health`                   | Health check                                                |
| POST   | `/api/v1/trips`             | Create a trip and get category + daily budget              |
| GET    | `/api/v1/trips`             | List all saved trips                                       |
| GET    | `/api/v1/trips/{id}`        | Get a single trip by id                                    |
| PUT    | `/api/v1/trips/{id}`        | Update a trip's budget (recalculates category + daily budget) |
| DELETE | `/api/v1/trips/{id}`        | Delete a trip by id                                         |
| GET    | `/api/v1/recommendations`   | List of recommended places                                  |
| GET    | `/api/v1/transportations`   | List of available transportation options                    |

## Input

`POST /api/v1/trips` expects a JSON body with:

| Field | Type | Description |
|----------------|---------|-------------------------------|
| `destination` | string | Destination name |
| `days` | integer | Number of travel days |
| `budget` | float | Total trip budget |

`PUT /api/v1/trips/{id}` expects a JSON body with:

| Field | Type | Description |
|----------------|---------|-------------------------------|
| `budget` | float | New total trip budget |

## Example Output

```json
{
  "id": 1,
  "destination": "Japan",
  "days": 5,
  "budget": 1500,
  "daily_budget": 300,
  "category": "Standard"
}
```

## Roadmap

- [x] REST API with FastAPI
- [x] PostgreSQL persistence with SQLAlchemy
- [ ] Frontend (Next.js) integration
- [ ] Amazon Bedrock-powered recommendations
