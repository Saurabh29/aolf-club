import { query, action } from "@solidjs/router";
import type { GroupType } from "~/lib/schemas/db/types";
import type { QuerySpec } from "~/lib/schemas/query";
import {
  assignUsersToGroup,
  createUserManual,
  importUsersFromCSV,
  queryUsers,
  getUsersByType,
  queryUsersByLocation,
  queryAdminUsers,
  queryUserById,
} from "~/server/services";
import { getSessionInfo } from "~/lib/auth";
import { getUserById } from "~/server/db/repositories/user.repository";

// ============================================================================
// QUERY ABSTRACTION API
// ============================================================================

/**
 * Get current user's active location ID
 * Returns the activeLocationId from the user's DB record
 */
export const getCurrentUserActiveLocationQuery = query(async () => {
  "use server";
  try {
    const session = await getSessionInfo();
    
    if (!session.userId) {
      return null;
    }
    
    const user = await getUserById(session.userId);
    return user?.activeLocationId ?? null;
  } catch (error) {
    console.error('[getCurrentUserActiveLocationQuery] Failed:', error);
    return null;
  }
}, "current-user-active-location");

/**
 * Query users with filters and pagination
 * 
 * @example
 * ```tsx
 * const usersResult = createAsync(() => queryUsersQuery({
 *   filters: buildUserFilters().byUserType("Volunteer").build(),
 *   pagination: { mode: "cursor", limit: 50 }
 * }));
 * ```
 */
export const queryUsersQuery = query(async (spec: QuerySpec) => {
  "use server";
  const result = await queryUsers(spec);
  if (!result.success) throw new Error(result.error ?? "Failed to query users");
  return result.data;
}, "query-users");

/**
 * Get users by type (Volunteer, Lead, Partner)
 */
export const getUsersByTypeQuery = query(async (
  userType: "Volunteer" | "Lead" | "Partner",
  limit?: number,
  cursor?: string
) => {
  "use server";
  const result = await getUsersByType(userType, limit, cursor);
  if (!result.success) throw new Error(result.error ?? "Failed to get users by type");
  return result.data;
}, "users-by-type");

/**
 * Get users for a specific location
 */
export const queryUsersByLocationQuery = query(async (
  locationId: string,
  limit?: number,
  cursor?: string
) => {
  "use server";
  const result = await queryUsersByLocation(locationId, limit, cursor);
  if (!result.success) throw new Error(result.error ?? "Failed to query users by location");
  return result.data;
}, "query-users-by-location");

/**
 * Get admin users
 */
export const queryAdminUsersQuery = query(async (limit?: number, cursor?: string) => {
  "use server";
  const result = await queryAdminUsers(limit, cursor);
  if (!result.success) throw new Error(result.error ?? "Failed to query admin users");
  return result.data;
}, "query-admin-users");

/**
 * Get user by ID
 */
export const queryUserByIdQuery = query(async (userId: string) => {
  "use server";
  const result = await queryUserById(userId);
  if (!result.success) throw new Error(result.error ?? "Failed to query user by ID");
  return result.data;
}, "query-user-by-id");

// ============================================================================
// ACTIONS
// ============================================================================

export const assignUsersToGroupAction = action(async (userIds: string[], groupType: GroupType) => {
  "use server";
  return await assignUsersToGroup(userIds, groupType);
}, "assign-users-to-group");

export const createUserManualAction = action(async (input: any) => {
  "use server";
  return await createUserManual(input);
}, "create-user-manual");

export const importUsersFromCSVAction = action(async (input: any) => {
  "use server";
  return await importUsersFromCSV(input);
}, "import-users-from-csv");
