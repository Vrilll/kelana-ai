"""
KelanaAI - Trip Service
Business logic layer for the Recommendation Engine (Session 2).
"""


def get_trip_category(budget):
    """Determine trip category based on budget."""
    if budget < 1000:
        return "Backpacker"
    elif budget <= 3000:
        return "Standard"
    else:
        return "Luxury"


def get_travel_season(month):
    """Determine travel season based on month."""
    if month == "December":
        return "Peak Season"
    elif month == "June":
        return "Holiday Season"
    else:
        return "Regular Season"


def calculate_daily_budget(budget, days):
    """Calculate the daily budget by dividing budget by number of days."""
    return budget / days


def get_recommended_places():
    """Return a list of recommended destination places."""
    return ["Tokyo Tower", "Shibuya", "Mount Fuji"]
