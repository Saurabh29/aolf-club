# Using the Unified Session Function

`getAuthSession` in `src/lib/auth.ts` now works seamlessly as both a query (with caching) and a direct async call.

## Usage in Components (Cached with Query)

```typescript
import { createAsync } from "@solidjs/router";
import { getAuthSession } from "~/lib/auth";

export default function MyPage() {
  // Automatically cached - multiple components share same data
  const session = createAsync(() => getAuthSession());
  
  return (
    <div>
      <Show when={session()}>
        <p>Welcome, {session()?.user?.name}!</p>
      </Show>
    </div>
  );
}
```

## Usage in Server Actions (Direct Call)

```typescript
import { getAuthSession } from "~/lib/auth";

export async function myServerAction() {
  "use server";
  
  // Direct call - no createAsync needed in server actions
  const session = await getAuthSession();
  
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  return { userId: session.user.id };
}
```

## Preventing Hydration Mismatches (Recommended for Auth UI)

Use `deferStream: true` to prevent hydration mismatches when session state differs between server and client:

```typescript
import { createAsync } from "@solidjs/router";
import { getAuthSession } from "~/lib/auth";

export default function MyHeader() {
  // deferStream prevents hydration errors by streaming auth UI after initial HTML
  const session = createAsync(() => getAuthSession(), { deferStream: true });
  
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
import { getAuthSession } from "~/lib/auth";

export default function MyPage() {
  const session = createAsync(() => getAuthSession());
  
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
import { getAuthSession } from "~/lib/auth";

// Preload session data before route renders
export const route = {
  preload: () => getAuthSession(),
} satisfies RouteDefinition;

export default function MyPage() {
  const session = createAsync(() => getAuthSession());
  
  return <div>User: {session()?.user?.name}</div>;
}
```

## How It Works

- `getAuthSession` is both a query (cached) AND a regular async function
- When used with `createAsync()`, it provides automatic caching with key `"auth-session"`
- When called directly with `await`, it works as a normal async function
- All components using `createAsync(() => getAuthSession())` share the same cached data
- Server actions can call `await getAuthSession()` directly
- Works seamlessly on both server and client
