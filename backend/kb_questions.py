"""
KelanaAI - Knowledge Base evaluation questions
Session 9

Five questions that a base model cannot answer correctly, because every answer
depends on a fact that exists only inside KelanaAI's own documents. That is the
point of the comparison: if a base model could answer them from general
knowledge, they would not test retrieval.

`expected_facts` are the specific things a correct answer must contain. They are
used to score the two answers side by side.
"""

QUESTIONS = [
    {
        "id": "Q1",
        "question": (
            "A supplier cancelled my flight and every alternative KelanaAI "
            "offered costs more than my original booking. How much of that "
            "increase does KelanaAI absorb, and how many alternatives am I "
            "entitled to?"
        ),
        "why_rag_is_needed": (
            "The USD 150 absorption cap and the three-alternatives-within-4-hours "
            "rule are KelanaAI's own commercial policy. They exist nowhere in "
            "public training data."
        ),
        "expected_facts": [
            "KelanaAI absorbs up to USD 150 per traveller of the price increase",
            "three alternatives within 4 hours of the cancellation",
            "anything above the cap is quoted before booking, never charged automatically",
            "the service fee is refunded even outside the 24-hour window if all three are rejected",
        ],
        "source_docs": ["KB-POL-001", "KB-OPS-005"],
    },
    {
        "id": "Q2",
        "question": (
            "I have a USD 900 budget for 20 days in Yogyakarta. What trip "
            "category does KelanaAI assign, and does that trip clear the "
            "comfort floor?"
        ),
        "why_rag_is_needed": (
            "The category thresholds and the per-city Backpacker allowance are "
            "KelanaAI's internal planning figures. A base model will invent a "
            "number or answer with generic budget advice."
        ),
        "expected_facts": [
            "Backpacker, because the total budget is under USD 1,000",
            "the daily budget is USD 45 (900 divided by 20)",
            "the category comes from the total budget, not the daily budget",
            "Yogyakarta's Backpacker allowance is USD 25 per day",
            "USD 45 is above the floor, so the trip clears it",
        ],
        "source_docs": ["KB-BUD-002"],
    },
    {
        "id": "Q3",
        "question": (
            "What is the shortest Bali trip KelanaAI will sell if I want to see "
            "two zones, and how many zones can I fit into 5 days?"
        ),
        "why_rag_is_needed": (
            "The minimum-nights table and the two-zone rule are KelanaAI's own "
            "delivery standards, not public knowledge about Bali."
        ),
        "expected_facts": [
            "six nights minimum for a two-zone Bali trip",
            "no more than two zones in a 5-day trip",
            "treat any zone move as a lost half-day",
            "South to Ubud is 1.5 to 2.5 hours depending on traffic",
        ],
        "source_docs": ["KB-DEST-003"],
    },
    {
        "id": "Q4",
        "question": (
            "Should KelanaAI put a nationwide Japan rail pass in my itinerary, "
            "and what is the minimum number of nights for a multi-city Japan trip?"
        ),
        "why_rag_is_needed": (
            "KelanaAI reversed its default: price the journeys first, then "
            "compare a pass. A base model still assumes a rail pass is the "
            "obvious buy, which is the exact error this document corrects."
        ),
        "expected_facts": [
            "price the point-to-point journeys first, then compare a pass",
            "never include a nationwide pass without showing that comparison",
            "a pass breaks even at roughly two or more long-distance return journeys",
            "seven nights minimum for a multi-city Japan trip",
            "below that KelanaAI sells a single-city itinerary instead",
        ],
        "source_docs": ["KB-DEST-004"],
    },
    {
        "id": "Q5",
        "question": (
            "A traveller messages that there is an eruption alert near their "
            "hotel and they are frightened. What severity level is this, and "
            "what exactly is the assistant allowed to do?"
        ),
        "why_rag_is_needed": (
            "The severity ladder and the three-step S1 script are KelanaAI's "
            "internal escalation process. A base model will improvise plausible "
            "but wrong safety guidance."
        ),
        "expected_facts": [
            "S1, safety at risk, 15 minute response, 24/7",
            "tell the traveller to contact local emergency services first",
            "give the local emergency number and the KelanaAI 24/7 duty line",
            "stop planning and escalate to a human immediately",
            "never say a volcano is safe or predict when an airport reopens",
        ],
        "source_docs": ["KB-OPS-005"],
    },
]
