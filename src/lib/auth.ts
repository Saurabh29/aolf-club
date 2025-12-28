/**
 * Client-side auth helper
 * Centralizes fetching the current session from the Auth.js API route.
 */
export async function fetchSession(): Promise<any | null> {
  try {
    const resp = await fetch("/api/auth/session", { credentials: "include" });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data || null;
  } catch (err) {
    console.error("[fetchSession] failed:", err);
    return null;
  }
}
