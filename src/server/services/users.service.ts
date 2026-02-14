/**
 * Users service layer (migrated from server/actions/users.ts)
 * Plain service functions that perform DB reads/writes and return ActionResult shapes.
 * These functions are server-only but do not include the "use server" directive so
 * they can be called from different server wrappers (api/query wrappers) consistently.
 */

import { getSessionInfo } from "~/lib/auth"; 
import { getUserById, createUser } from "~/server/db/repositories/user.repository";
import { getUsersForLocation, addUserToLocation } from "~/server/db/repositories/userLocation.repository";
import { getUserGroupsForUser, addUserToGroup } from "~/server/db/repositories/userGroup.repository";
import { createEmailIdentity } from "~/server/db/repositories/email.repository";
import type { GroupType } from "~/lib/schemas/db/types";
import type { ApiResult } from "~/lib/types";
import type { User } from "~/lib/schemas/db/user.schema";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import { queryResource, getResourceById } from "~/server/services/query.service";
import { buildUserFilters } from "~/server/data-sources";

export interface UserWithGroup {
  userId: string;
  displayName: string;
  email?: string;
  phone?: string;
  image?: string;
  userType: "MEMBER" | "LEAD";
  isAdmin: boolean;
  locationId?: string;
  createdAt: string;
  updatedAt: string;
  activeLocationId?: string;
  groups: Array<{
    groupId: string;
    groupType: GroupType;
    groupName?: string;
  }>;
}

export async function getUsersForActiveLocation(): Promise<ApiResult<UserWithGroup[]>> {
  try {
    const session = await getSessionInfo();
    const currentUserId = session.userId!;
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return {
        success: false,
        error: "No active location selected. Please select a location first."
      };
    }

    const locationId = currentUser.activeLocationId;

    const locationUsers = await getUsersForLocation(locationId);

    const enrichedUsers: UserWithGroup[] = [];

    for (const { userId } of locationUsers) {
      const user = await getUserById(userId);
      if (!user) continue;

      const userGroups = await getUserGroupsForUser(userId, locationId);

      enrichedUsers.push({
        userId: user.userId,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        image: user.image,
        userType: user.userType,
        isAdmin: user.isAdmin,
        locationId: user.locationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        activeLocationId: user.activeLocationId,
        groups: userGroups.map((g) => ({
          groupId: g.groupId,
          groupType: g.groupType,
          groupName: g.groupName,
        })),
      });
    }

    return { success: true, data: enrichedUsers };
  } catch (error) {
    console.error("[getUsersForActiveLocation] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users"
    };
  }
}

export async function assignUsersToGroup(
  userIds: string[],
  groupType: GroupType
): Promise<ApiResult<{ assigned: number; failed: number; errors: string[] }>> {
  try {
    const session = await getSessionInfo();
    const currentUserId = session.userId!;
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return {
        success: false,
        error: "No active location selected. Please select a location first."
      };
    }

    const locationId = currentUser.activeLocationId;

    const { getGroupsForLocation } = await import("~/server/db/repositories/userGroup.repository");

    const groups = await getGroupsForLocation(locationId, groupType);

    if (!groups || groups.length === 0) {
      return {
        success: false,
        error: `No ${groupType} group found for this location. Please create groups first.`,
      };
    }

    const targetGroup = groups[0];
    const groupId = targetGroup.groupId;

    let assigned = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        await addUserToGroup(userId, groupId, {
          locationId,
          groupType,
          groupName: targetGroup.name,
        });
        assigned++;
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`User ${userId}: ${errorMsg}`);
        console.error(`[assignUsersToGroup] Failed for user ${userId}:`, error);
      }
    }

    return {
      success: true,
      data: { assigned, failed, errors },
    };
  } catch (error) {
    console.error("[assignUsersToGroup] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign users to group"
    };
  }
}

export interface CreateUserInput {
  displayName: string;
  email?: string;
  phone?: string;
  userType: "MEMBER" | "LEAD";
  isAdmin: boolean;
  groupIds?: string[];
}

export async function createUserManual(input: CreateUserInput): Promise<ApiResult<UserWithGroup>> {
  try {
    const session = await getSessionInfo();
    const currentUserId = session.userId!;
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return {
        success: false,
        error: "No active location selected. Please select a location first."
      };
    }

    const locationId = currentUser.activeLocationId;

    const user = await createUser({
      displayName: input.displayName,
      email: input.email,
      userType: input.userType,
      isAdmin: input.isAdmin,
    });

    if (input.email) {
      await createEmailIdentity({ email: input.email.toLowerCase(), userId: user.userId });
    }

    await addUserToLocation(user.userId, locationId, { userDisplayName: user.displayName, userType: user.userType });

    if (input.groupIds && input.groupIds.length > 0) {
      for (const groupId of input.groupIds) {
        await addUserToGroup(user.userId, groupId, { locationId, userDisplayName: user.displayName });
      }
    }

    const userGroups = await getUserGroupsForUser(user.userId, locationId);

    return {
      success: true,
      data: {
        ...user,
        locationId,
        groups: userGroups.map((g) => ({ groupId: g.groupId, groupType: g.groupType, groupName: g.groupName })),
      },
    };
  } catch (error) {
    console.error("[createUserManual] Failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" };
  }
}

export interface ImportUsersInput {
  csvData: string;
}

export async function importUsersFromCSV(input: ImportUsersInput): Promise<ApiResult<{ imported: number; failed: number; errors: string[] }>> {
  try {
    const session = await getSessionInfo();
    const currentUserId = session.userId!;
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return { success: false, error: "No active location selected. Please select a location first." };
    }

    const locationId = currentUser.activeLocationId;

    const lines = input.csvData.trim().split('\n');
    if (lines.length < 2) return { success: false, error: "CSV file must have at least a header row and one data row" };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: Array<Record<string,string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string,string> = {};
      headers.forEach((header, idx) => row[header] = values[idx] || '');
      rows.push(row);
    }

    const findField = (row: Record<string,string>, ...candidates: string[]) => {
      for (const c of candidates) {
        const v = row[c];
        if (v && v.length > 0) return v;
      }
      return undefined;
    };

    let imported = 0; let failed = 0; const errors: string[] = [];
    for (const row of rows) {
      try {
        const displayName = findField(row, 'name', 'full_name', 'user_name', 'fullname', 'username', 'display_name');
        const email = findField(row, 'email', 'mail', 'email_id', 'emailaddress', 'email address');
        if (!displayName) { failed++; errors.push(`Row ${rows.indexOf(row) + 2}: Missing name field`); continue; }

        const user = await createUser({ displayName, email, userType: 'MEMBER', isAdmin: false });
        if (email) await createEmailIdentity({ email: email.toLowerCase(), userId: user.userId });
        await addUserToLocation(user.userId, locationId, { userDisplayName: user.displayName, userType: 'MEMBER' });
        imported++;
      } catch (err) {
        failed++; errors.push(`Row ${rows.indexOf(row) + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return { success: true, data: { imported, failed, errors } };
  } catch (error) {
    console.error('[importUsersFromCSV] Failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to import users' };
  }
}

/**
 * ============================================================================
 * QUERY ABSTRACTION LAYER FUNCTIONS
 * ============================================================================
 * 
 * New functions that use the query abstraction layer for filtering,
 * sorting, and pagination. These replace ad-hoc list functions with
 * a unified, data-source-agnostic approach.
 */

/**
 * Query users with filters and pagination (DynamoDB-backed)
 * 
 * Uses the query abstraction layer for consistent API.
 * Supports:
 * - Filtering by userType, isAdmin, activeLocationId, locationId, createdAt, updatedAt
 * - Cursor-based pagination
 * - Validates filters against whitelist
 * 
 * @param spec Query specification (filters, pagination)
 * @returns ApiResult with QueryResult (items, nextCursor, totalCount)
 * 
 * @example
 * ```typescript
 * const result = await queryUsers({
 *   filters: buildUserFilters().byUserType("Volunteer").build(),
 *   pagination: { mode: "cursor", limit: 50 }
 * });
 * ```
 */
export async function queryUsers(spec: QuerySpec): Promise<ApiResult<QueryResult<User>>> {
  try {
    return await queryResource<User>("users", spec);
  } catch (error) {
    console.error("[queryUsers] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to query users"
    };
  }
}

/**
 * Get users by user type (convenience wrapper)
 * 
 * Common use case: list all volunteers, leads, or partners.
 * 
 * @param userType The user type to filter by
 * @param limit Optional limit (default: 50)
 * @param cursor Optional cursor for pagination
 * @returns ApiResult with QueryResult
 */
export async function getUsersByType(
  userType: "Volunteer" | "Lead" | "Partner",
  limit = 50,
  cursor?: string
): Promise<ApiResult<QueryResult<User>>> {
  const filters = buildUserFilters().byUserType(userType).build();
  
  return queryUsers({
    filters,
    pagination: { mode: "cursor", limit, cursor },
  });
}

/**
 * Get users for a specific location (query abstraction version)
 * 
 * Uses location-user relationships to find all users at a location.
 * This queries the LOCATION#xxx -> USER#yyy edge records.
 * 
 * @param locationId Location ID to filter by
 * @param limit Optional limit (default: 100)
 * @param cursor Optional cursor for pagination (not implemented for relationship queries yet)
 * @returns ApiResult with QueryResult
 */
export async function queryUsersByLocation(
  locationId: string,
  limit = 100,
  cursor?: string
): Promise<ApiResult<QueryResult<User>>> {
  try {
    // Get user IDs from location-user relationships
    const locationUsers = await getUsersForLocation(locationId);
    
    // Fetch full user records for each userId
    const allUsers: User[] = [];
    for (const { userId } of locationUsers) {
      const user = await getUserById(userId);
      if (user) {
        allUsers.push(user);
      }
    }
    
    // Apply limit (simple pagination, no cursor support yet for relationship-based queries)
    const items = allUsers.slice(0, limit);
    
    return {
      success: true,
      data: {
        items,
        // No cursor pagination for relationship queries yet
        nextCursor: undefined,
      }
    };
  } catch (error) {
    console.error("[queryUsersByLocation] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to query users by location"
    };
  }
}

/**
 * Get admin users (query abstraction version)
 * 
 * @param limit Optional limit (default: 50)
 * @param cursor Optional cursor for pagination
 * @returns ApiResult with QueryResult
 */
export async function queryAdminUsers(
  limit = 50,
  cursor?: string
): Promise<ApiResult<QueryResult<User>>> {
  const filters = buildUserFilters().byAdmin(true).build();
  
  return queryUsers({
    filters,
    pagination: { mode: "cursor", limit, cursor },
  });
}

/**
 * Get users by ID (query abstraction version)
 * 
 * Optimized single-user lookup using getResourceById.
 * 
 * @param userId User ID
 * @returns ApiResult with User or null
 */
export async function queryUserById(userId: string): Promise<ApiResult<User | null>> {
  try {
    return await getResourceById<User>("users", userId);
  } catch (error) {
    console.error("[queryUserById] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get user"
    };
  }
}
