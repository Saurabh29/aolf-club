import github from "@auth/core/providers/github";
import type { StartAuthJSConfig } from "start-authjs";
import { StartAuthJS } from "start-authjs";
import type { AuthRequestContext } from "start-authjs";
import { getRequestEvent } from "solid-js/web";
import { env } from "../config/env";
import { getUserIdByEmail } from "~/server/db/repositories/email.repository";

export const authConfig: StartAuthJSConfig = {
    secret: env.AUTH_SECRET,
    basePath: new URL(env.AUTH_URL!).pathname,
    session: {
        strategy: "jwt",
    },
    providers: [
        github({
            clientId: env.GITHUB_CLIENT_ID!,
            clientSecret: env.GITHUB_CLIENT_SECRET!,
            authorization: { params: { scope: "read:user user:email" } },
        }),
    ],
    debug: true,
};

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
    const ev = getRequestEvent?.();
    if (!ev) {
        throw new Error("getCurrentUserId must be called during a server request");
    }

    const cookie = ev.request.headers.get("cookie") || "";

    const { GET } = StartAuthJS(authConfig);

    const sessionUrl = new URL("/api/auth/session", env.AUTH_URL).toString();
    const sessionReq = new Request(sessionUrl, {
        method: "GET",
        headers: { cookie },
    });

    const ctx: AuthRequestContext = { request: sessionReq } as AuthRequestContext;
    const resp = await GET(ctx as AuthRequestContext);

    if (!resp || !resp.ok) {
        throw new Error("Not authenticated");
    }

    const session = await resp.json().catch(() => null);
    const email = session?.user?.email as string | undefined;

    if (!email) {
        throw new Error("Authenticated session has no user email");
    }

    const userId = await getUserIdByEmail(email.toLowerCase());
    if (!userId) {
        throw new Error("No application user found for authenticated email");
    }

    return userId;
}