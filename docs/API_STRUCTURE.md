# Server API Structure

This document describes the structure of `src/server/api/*` modules following SolidStart data fetching and mutation patterns.

## Pattern Overview

Following [SolidStart data fetching](https://docs.solidjs.com/solid-start/building-your-application/data-fetching) and [data mutation](https://docs.solidjs.com/solid-start/building-your-application/data-mutation) patterns:

- **Queries (reads)**: Use `query()` from `@solidjs/router` with "Query" suffix
- **Actions (mutations)**: Use `action()` from `@solidjs/router` with "Action" suffix
- All server operations use dynamic imports to keep server-only code out of client bundles

## API Modules

### `src/server/api/locations.ts`

**Queries:**
- `getLocationsQuery` - Fetch all locations for current user
- `getUserLocationsQuery` - Fetch locations for user dropdown/switcher
- `getLocationByIdQuery` - Fetch single location by ID

**Actions:**
- `setActiveLocationAction` - Set the active location for current session
- `createLocationAction` - Create a new location
- `updateLocationAction` - Update existing location
- `deleteLocationAction` - Delete a location

### `src/server/api/users.ts`

**Queries:**
- `getUsersForActiveLocationQuery` - Fetch all users for the active location

**Actions:**
- `assignUsersToGroupAction` - Assign multiple users to a group (e.g., VOLUNTEER, MEMBER)
- `createUserManualAction` - Manually create a single user
- `importUsersFromCSVAction` - Import multiple users from CSV data

**Types:**
- `UserWithGroup` - User with their group assignment info

### `src/server/api/task-outreach.ts`

**Queries:**
- `fetchMyTasksQuery` - Fetch tasks assigned to current user
- `fetchTasksForActiveLocationQuery` - Fetch all tasks for active location
- `getActiveLocationIdQuery` - Get the current active location ID

**Actions:**
- `fetchTaskByIdAction` - Fetch task details by ID
- `createTaskAction` - Create a new task
- `fetchTaskAction` - Fetch full task details with metadata
- `fetchMyAssignedUsersAction` - Fetch users assigned to me for a task
- `fetchUnassignedCountAction` - Get count of unassigned users for a task
- `selfAssignAction` - Volunteer self-assigns users from a task
- `saveInteractionAction` - Save interaction notes/status for a user
- `skipUserAction` - Skip/remove a user from volunteer's assignment

## Usage Patterns

### In Routes/Components - Queries

Use with `createAsync` or `createResource`:

```tsx
import { createAsync } from "@solidjs/router";
import { getUsersForActiveLocationQuery } from "~/server/api/users";

const users = createAsync(() => getUsersForActiveLocationQuery());
```

Or with `createResource`:

```tsx
const [users] = createResource(() => getUsersForActiveLocationQuery());
```

### In Routes/Components - Actions

Call actions directly (they return promises):

```tsx
import { createUserManualAction } from "~/server/api/users";

const result = await createUserManualAction({
  displayName: "John Doe",
  email: "john@example.com",
});

if (result.success) {
  // Handle success
} else {
  // Handle error: result.error
}
```

### In Services

All business logic remains in `src/server/services/*`:
- Services handle Zod validation
- Services call database repositories
- Services return `ActionResult<T>` (typed success/error responses)

API modules simply wrap service calls with `query()` or `action()` and use dynamic imports to ensure server-only code stays server-only:

```tsx
export const createLocationAction = action(async (formData: any) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.createLocation(formData);
}, "create-location");
```

## Naming Convention

- **Queries**: End with `Query` (e.g., `getUsersQuery`, `getLocationsQuery`)
- **Actions**: End with `Action` (e.g., `createUserAction`, `deleteLocationAction`)
- This differentiates API wrappers from service functions (which have no suffix)

## Why This Structure?

1. **Client Safety**: API wrappers use dynamic imports inside `"use server"` functions, preventing server-only code (env vars, DB clients) from being bundled into client code
2. **SolidStart Patterns**: Follows official SolidStart patterns for data fetching and mutations
3. **Type Safety**: All queries/actions are fully typed
4. **Consistent Error Handling**: All services return `ActionResult<T>` for uniform success/error handling
   - **Queries**: Unwrap ActionResult and throw on error (SolidStart handles via ErrorBoundary)
   - **Actions**: Return ActionResult directly for UI to check `result.success` and handle `result.error`
5. **Clear Separation**: 
   - `src/server/api/*` = thin wrappers for client consumption
   - `src/server/services/*` = business logic and DB operations
6. **Preload Support**: Query wrappers can be used with `preload` for optimistic data fetching

## Error Handling Pattern

### Services Layer (`src/server/services/*`)

All service functions return `ActionResult<T>`:

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

Example:
```typescript
export async function createLocation(formData: AddLocationForm): Promise<ActionResult<LocationUi>> {
  try {
    // validation & business logic
    const location = await createLocationRepo(data);
    return { success: true, data: toUiLocation(location) };
  } catch (error) {
    console.error("[createLocation] Error:", error);
    return { success: false, error: "Failed to create location" };
  }
}
```

### API Layer (`src/server/api/*`)

**Queries** unwrap ActionResult and throw on error:
```typescript
export const getLocationsQuery = query(async () => {
  "use server";
  const svc = await import("~/server/services");
  const result = await svc.getLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch locations");
  return result.data; // Returns unwrapped data
}, "locations-for-user");
```

**Actions** return ActionResult directly:
```typescript
export const createLocationAction = action(async (formData: any) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.createLocation(formData); // Returns ActionResult<LocationUi>
}, "create-location");
```

### UI Layer (Routes/Components)

**With Queries** - errors are thrown and handled by ErrorBoundary:
```tsx
const locations = createAsync(() => getLocationsQuery());
// If query fails, ErrorBoundary will catch the error
```

**With Actions** - check `result.success`:
```tsx
const result = await createLocationAction(formData);
if (result.success) {
  // Handle success: result.data contains the created location
  alert("Location created successfully!");
} else {
  // Handle error: result.error contains the error message
  alert(`Failed: ${result.error}`);
}
```

This pattern ensures:
- **Queries**: Fail fast with ErrorBoundary (user-friendly error pages)
- **Actions**: Inline error handling (form validation, user feedback)
- **Consistency**: All services use the same ActionResult pattern
- **Type Safety**: TypeScript ensures correct error handling at compile time
