SolidStart Data Fetching & Mutation Guidelines
=============================================

This project follows SolidStart's recommended patterns for data fetching and mutations to ensure predictable SSR behavior, good caching, and ease of reasoning.

Recommended patterns
- Use `query(...)` on the server for server-side data fetching and expose a named query function that wraps your existing server actions.
- In route components, use `createAsync(() => yourQuery())` to read the query on the client; export `route.preload = () => yourQuery()` to prefetch on the server.
- Wrap client UI in `Suspense` + `ErrorBoundary` when using `createAsync` so SSR streaming and client hydration behave correctly.
- Use `"use server"` server actions (in `src/server/actions/*`) for mutations and sensitive operations. Call them from client components or server routes; they run securely on the server.
- After mutations, re-run or invalidate the relevant `query` by calling the query function again (or implement a dedicated cache invalidation helper) so UI refreshes consistently.

Why this matters
- SSR correctness: Using server `query` + client `createAsync` keeps server-rendered HTML and client hydration consistent.
- Performance: Queries can be cached and preloaded on the server, reducing duplicate fetches and improving TTFP.
- Security: `"use server"` server actions run with server-side privileges and avoid leaking secrets to the client.

Links
- Data fetching: https://docs.solidjs.com/solid-start/building-your-application/data-fetching
- Data mutation: https://docs.solidjs.com/solid-start/building-your-application/data-mutation

Migration notes
- Existing components that use `createResource` may be migrated incrementally to the `query` + `createAsync` pattern. Prefer moving route-level data fetching first (e.g., `src/routes/*`).
- Keep highly interactive, client-only UI (localStorage, window access) in client-only components to avoid hydration mismatches.

Examples
- See `src/routes/locations.tsx` and `src/routes/users.tsx` for applied examples in this repo.

If you'd like, I can add a lint rule or commit hook reminder to check for these patterns when creating new routes.
