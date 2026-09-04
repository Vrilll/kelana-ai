/**
 * Thin client for the KelanaAI FastAPI backend (see `backend/main.py`).
 *
 * Every trip endpoint requires a bearer token, so `request` attaches the stored
 * one automatically and clears it if the API says it is no longer valid.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const TOKEN_KEY = "kelana.token";
const USER_KEY = "kelana.user";

/** Fired when the API rejects our token, so the app can send you to /login. */
export const UNAUTHORIZED_EVENT = "kelana:unauthorized";

export type Trip = {
  id: number;
  destination: string;
  days: number;
  budget: number;
  daily_budget: number;
  category: string;
  ai_recommendation: string | null;
  /** null for trips saved before the travel_style column existed */
  travel_style: string | null;
  /** null for trips saved before accounts existed */
  user_id: number | null;
};

export type TripRequest = {
  destination: string;
  days: number;
  budget: number;
  travel_style: string;
};

export type User = {
  id: number;
  email: string;
  full_name: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: number;
  role: MessageRole;
  content: string;
  /** ISO 8601, always UTC - the backend stores DateTime(timezone=True) */
  created_at: string;
};

export type ConversationSummary = {
  id: number;
  /** null until the first message exists */
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[];
};

export type SendMessageResponse = {
  conversation: ConversationSummary;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// --- token storage ---------------------------------------------------------
// localStorage, wrapped because it throws in private-mode and sandboxed frames.

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: User) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Nothing persisted; the session simply ends with this tab.
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

// --- request plumbing ------------------------------------------------------

type RequestOptions = RequestInit & { auth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...init } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers: finalHeaders });
  } catch {
    throw new ApiError(
      0,
      `Could not reach the KelanaAI API at ${API_URL}. Start the backend with \`uvicorn main:app --reload\`.`,
    );
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail)
      .catch(() => null);

    if (response.status === 401 && auth) {
      // The token is missing, expired or signed with a different secret.
      clearSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      }
    }

    throw new ApiError(
      response.status,
      typeof detail === "string"
        ? detail
        : messageForStatus(response.status, detail),
    );
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

function messageForStatus(status: number, detail: unknown): string {
  // FastAPI validation errors arrive as a list of objects, not a string.
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }

  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "That belongs to another user.";
  if (status === 404) return "We could not find that.";

  return `Request failed with status ${status}`;
}

// --- auth ------------------------------------------------------------------

export function register(payload: {
  email: string;
  password: string;
  full_name?: string;
}) {
  return request<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
}

export function login(payload: { email: string; password: string }) {
  return request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
}

export function fetchMe() {
  return request<User>("/api/v1/auth/me");
}

// --- trips -----------------------------------------------------------------

export function createTrip(payload: TripRequest) {
  return request<Trip>("/api/v1/trips", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listTrips() {
  return request<Trip[]>("/api/v1/trips", { cache: "no-store" });
}

export function getTrip(tripId: number) {
  return request<Trip>(`/api/v1/trips/${tripId}`, { cache: "no-store" });
}

export function updateTripBudget(tripId: number, budget: number) {
  return request<Trip>(`/api/v1/trips/${tripId}`, {
    method: "PUT",
    body: JSON.stringify({ budget }),
  });
}

export function deleteTrip(tripId: number) {
  return request<{ message: string }>(`/api/v1/trips/${tripId}`, {
    method: "DELETE",
  });
}

export function generateItinerary(tripId: number) {
  return request<Trip>(`/api/v1/trips/${tripId}/generate`, { method: "POST" });
}

// --- conversations (Session 10) ---------------------------------------------

export function createConversation() {
  return request<ConversationDetail>("/api/v1/conversations", { method: "POST" });
}

export function listConversations() {
  return request<ConversationSummary[]>("/api/v1/conversations", {
    cache: "no-store",
  });
}

export function getConversation(conversationId: number) {
  return request<ConversationDetail>(`/api/v1/conversations/${conversationId}`, {
    cache: "no-store",
  });
}

export function sendMessage(conversationId: number, content: string) {
  return request<SendMessageResponse>(
    `/api/v1/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export function deleteConversation(conversationId: number) {
  return request<{ message: string }>(
    `/api/v1/conversations/${conversationId}`,
    { method: "DELETE" },
  );
}
