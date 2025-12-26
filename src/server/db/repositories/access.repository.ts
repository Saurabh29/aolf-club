/**
 * Access Control Logic
 * 
 * CANONICAL ACCESS-CHECK FUNCTION
 * 
 * This is the SINGLE source of truth for page access control.
 * NO permission logic should exist elsewhere in the application.
 * 
 * Flow:
 * 1. Get user's groups in the specified location
 * 2. Get roles for those groups
 * 3. Check each role's permission for the page
 * 4. Return true if ANY role ALLOWs access
 */

import { getUserGroupsForUser } from "./userGroup.repository";
import { getRolesForGroup, canRoleAccessPage } from "./permission.repository";

/**
 * Check if a user can access a page in a location.
 * 
 * This is the canonical access-check function. All page-level authorization
 * must go through this function.
 * 
 * Algorithm:
 * 1. Query user's groups in the location
 * 2. For each group, query assigned roles
 * 3. For each role, check page permission
 * 4. Return true if ANY role has ALLOW permission
 * 
 * @param userId - ULID of the user
 * @param locationId - ULID of the location
 * @param pageName - Name of the page to check
 * @returns true if user can access the page, false otherwise
 */
export async function canUserAccessPage(
  userId: string,
  locationId: string,
  pageName: string
): Promise<boolean> {
  try {
    // Step 1: Get user's groups in this location
    const userGroups = await getUserGroupsForUser(userId, locationId);

    if (userGroups.length === 0) {
      return false; // User has no groups in this location
    }

    // Step 2: Collect all roles from user's groups
    const roleSet = new Set<string>();

    for (const group of userGroups) {
      const roles = await getRolesForGroup(group.groupId);
      roles.forEach((role) => roleSet.add(role));
    }

    if (roleSet.size === 0) {
      return false; // User's groups have no roles
    }

    // Step 3: Check if ANY role allows access to the page
    for (const roleName of roleSet) {
      const hasAccess = await canRoleAccessPage(roleName, pageName);
      if (hasAccess) {
        return true; // Early return on first ALLOW
      }
    }

    // No role allowed access
    return false;
  } catch (error) {
    console.error("[canUserAccessPage] Failed:", error);
    // Fail closed: deny access on error
    return false;
  }
}

/**
 * Check if a user can access a page in ANY location they belong to.
 * 
 * Less common use case: check if user has permission across all their locations.
 * 
 * @param userId - ULID of the user
 * @param pageName - Name of the page to check
 * @returns true if user can access the page in at least one location
 */
export async function canUserAccessPageAnyLocation(
  userId: string,
  pageName: string
): Promise<boolean> {
  try {
    // Get all groups for user (no location filter)
    const userGroups = await getUserGroupsForUser(userId);

    if (userGroups.length === 0) {
      return false;
    }

    // Collect all roles
    const roleSet = new Set<string>();

    for (const group of userGroups) {
      const roles = await getRolesForGroup(group.groupId);
      roles.forEach((role) => roleSet.add(role));
    }

    if (roleSet.size === 0) {
      return false;
    }

    // Check if ANY role allows access
    for (const roleName of roleSet) {
      const hasAccess = await canRoleAccessPage(roleName, pageName);
      if (hasAccess) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("[canUserAccessPageAnyLocation] Failed:", error);
    return false;
  }
}

/**
 * Get all pages a user can access in a location.
 * 
 * Useful for generating navigation menus or dashboards.
 * 
 * @param userId - ULID of the user
 * @param locationId - ULID of the location
 * @param candidatePages - List of page names to check
 * @returns Array of page names the user can access
 */
export async function getAccessiblePages(
  userId: string,
  locationId: string,
  candidatePages: string[]
): Promise<string[]> {
  const accessible: string[] = [];

  for (const pageName of candidatePages) {
    const hasAccess = await canUserAccessPage(userId, locationId, pageName);
    if (hasAccess) {
      accessible.push(pageName);
    }
  }

  return accessible;
}
