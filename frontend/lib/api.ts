const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = { ...(options.headers || {}) };
  const method = (options.method || "GET").toUpperCase();
  const hasBody = options.body != null && options.body !== "";
  if (hasBody && !(headers as Record<string, string>)["Content-Type"]) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyApiError(text, res.status));
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

/** Map FastAPI JSON errors to short copy; never surface raw JSON in the UI. */
export function friendlyApiError(body: string, status?: number): string {
  const generic =
    status === 401
      ? "We couldn't sign you in. Check your email and password, or continue with Strava."
      : "Something went wrong. Please try again.";

  if (!body?.trim()) return generic;

  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    const detail = parsed.detail;
    if (typeof detail === "string") {
      const map: Record<string, string> = {
        "Invalid credentials": generic,
        "Email already registered": "That email is already registered. Sign in instead.",
        "Not authenticated": "Your session expired. Please sign in again.",
      };
      return map[detail] ?? generic;
    }
  } catch {
    if (body.includes("Invalid credentials")) return generic;
  }

  return generic;
}

export { API_URL };
