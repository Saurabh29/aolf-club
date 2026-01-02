"use server";

/**
 * User Management Server Actions
 * 
 * Server actions for user list, import, create, update operations.
 * All actions return { success: boolean, data?: T, error?: string }
 */

import { getCurrentUserId } from "~/lib/auth"; 
import { getUserById, createUser } from "~/server/db/repositories/user.repository";
import { getUsersForLocation, addUserToLocation } from "~/server/db/repositories/userLocation.repository";
import { getUserGroupsForUser, addUserToGroup } from "~/server/db/repositories/userGroup.repository";
import { createEmailIdentity } from "~/server/db/repositories/email.repository";
import type { GroupType } from "~/lib/schemas/db/types";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Extended user view model with group information for the user table
 */
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
  // Group information for display
  groups: Array<{
    groupId: string;
    groupType: GroupType;
    groupName?: string;
  }>;
}

/**
 * Fetch all users for the current user's active location.
 * Returns users enriched with their group memberships.
 * 
 * No Scan - uses Query on location PK to get all users in location,
 * then enriches each with group data via Query on user PK.
 */
export async function getUsersForActiveLocation(): Promise<ActionResult<UserWithGroup[]>> {
  "use server";

  try {
    // Get current user to determine active location
    const currentUserId = await getCurrentUserId();
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return {
        success: false,
        error: "No active location selected. Please select a location first."
      };
    }

    const locationId = currentUser.activeLocationId;

    // Query: Get all users in this location
    // Uses PK=LOCATION#<locationId>, SK begins_with USER#
    const locationUsers = await getUsersForLocation(locationId);

    // Enrich each user with full user data and group memberships
    const enrichedUsers: UserWithGroup[] = [];

    for (const { userId } of locationUsers) {
      const user = await getUserById(userId);
      if (!user) continue;

      // Get user's groups for this location
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

/**
 * Create a new user manually and associate with active location
 */
export interface CreateUserInput {
  displayName: string;
  email?: string;
  phone?: string;
  userType: "MEMBER" | "LEAD";
  isAdmin: boolean;
  groupIds?: string[];
}

export async function createUserManual(input: CreateUserInput): Promise<ActionResult<UserWithGroup>> {
  "use server";

  try {
    // Get current user's active location
    const currentUserId = await getCurrentUserId();
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return {
        success: false,
        error: "No active location selected. Please select a location first."
      };
    }

    const locationId = currentUser.activeLocationId;

    // Create the user
    const user = await createUser({
      displayName: input.displayName,
      email: input.email,
      userType: input.userType,
      isAdmin: input.isAdmin,
    });

    // Create email identity mapping if email provided
    if (input.email) {
      await createEmailIdentity({
        email: input.email.toLowerCase(),
        userId: user.userId,
      });
    }

    // Associate user with location
    await addUserToLocation(user.userId, locationId, {
      userDisplayName: user.displayName,
      userType: user.userType,
    });

    // Add to groups if specified
    if (input.groupIds && input.groupIds.length > 0) {
      for (const groupId of input.groupIds) {
        await addUserToGroup(user.userId, groupId, {
          locationId,
          userDisplayName: user.displayName,
        });
      }
    }

    // Fetch groups for response
    const userGroups = await getUserGroupsForUser(user.userId, locationId);

    return {
      success: true,
      data: {
        ...user,
        locationId,
        groups: userGroups.map((g) => ({
          groupId: g.groupId,
          groupType: g.groupType,
          groupName: g.groupName,
        })),
      },
    };
  } catch (error) {
    console.error("[createUserManual] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user"
    };
  }
}

/**
 * CSV row with flexible field names
 */
interface CSVRow {
  [key: string]: string;
}

/**
 * Import multiple users from CSV data
 */
export interface ImportUsersInput {
  csvData: string; // CSV content as string
}

export async function importUsersFromCSV(input: ImportUsersInput): Promise<ActionResult<{ imported: number; failed: number; errors: string[] }>> {
  "use server";

  try {
    // Get current user's active location
    const currentUserId = await getCurrentUserId();
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return {
        success: false,
        error: "No active location selected. Please select a location first."
      };
    }

    const locationId = currentUser.activeLocationId;

    // Parse CSV (simple implementation)
    const lines = input.csvData.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: "CSV file must have at least a header row and one data row" };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    // Fuzzy field matching
    const findField = (row: CSVRow, ...candidates: string[]): string | undefined => {
      for (const candidate of candidates) {
        const value = row[candidate];
        if (value && value.length > 0) return value;
      }
      return undefined;
    };

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const displayName = findField(row, 'name', 'full_name', 'user_name', 'fullname', 'username', 'display_name');
        const email = findField(row, 'email', 'mail', 'email_id', 'emailaddress', 'email address');
        const phone = findField(row, 'phone', 'mobile', 'contact', 'phone_number', 'phonenumber');

        if (!displayName) {
          failed++;
          errors.push(`Row ${rows.indexOf(row) + 2}: Missing name field`);
          continue;
        }

        // Create user
        const user = await createUser({
          displayName,
          email,
          userType: "MEMBER", // Default to MEMBER for CSV imports
          isAdmin: false,
        });

        // Create email identity if email provided
        if (email) {
          await createEmailIdentity({
            email: email.toLowerCase(),
            userId: user.userId,
          });
        }

        // Associate with location
        await addUserToLocation(user.userId, locationId, {
          userDisplayName: user.displayName,
          userType: "MEMBER",
        });

        imported++;
      } catch (error) {
        failed++;
        errors.push(`Row ${rows.indexOf(row) + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      data: { imported, failed, errors },
    };
  } catch (error) {
    console.error("[importUsersFromCSV] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import users"
    };
  }
}

/**
 * Assign multiple users to a group by group type (Admin, Teacher, Volunteer).
 * 
 * @param userIds - Array of user IDs to assign
 * @param groupType - Group type: "ADMIN", "TEACHER", or "VOLUNTEER"
 * @returns ActionResult with count of successful assignments
 */
export async function assignUsersToGroup(
  userIds: string[],
  groupType: GroupType
): Promise<ActionResult<{ assigned: number; failed: number; errors: string[] }>> {
  "use server";

  try {
    // Get current user's active location
    const currentUserId = await getCurrentUserId();
    const currentUser = await getUserById(currentUserId);

    if (!currentUser || !currentUser.activeLocationId) {
      return {
        success: false,
        error: "No active location selected. Please select a location first."
      };
    }

    const locationId = currentUser.activeLocationId;

    // Import repository to find groups by location and type
    const { getGroupsForLocation } = await import("~/server/db/repositories/userGroup.repository");

    // Query for groups with the specified type for this location
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
        // Add user to group
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

