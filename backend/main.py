"""
KelanaAI - Trip Summary Generator
Tugas Sesi 2: Making KelanaAI Smarter

Presentation layer (I/O). Business logic lives in services/trip_service.py.
"""

from services.trip_service import (
    get_trip_category,
    get_travel_season,
    calculate_daily_budget,
    get_recommended_places,
)


def get_trip_input():
    """Ask the user for trip details and return them as the right data types."""
    destination = input("Destination : ")
    days = int(input("Days : "))
    budget = float(input("Budget : "))
    currency = input("Currency : ")
    travel_month = input("Travel Month : ")

    return destination, days, budget, currency, travel_month


def print_trip_summary(destination, days, budget, currency, travel_month):
    """Print a structured trip summary, including category, daily budget,
    season, and recommended places."""
    category = get_trip_category(budget)
    daily_budget = calculate_daily_budget(budget, days)
    season = get_travel_season(travel_month)
    recommended_places = get_recommended_places()

    print("==================================")
    print("KelanaAI")
    print("==================================")
    print(f"Destination     : {destination}")
    print(f"Days        : {days}")
    print(f"Budget       : {budget:.0f} {currency}")
    print(f"Category      : {category}")
    print(f"Daily Budget    : {daily_budget:.0f} {currency}/Day")
    print(f"Travel Month: {travel_month}")
    print(f"Season : {season}")
    print()
    print("Recommended Places")
    for place in recommended_places:
        print(f"- {place}")


def main():
    destination, days, budget, currency, travel_month = get_trip_input()
    print_trip_summary(destination, days, budget, currency, travel_month)


if __name__ == "__main__":
    main()
