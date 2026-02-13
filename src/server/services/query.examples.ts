/**
 * Unified Response Patterns
 * 
 * Phase 6: Documentation and examples of the unified API response shape.
 * 
 * This file demonstrates how all query/list operations should be structured
 * to ensure consistency across the entire application.
 */

import type { ApiResult } from "~/lib/types";
import type { QueryResult, QuerySpec } from "~/lib/schemas/query";

/**
 * ============================================================================
 * UNIFIED RESPONSE SHAPE
 * ============================================================================
 * 
 * All list/query operations MUST return this shape:
 * 
 * ApiResult<QueryResult<T>> where:
 * 
 * - ApiResult provides success/error envelope
 * - QueryResult provides pagination-aware data structure
 * 
 * Type Definition:
 * ```typescript
 * type ApiResult<QueryResult<T>> =
 *   | {
 *       success: true;
 *       data: {
 *         items: T[];              // Array of entities
 *         nextCursor?: string;     // For DynamoDB cursor pagination
 *         totalCount?: number;     // For in-memory total count
 *       }
 *     }
 *   | {
 *       success: false;
 *       error: string;             // User-friendly error message
 *     }
 * ```
 */

/**
 * ============================================================================
 * EXAMPLE: User List Query (DynamoDB-backed)
 * ============================================================================
 */

import type { User } from "~/lib/schemas/db/user.schema";
import { queryResource } from "~/server/services/query.service";

/**
 * Example: List users with filters and pagination (DynamoDB).
 * 
 * This replaces ad-hoc list functions with the unified query pattern.
 */
export async function listUsersQuery(spec: QuerySpec): Promise<ApiResult<QueryResult<User>>> {
  return queryResource<User>("users", spec);
}

// Usage example:
// const result = await listUsersQuery({
//   filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
//   pagination: { mode: "cursor", limit: 20 }
// });
//
// if (result.success) {
//   console.log("Users:", result.data.items);
//   console.log("Next cursor:", result.data.nextCursor);
// }

/**
 * ============================================================================
 * EXAMPLE: Location List Query (In-memory)
 * ============================================================================
 */

import type { Location } from "~/lib/schemas/db/location.schema";

/**
 * Example: List locations with sorting (in-memory).
 */
export async function listLocationsQuery(spec: QuerySpec): Promise<ApiResult<QueryResult<Location>>> {
  return queryResource<Location>("locations", spec);
}

// Usage example:
// const result = await listLocationsQuery({
//   sort: { field: "name", direction: "asc" },
//   pagination: { mode: "offset", limit: 50, offset: 0 }
// });
//
// if (result.success) {
//   console.log("Locations:", result.data.items);
//   console.log("Total count:", result.data.totalCount);
// }

/**
 * ============================================================================
 * MIGRATION GUIDE: Old Pattern → New Pattern
 * ============================================================================
 * 
 * OLD PATTERN (Ad-hoc, inconsistent):
 * ```typescript
 * export async function getUsers(): Promise<ApiResult<User[]>> {
 *   try {
 *     const users = await repository.listUsers();
 *     return { success: true, data: users };
 *   } catch (error) {
 *     return { success: false, error: "Failed" };
 *   }
 * }
 * ```
 * 
 * Problems with old pattern:
 * - No pagination metadata
 * - No cursor for next page
 * - No total count
 * - Direct repository coupling
 * 
 * NEW PATTERN (Unified, paginated):
 * ```typescript
 * export async function getUsers(spec: QuerySpec): Promise<ApiResult<QueryResult<User>>> {
 *   return queryResource<User>("users", spec);
 * }
 * ```
 * 
 * Benefits of new pattern:
 * ✅ Consistent pagination (cursor or offset)
 * ✅ Filtering and sorting support
 * ✅ Data source abstraction (DynamoDB or in-memory)
 * ✅ Uniform error handling
 * ✅ Total count when available
 * ✅ UI-friendly response shape
 */

/**
 * ============================================================================
 * RESPONSE SHAPE GUARANTEES
 * ============================================================================
 * 
 * 1. ALL list operations return QueryResult wrapped in ApiResult
 * 2. QueryResult.items is ALWAYS an array (never null/undefined)
 * 3. QueryResult.nextCursor is present ONLY if more pages exist
 * 4. QueryResult.totalCount is present ONLY for in-memory sources
 * 5. ApiResult.success discriminates the union (type-safe)
 */

/**
 * Type guard for successful query results
 */
export function isSuccessfulQuery<T>(
  result: ApiResult<QueryResult<T>>
): result is { success: true; data: QueryResult<T> } {
  return result.success === true;
}

/**
 * ============================================================================
 * UI INTEGRATION EXAMPLE
 * ============================================================================
 * 
 * SolidJS component using the unified query pattern:
 * 
 * ```tsx
 * import { createAsync } from "@solidjs/router";
 * import { listUsersQuery } from "~/server/services/query.examples";
 * 
 * export default function UsersPage() {
 *   const usersResult = createAsync(() => listUsersQuery({
 *     filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
 *     pagination: { mode: "cursor", limit: 20 }
 *   }));
 * 
 *   return (
 *     <Show when={usersResult()?.success}>
 *       {(result) => (
 *         <>
 *           <For each={result().data.items}>
 *             {(user) => <UserCard user={user} />}
 *           </For>
 *           <Show when={result().data.nextCursor}>
 *             <button onClick={() => loadMore(result().data.nextCursor!)}>
 *               Load More
 *             </button>
 *           </Show>
 *         </>
 *       )}
 *     </Show>
 *   );
 * }
 * ```
 */

/**
 * Re-export types for convenience
 */
export type { QueryResult, QuerySpec, ApiResult };
