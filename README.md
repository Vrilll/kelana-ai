# KelanaAI

AI Travel Planner built with Python, Next.js & Amazon Bedrock.

## Session 1 — Trip Summary Generator (Console App)
## Session 2 — Recommendation Engine (Layered Architecture)

Business logic now lives in `backend/services/trip_service.py`
(category, season, daily budget, recommended places). `backend/main.py`
handles only input/output (presentation layer).

### Project Structure

kelana-ai/
├── README.md
├── backend/
│ ├── main.py
│ └── services/
│ └── trip_service.py
└── frontend/
└── .gitkeep


### How to Run

```bash
cd backend
python main.py
```

> If `python` doesn't work on your system, try `python3 main.py`.

You will be prompted for:
- `destination` (string)
- `days` (integer)
- `budget` (float)
- `currency` (string)
- `travel_month` (string)

### Example Output
==================================
KelanaAI

Destination : Japan
Days : 5
Budget : 1500 USD
Category : Standard
Daily Budget : 300 USD/Day
Travel Month: December
Season : Peak Season

Recommended Places

Tokyo Tower
Shibuya
Mount Fuji
