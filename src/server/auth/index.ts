import github from "@auth/core/providers/github";
import type { StartAuthJSConfig } from "start-authjs";
import { getSession } from "start-authjs";
import { getRequestEvent } from "solid-js/web";
import { env } from "../config";
import { createOrGetOAuthUser, findUserByEmail } from "../services/auth.service";
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

			// If we have userId, fetch user and groups for activeLocationId
			if (token.userId) {
				try {
					const u = await getUserById(token.userId as string);
					if (u?.activeLocationId) {
						token.activeLocationId = u.activeLocationId;
					}
				} catch (e) {
					// ignore errors here
				}
			}
			return token;
		},
		session: async ({ session, token }) => {
			// Add user info to session from token only (no DB calls)
			if (token.userId) {
				(session as any).user.id = token.userId;
			}
			if (token.activeLocationId) {
				(session as any).user.activeLocationId = token.activeLocationId;
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