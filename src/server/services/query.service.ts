/**
 * Query Service
 * 
 * Phase 6: Unified API response shape for all query operations.
 * 
 * This service provides a consistent interface for querying any resource,
 * regardless of whether it's backed by DynamoDB or in-memory data.
 * 
 * Unified Response Shape:
 * ```typescript
 * ApiResult<QueryResult<T>> = {
 *   success: true,
 *   data: {
 *     items: T[],
 *     nextCursor?: string,     // For cursor-based pagination
 *     totalCount?: number      // Only for in-memory sources
 *   }
 * }
 * ```
 * 
 * All list/query operations across the app should use this shape.
 */

import type { ApiResult } from "~/lib/types";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import { getDataSource, type ResourceName } from "~/server/data-sources";
import { ensureDataSourcesInitialized } from "~/server/data-sources/init";

/**
 * Generic query function that works with any resource.
 * 
 * Benefits:
 * - UI doesn't know if data comes from DynamoDB or memory
 * - Consistent error handling
 * - Uniform response shape
 * - Easy to switch data sources via resolver
 * 
 * @template T The entity type (User, Location, Group, etc.)
 * @param resource The resource name (maps to data source strategy)
 * @param spec Query specification (filters, sort, pagination)
 * @returns Promise of ApiResult wrapping QueryResult
 * 
 * @example
 * ```typescript
 * // Query users (uses DynamoDB)
 * const result = await queryResource<User>("users", {
 *   filters: [{ field: "userType", op: "eq", value: "Volunteer" }],
 *   pagination: { mode: "cursor", limit: 20 }
 * });
 * 
 * // Query locations (uses in-memory)
 * const result = await queryResource<Location>("locations", {
 *   sort: { field: "name", direction: "asc" },
 *   pagination: { mode: "offset", limit: 50, offset: 0 }
 * });
 * ```
 */
export async function queryResource<T>(
  resource: ResourceName,
  spec: QuerySpec
): Promise<ApiResult<QueryResult<T>>> {
  try {
    // Ensure data sources are registered
    ensureDataSourcesInitialized();

    // Get the appropriate data source (DynamoDB or in-memory)
    const dataSource = getDataSource<T>(resource);

    // Execute the query
    const result = await dataSource.query(spec);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[queryResource] Failed to query ${resource}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to query ${resource}`,
    };
  }
}

/**
 * Get a single resource by ID.
 * 
 * Optimized for single-item retrieval if the data source supports it.
 * Falls back to querying with a filter if getById is not implemented.
 * 
 * @template T The entity type
 * @param resource The resource name
 * @param id The resource ID
 * @returns Promise of ApiResult with the item or null
 * 
 * @example
 * ```typescript
 * const result = await getResourceById<User>("users", "01HQ7X8Y9ZABCDEF123456789");
 * if (result.success && result.data) {
 *   console.log("Found user:", result.data.displayName);
 * }
 * ```
 */
export async function getResourceById<T>(
  resource: ResourceName,
  id: string
): Promise<ApiResult<T | null>> {
  try {
    // Ensure data sources are registered
    ensureDataSourcesInitialized();

    const dataSource = getDataSource<T>(resource);

    // Use getById if available (efficient for DynamoDB)
    if (dataSource.getById) {
      const item = await dataSource.getById(id);
      return { success: true, data: item };
    }

    // Fallback: query with ID filter
    // Note: This assumes the ID field name matches the resource (e.g., "userId" for users)
    const idField = getIdFieldForResource(resource);
    const result = await dataSource.query({
      filters: [{ field: idField, op: "eq", value: id }],
      pagination: { mode: "offset", limit: 1 },
    });

    const item = result.items[0] ?? null;
    return { success: true, data: item };
  } catch (error) {
    console.error(`[getResourceById] Failed to get ${resource} by ID:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to get ${resource}`,
    };
  }
}

/**
 * Get total count for a resource (if supported).
 * 
 * Only in-memory data sources can provide this efficiently.
 * DynamoDB sources return undefined.
 * 
 * @param resource The resource name
 * @returns Promise of ApiResult with count or undefined
 */
export async function getResourceCount(
  resource: ResourceName
): Promise<ApiResult<number | undefined>> {
  try {
    // Ensure data sources are registered
    ensureDataSourcesInitialized();

    const dataSource = getDataSource<unknown>(resource);

    if (dataSource.count) {
      const count = await dataSource.count();
      return { success: true, data: count };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error(`[getResourceCount] Failed to count ${resource}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to count ${resource}`,
    };
  }
}

/**
 * Helper: Map resource name to its ID field name.
 */
function getIdFieldForResource(resource: ResourceName): string {
  const mapping: Record<ResourceName, string> = {
    users: "userId",
    locations: "locationId",
    groups: "groupId",
    roles: "roleName",
    pages: "pageId",
    tasks: "taskId",
    leads: "leadId",
  };

  return mapping[resource] ?? "id";
}

/**
 * Re-export QueryResult type for consistency
 */
export type { QueryResult, QuerySpec } from "~/lib/schemas/query";
