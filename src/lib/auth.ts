import { isServer } from "solid-js/web";
/**
 * Unified session fetcher that works on both client and server.
 * On server: uses StartAuthJS getSession with request event.
 * On client: fetches from /api/auth/session endpoint.
 */
export async function getAuthSession(): Promise<any | null> {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined";
  
  if (isServer) {
    // Server-side path - use dynamic imports to avoid loading server code on client
    try {
      const { getSession } = await import("start-authjs");
      const { getRequestEvent } = await import("solid-js/web");
      const { authConfig } = await import("~/server/auth");
      
      const ev = getRequestEvent?.();
      if (!ev) return null;
      
      const session = await getSession(ev.request as Request, authConfig as any);
      return session ?? null;
    } catch (e) {
      return null;
    }
  } else {
    // Client-side path
    try {
      const resp = await fetch("/api/auth/session", { credentials: "include" });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data || null;
    } catch (err) {
      console.error("[getAuthSession] failed:", err);
      return null;
    }
  }
}

export type SessionInfo = {
  userId: string | null;
  activeLocationId: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  raw?: any | null;
};

/**
 * Get full session info including user details.
 * Returns userId, activeLocationId, email, name, image from the session.
 * Works on both client and server.
 */
export async function getSessionInfo(): Promise<SessionInfo> {
  try {
    const session = await getAuthSession();
    const raw = session ?? null;
    const userId = raw?.user?.id || raw?.user?.userId || raw?.user?.sub || null;

    if (!userId) {
      return {
        userId: null,
        activeLocationId: null,
        email: null,
        name: null,
        image: null,
        raw,
      };
    }

    // Get activeLocationId from session first (populated in jwt callback)
    let activeLocationId = raw?.user?.activeLocationId || null;
    
    // If not in session, fetch from DB (fallback for older sessions)
    // Only on server side
    if (!activeLocationId && typeof window === "undefined") {
      try {
        const { getUserById } = await import("~/server/db/repositories/user.repository");
        const user = await getUserById(userId as string);
        activeLocationId = user?.activeLocationId || null;
      } catch (err) {
        // Ignore DB errors, activeLocationId will remain null
      }
    }

    return {
      userId: userId as string,
      activeLocationId,
      email: raw?.user?.email || null,
      name: raw?.user?.name || null,
      image: raw?.user?.image || null,
      raw,
    };
  } catch (err) {
    console.error("[getSessionInfo] error:", err);
    return {
      userId: null,
      activeLocationId: null,
      email: null,
      name: null,
      image: null,
      raw: null,
    };
  }
}
