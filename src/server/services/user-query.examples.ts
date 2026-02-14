/**
 * User Query Examples - Phase 7
 * 
 * Demonstrates safe, validated querying of the User table with:
 * - Field-level filter validation
 * - Type-safe filter builders
 * - Error handling patterns
 * - Performance best practices
 */

import type { QuerySpec } from "~/lib/schemas/query";
import type { User } from "~/lib/schemas/db/user.schema";
import { queryResource } from "~/server/services/query.service";
import { buildUserFilters, FilterValidationError } from "~/server/data-sources";

/**
 * ============================================================================
 * ALLOWED FILTERS FOR USER TABLE
 * ============================================================================
 * 
 * These fields can be filtered on the User table (DynamoDB scan):
 * 
 * Field              | Operators        | Use Case
 * -------------------|------------------|-----------------------------------
 * userType           | eq               | Filter by Volunteer/Lead/Partner
 * isAdmin            | eq               | Find admin users
 * activeLocationId   | eq               | Users at specific location
 * locationId         | eq               | Users associated with location
 * createdAt          | eq, gt, lt       | Date range queries
 * updatedAt          | eq, gt, lt       | Recently modified users
 * 
 * DISALLOWED FIELDS (with rationale):
 * - displayName: Free-text search, use dedicated search endpoint
 * - email: PII, use exact lookup by email endpoint
 * - phone: PII, not indexed, use exact lookup
 * - image: No valid filtering use case
 * - userId: Use getById instead of filtering
 */

/**
 * ============================================================================
 * EXAMPLE 1: Filter by User Type (Type-Safe Builder)
 * ============================================================================
 */

export async function getVolunteers() {
  const filters = buildUserFilters()
    .byUserType("Volunteer")
    .build();

  return queryResource<User>("users", {
    filters,
    pagination: { mode: "cursor", limit: 50 },
  });
}

// Usage:
// const result = await getVolunteers();
// if (result.success) {
//   console.log("Volunteers:", result.data.items);
// }

/**
 * ============================================================================
 * EXAMPLE 2: Filter by Location and Admin Status
 * ============================================================================
 */

export async function getLocationAdmins(locationId: string) {
  const filters = buildUserFilters()
    .byActiveLocation(locationId)
    .byAdmin(true)
    .build();

  return queryResource<User>("users", {
    filters,
    pagination: { mode: "cursor", limit: 20 },
  });
}

/**
 * ============================================================================
 * EXAMPLE 3: Date Range Query (Recently Created Users)
 * ============================================================================
 */

export async function getRecentUsers(sinceDate: string) {
  const filters = buildUserFilters()
    .createdAfter(sinceDate)
    .build();

  return queryResource<User>("users", {
    filters,
    pagination: { mode: "cursor", limit: 100 },
  });
}

// Usage:
// const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
// const result = await getRecentUsers(oneWeekAgo);

/**
 * ============================================================================
 * EXAMPLE 4: Complex Query (Volunteers at Location, Recently Active)
 * ============================================================================
 */

export async function getActiveVolunteersAtLocation(
  locationId: string,
  activeSince: string
) {
  const filters = buildUserFilters()
    .byUserType("Volunteer")
    .byActiveLocation(locationId)
    .updatedAfter(activeSince)
    .build();

  return queryResource<User>("users", {
    filters,
    pagination: { mode: "cursor", limit: 50 },
  });
}

/**
 * ============================================================================
 * EXAMPLE 5: Manual Filter Construction (Advanced)
 * ============================================================================
 */

export async function getLeadsNotAtLocation(excludeLocationId: string) {
  // Manual construction when builder doesn't cover the use case
  const spec: QuerySpec = {
    filters: [
      { field: "userType", op: "eq", value: "Lead" },
      // Note: "not equal" operator not supported yet
      // Would need to filter client-side or add to allowed operators
    ],
    pagination: { mode: "cursor", limit: 50 },
  };

  return queryResource<User>("users", spec);
}

/**
 * ============================================================================
 * EXAMPLE 6: Error Handling for Invalid Filters
 * ============================================================================
 */

export async function searchUsersByNameUnsafe(name: string) {
  try {
    // This will throw FilterValidationError
    const spec: QuerySpec = {
      filters: [
        { field: "displayName", op: "contains", value: name }, // ❌ Not allowed!
      ],
      pagination: { mode: "cursor", limit: 20 },
    };

    return await queryResource<User>("users", spec);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot filter")) {
      // Handle validation error gracefully
      return {
        success: false as const,
        error: "Name-based search is not supported. Please use the search endpoint or filter by other criteria.",
      };
    }
    throw error;
  }
}

/**
 * ============================================================================
 * EXAMPLE 7: Pagination with Cursor
 * ============================================================================
 */

export async function getAllUsersWithPagination(cursor?: string) {
  return queryResource<User>("users", {
    filters: [], // No filters = all users
    pagination: {
      mode: "cursor",
      limit: 50,
      cursor, // Pass cursor from previous result for next page
    },
  });
}

// Usage (infinite scroll pattern):
// let cursor: string | undefined;
// do {
//   const result = await getAllUsersWithPagination(cursor);
//   if (!result.success) break;
//   
//   processUsers(result.data.items);
//   cursor = result.data.nextCursor;
// } while (cursor);

/**
 * ============================================================================
 * PERFORMANCE CONSIDERATIONS
 * ============================================================================
 * 
 * DynamoDB Scan Performance:
 * - Scans read entire table (even with filters)
 * - Filters applied AFTER reading items (consumes RCU)
 * - Limit controls page size, NOT total items scanned
 * 
 * Best Practices:
 * 1. Use specific filters to reduce result set
 * 2. Keep limit reasonable (50-100 items)
 * 3. Use cursor pagination (not offset)
 * 4. Consider caching for frequently accessed queries
 * 5. For exact lookups, use getById endpoints
 * 
 * When NOT to use filtering:
 * - Exact email lookup → use getUserByEmail()
 * - Exact userId lookup → use getResourceById()
 * - Free-text search → use dedicated search service
 * - Complex joins → precompute in service layer
 */

/**
 * ============================================================================
 * VALIDATION ERROR MESSAGES
 * ============================================================================
 * 
 * When filters are invalid, you'll get clear error messages:
 * 
 * Example 1: Disallowed field
 * Error: "Cannot filter User by field 'email'. Allowed fields: userType, 
 *         isAdmin, activeLocationId, locationId, createdAt, updatedAt. 
 *         Use a specific endpoint for other lookups."
 * 
 * Example 2: Disallowed operator
 * Error: "Operator 'contains' is not supported for field 'userType'. 
 *         Allowed operators for userType: eq."
 * 
 * These errors help developers use the correct query patterns.
 */

/**
 * ============================================================================
 * EXTENDING FILTER VALIDATION
 * ============================================================================
 * 
 * To add new filterable fields for User table:
 * 
 * 1. Update USER_FILTERABLE_FIELDS in query-validation.ts:
 *    - Add field name to allowedFields array
 *    - Optionally specify allowed operators for that field
 * 
 * 2. Add builder method to UserFilterBuilder (if commonly used):
 *    - byNewField(value: Type): this { ... }
 * 
 * 3. Document the field in this file's allowed filters table
 * 
 * Example:
 * ```typescript
 * export const USER_FILTERABLE_FIELDS = {
 *   allowedFields: [...existingFields, "status"],
 *   fieldOperators: {
 *     ...existingOperators,
 *     status: ["eq"], // Only exact match
 *   },
 * };
 * ```
 */
