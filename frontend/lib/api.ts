/**
 * Thin client for the KelanaAI FastAPI backend (see `backend/main.py`).
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export type Trip = {
  id: number;
  destination: string;
  days: number;
  budget: number;
  daily_budget: number;
  category: string;
  ai_recommendation: string | null;
};

export type TripRequest = {
  destination: string;
  days: number;
  budget: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new Error(
      `Could not reach the KelanaAI API at ${API_URL}. Start the backend with \`uvicorn main:app --reload\`.`,
    );
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail)
      .catch(() => null);
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function createTrip(payload: TripRequest) {
  return request<Trip>("/api/v1/trips", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateItinerary(tripId: number) {
  return request<Trip>(`/api/v1/trips/${tripId}/generate`, { method: "POST" });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
