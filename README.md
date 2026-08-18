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

## Project Structure

```
kelana-ai/
├── README.md
├── backend/
│ ├── main.py
│ ├── requirements.txt
│ └── services/
│ ├── __init__.py
│ └── trip_service.py
└── frontend/
└── .gitkeep
```

## How to Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|-----------------------------------|--------------------------------------------------|
| GET | `/` | Welcome message |
| GET | `/health` | Health check |
| POST | `/api/v1/trips` | Create a trip and get category + daily budget |
| GET | `/api/v1/recommendations` | List of recommended places |
| GET | `/api/v1/transportations` | List of available transportation options |

## Input

`POST /api/v1/trips` expects a JSON body with:

| Field | Type | Description |
|----------------|---------|-------------------------------|
| `destination` | string | Destination name |
| `days` | integer | Number of travel days |
| `budget` | float | Total trip budget |

## Example Output

```json
{
  "destination": "Japan",
  "days": 5,
  "budget": 1500,
  "daily_budget": 300,
  "category": "Standard"
}
```

## Roadmap

- [x] REST API with FastAPI
- [ ] Frontend (Next.js) integration
- [ ] Amazon Bedrock-powered recommendations
