import { getSession } from "start-authjs";
import { getRequestEvent } from "solid-js/web";
import type { StartAuthJSConfig } from "start-authjs";
import { authConfig } from "../auth"; 

/**
 * Resolve the current authenticated application user ID from the incoming
 * request's auth session.
 *
 * This function calls the StartAuthJS session handler internally by
 * forwarding the incoming request's cookie header to the `/api/auth/session`
 * action and then resolves the mapped `userId` from the EmailIdentity table.
 *
 * Returns the application's `userId` (ULID) or throws an error when the
 * request is not authenticated or the email isn't mapped to a user.
 */
export async function getCurrentUserId(): Promise<string> {
	const session = await getAuthSession();

	const userId = session?.user?.id || session?.user?.userId || session?.user?.sub || null;

	if (!userId) {
		throw new Error("Authenticated session does not contain application userId");
	}

	return userId as string;
}

/**
 * Get the current auth session for the incoming request.
 * Uses StartAuthJS to handle the session route and returns the parsed session
 * object or null when not authenticated.
 */
export async function getAuthSession(): Promise<any | null> {
	const ev = getRequestEvent?.();
	if (!ev) return null;

	try {
		const session = await getSession(ev.request as Request, authConfig as StartAuthJSConfig);
		return session ?? null;
	} catch (e) {
		return null;
	}
}
