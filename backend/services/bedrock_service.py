"""
KelanaAI - Bedrock Service
Session 5: Teaching KelanaAI to Think with AI (Amazon Bedrock Integration)

Business logic layer for the AI-generated travel itinerary.
"""

import json
import os

import boto3
from dotenv import load_dotenv

load_dotenv()

# AWS settings come from .env - never hardcode credentials
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0"
)


def get_bedrock_client():
    """Create a Bedrock Runtime client for the configured region."""
    return boto3.client("bedrock-runtime", region_name=AWS_REGION)


def build_itinerary_prompt(destination, days, budget, category, daily_budget):
    """
    Build the enriched prompt sent to Amazon Bedrock.

    The prompt asks for a structured daily plan where every single day has
    three clearly separated blocks:
      - Morning   : 2-3 specific activities
      - Afternoon : cultural sites and local experiences
      - Evening   : dinner spots and nightlife
    """
    return f"""You are an expert local travel planner for {destination}.

Create a detailed day-by-day travel itinerary using these trip details:
- Destination: {destination}
- Duration: {days} days
- Total budget: {budget} ({category} traveller)
- Daily budget: roughly {daily_budget} per day

Follow these rules strictly for EVERY day of the trip:

1. Morning:
   - List 2 to 3 specific activities (never just one).
   - Name real, concrete places rather than generic descriptions.
   - Mention the best time to arrive to avoid crowds where it matters.

2. Afternoon:
   - Include at least one cultural site (temple, museum, historic district,
     gallery, heritage landmark).
   - Include at least one hands-on local experience (workshop, market visit,
     cooking class, tea ceremony, neighbourhood walk).

3. Evening:
   - Recommend a specific dinner spot and the local dish worth ordering there.
   - Suggest a nightlife or evening entertainment option (night market,
     live music venue, izakaya street, rooftop bar, night view spot).

Keep every suggestion realistic for a {category} budget of about
{daily_budget} per day.

Format the answer exactly like this, repeating the block for each day:

Day 1: <short theme for the day>

Morning:
- <activity>
- <activity>

Afternoon:
- <cultural site>
- <local experience>

Evening:
- <dinner spot and dish>
- <nightlife or entertainment>

Return only the itinerary text, with no preamble and no closing remarks."""


def generate_itinerary(trip):
    """
    Ask Amazon Bedrock for an enriched daily itinerary for the given trip.

    Returns the generated itinerary as plain text.
    """
    prompt = build_itinerary_prompt(
        destination=trip.destination,
        days=trip.days,
        budget=trip.budget,
        category=trip.category,
        daily_budget=trip.daily_budget,
    )

    client = get_bedrock_client()

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "temperature": 0.7,
            "messages": [{"role": "user", "content": prompt}],
        }
    )

    response = client.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=body,
    )

    payload = json.loads(response["body"].read())

    # Anthropic models on Bedrock return a list of content blocks
    return "".join(
        block.get("text", "") for block in payload.get("content", [])
    ).strip()
