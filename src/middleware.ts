import { createMiddleware } from "@solidjs/start/middleware";
import { getAuthSession } from "~/server/actions/auth";

/**
 * Authentication Middleware
 * 
 * Protects routes by checking if user is authenticated.
 * Redirects to /api/auth/signin if not authenticated.
 * 
 * Public routes (no auth required):
 * - /api/auth/* (auth endpoints)
 * - /test-oauth (test page)
 * - / (home/landing)
 * 
 * All other routes require authentication.
 */
export default createMiddleware({
  onRequest: async (event) => {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    // Skip auth check for public routes
    const publicRoutes = [
      "/api/auth/",
      "/test-oauth",
      "/assets/",
      "/_build/",
    ];

    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    
    // Allow home page without auth, but protect all other routes
    if (isPublicRoute || pathname === "/") {
      return;
    }

    // Check authentication
    try {
      const session = await getAuthSession();
      
      if (!session || !session.user) {
        // Redirect to signin if not authenticated
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/api/auth/signin",
          },
        });
      }
    } catch (error) {
      console.error("Auth middleware error:", error);
      // Redirect to signin on error
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/api/auth/signin",
        },
      });
    }
  },
});
