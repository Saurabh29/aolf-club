# Using the Shared Session Query

The session query is now defined in `src/lib/auth.ts` and can be reused across all pages and components.

## Usage in Any Component or Page

```typescript
import { createAsync } from "@solidjs/router";
import { getSessionQuery } from "~/lib/auth";

export default function MyPage() {
  // Fetch session data - cached and SSR-safe
  const session = createAsync(() => getSessionQuery());
  
  return (
    <div>
      <Show when={session()}>
        <p>Welcome, {session()?.user?.name}!</p>
      </Show>
    </div>
  );
}
```

## Preventing Hydration Mismatches (Recommended for Auth UI)

Use `deferStream: true` to prevent hydration mismatches when session state differs between server and client:

```typescript
import { createAsync } from "@solidjs/router";
import { getSessionQuery } from "~/lib/auth";

export default function MyHeader() {
  // deferStream prevents hydration errors by streaming auth UI after initial HTML
  const session = createAsync(() => getSessionQuery(), { deferStream: true });
  
  return (
    <Show when={session()} fallback={<SignInButton />}>
      <UserDropdown user={session()?.user} />
    </Show>
  );
}
```

## With Suspense (alternative approach)

```typescript
import { Suspense } from "solid-js";
import { createAsync } from "@solidjs/router";
import { getSessionQuery } from "~/lib/auth";

export default function MyPage() {
  const session = createAsync(() => getSessionQuery());
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Show when={session()}>
        <p>Welcome, {session()?.user?.name}!</p>
      </Show>
    </Suspense>
  );
}
```

## With Route Preloading (best performance)

```typescript
import { type RouteDefinition } from "@solidjs/router";
import { getSessionQuery } from "~/lib/auth";

// Preload session data before route renders
export const route = {
  preload: () => getSessionQuery(),
} satisfies RouteDefinition;

export default function MyPage() {
  const session = createAsync(() => getSessionQuery());
  
  return <div>User: {session()?.user?.name}</div>;
}
```

## Key Benefits

1. **SSR-Safe**: Works on both server and client
2. **Cached**: Query results are cached by key "auth-session"
3. **Reusable**: Import and use in any component/page
4. **Type-Safe**: Full TypeScript support
5. **No Hydration Mismatches**: When wrapped in Suspense

## How It Works

- The query is defined once in `src/lib/auth.ts`
- Uses `"use server"` directive for server-side execution
- Cached with key `"auth-session"` to avoid duplicate fetches
- All components using it share the same cached data
- Automatically refetches when needed (on navigation, etc.)
