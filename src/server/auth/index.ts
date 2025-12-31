import github from "@auth/core/providers/github";
import type { StartAuthJSConfig } from "start-authjs";
import { StartAuthJS } from "start-authjs";
import type { AuthRequestContext } from "start-authjs";
import { getRequestEvent } from "solid-js/web";
import { env } from "../config";
import { createOrGetOAuthUser, findUserByEmail } from "../services/auth.service";
import { getUserGroupsForUser } from "~/server/db/repositories/userGroup.repository";
import { getUserById } from "~/server/db/repositories/user.repository";

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
    callbacks: {
        signIn: async ({ user, account }) => {
            try {
                // Extract email from OAuth response
                const emailAddress = user.email?.toLowerCase();
                if (!emailAddress) {
                    console.error("No email provided by OAuth provider");
                    return false;
                }

                // Create or retrieve user
                const result = await createOrGetOAuthUser(
                    emailAddress,
                    user.name || null,
                    user.image || null,
                    account?.provider,
                );

                if (result.isNewUser) {
                    console.log("Created new user:", emailAddress);
                } else {
                    console.log("Existing user login:", emailAddress);
                }

                return true;
            } catch (error) {
                console.error("Error in signIn callback:", error);
                return false;
            }
        },
        jwt: async ({ token, user }) => {
            // If we already have userId in token, skip DB lookup
            if (token.userId) return token;

            // During initial sign-in `user` may be present; try resolving userId
            if (user?.email) {
                const dbUser = await findUserByEmail(user.email);
                if (dbUser) token.userId = dbUser.userId;
            }

            return token;
        },
        session: async ({ session, token }) => {
            // Add user info to session from token
            if (token.userId) {
                (session as any).user.id = token.userId;
                try {
                    // Populate activeLocationId from persisted user preference if set
                    const u = await getUserById(token.userId as string);
                    if (u?.activeLocationId) {
                        (session as any).user.activeLocationId = u.activeLocationId;
                    }

                    // If user only belongs to one location, set it on session for convenience
                    const groups = await getUserGroupsForUser(token.userId as string);
                    const uniq = Array.from(new Set(groups.map((g) => g.locationId)));
                    if (uniq.length === 1) {
                        // Only override persisted preference when user belongs to exactly one location
                        (session as any).user.activeLocationId = uniq[0];
                        // Also ensure an HttpOnly cookie is set for downstream server actions
                        // Note: StartAuthJS `session` callback can return headers via special
                        // shape when running inside its handler. Attach `Set-Cookie` header
                        // to the returned session by including a `_setCookie` property
                        // on the session object. The StartAuthJS handler will include
                        // it in the response if supported.
                        try {
                            const cookie = `aolf_active_location=${uniq[0]}; Path=/; HttpOnly; SameSite=Lax`;
                            (session as any)._setCookie = cookie;
                        } catch (e) {
                            // ignore header attaching failures
                        }
                    }
                } catch (e) {
                    // ignore errors here
                }
            }
            return session;
        },
    }
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

    // Preferred: application `userId` should be stored on session.user.id by
    // the `session` callback during sign-in. Fall back to other common keys.
    const userId =
        session?.user?.id || session?.user?.userId || session?.user?.sub || null;

    if (!userId) {
        throw new Error("Authenticated session does not contain application userId");
    }

    return userId as string;
}