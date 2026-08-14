# KelanaAI

AI Travel Planner built with Python, Next.js & Amazon Bedrock.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
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

## Project Structure

```
kelana-ai/
├── README.md
├── backend/
│   ├── main.py
│   └── services/
│       ├── __init__.py
│       └── trip_service.py
└── frontend/
    └── .gitkeep
```

## How to Run

```bash
cd backend
python main.py
```

> If `python` doesn't work on your system, try `python3 main.py`.

## Input

You will be prompted for:

| Field          | Type    | Description                  |
|----------------|---------|-------------------------------|
| `destination`  | string  | Destination name              |
| `days`         | integer | Number of travel days         |
| `budget`       | float   | Total trip budget             |
| `currency`     | string  | Currency of the budget        |
| `travel_month` | string  | Month of travel               |

## Example Output

```
==================================
KelanaAI
==================================
Destination : Japan
Days        : 5
Budget      : 1500 USD
Category    : Standard
Daily Budget: 300 USD/Day
Travel Month: December
Season      : Peak Season

Recommended Places
- Tokyo Tower
- Shibuya
- Mount Fuji
```

## Roadmap

- [ ] Frontend (Next.js) integration
- [ ] Amazon Bedrock-powered recommendations
