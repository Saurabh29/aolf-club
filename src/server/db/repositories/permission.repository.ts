/**
 * Role and Permission Repository
 * 
 * Manages roles, pages, and permission mappings.
 * Supports data-driven permission control (no hardcoded logic).
 */

import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import {
  RoleSchema,
  PageSchema,
  GroupRoleEdgeSchema,
  RolePagePermissionSchema,
  type Role,
  type Page,
  type GroupRoleEdge,
  type RolePagePermission,
  type CreateRoleInput,
  type CreatePageInput,
  type Permission,
} from "~/lib/schemas/db";

// ============================================================================
// ROLE MANAGEMENT
// ============================================================================

/**
 * Create a new role.
 * 
 * @param input - Role data
 * @returns Created Role
 */
export async function createRole(input: CreateRoleInput): Promise<Role> {
  const timestamp = now();

  const role: Role = {
    PK: Keys.rolePK(input.roleName),
    SK: Keys.metaSK(),
    roleName: input.roleName,
    description: input.description,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const validated = RoleSchema.parse(role);

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: validated,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    return validated;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      throw new Error(`Role "${input.roleName}" already exists.`);
    }
    console.error("[createRole] Failed:", error);
    throw new Error(
      `Failed to create role: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get role by name.
 * 
 * @param roleName - Name of the role
 * @returns Role or null if not found
 */
export async function getRoleByName(roleName: string): Promise<Role | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.rolePK(roleName),
          SK: Keys.metaSK(),
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return RoleSchema.parse(result.Item);
  } catch (error) {
    console.error("[getRoleByName] Failed:", error);
    throw new Error(
      `Failed to get role: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================================================
// PAGE MANAGEMENT
// ============================================================================

/**
 * Create a new page.
 * 
 * @param input - Page data
 * @returns Created Page
 */
export async function createPage(input: CreatePageInput): Promise<Page> {
  const timestamp = now();

  const page: Page = {
    PK: Keys.pagePK(input.pageName),
    SK: Keys.metaSK(),
    pageName: input.pageName,
    description: input.description,
    createdAt: timestamp,
  };

  const validated = PageSchema.parse(page);

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: validated,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    return validated;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      throw new Error(`Page "${input.pageName}" already exists.`);
    }
    console.error("[createPage] Failed:", error);
    throw new Error(
      `Failed to create page: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get page by name.
 * 
 * @param pageName - Name of the page
 * @returns Page or null if not found
 */
export async function getPageByName(pageName: string): Promise<Page | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.pagePK(pageName),
          SK: Keys.metaSK(),
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return PageSchema.parse(result.Item);
  } catch (error) {
    console.error("[getPageByName] Failed:", error);
    throw new Error(
      `Failed to get page: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================================================
// GROUP → ROLE ASSIGNMENT
// ============================================================================

/**
 * Assign a role to a group.
 * 
 * @param groupId - ULID of the group
 * @param roleName - Name of the role
 */
export async function assignRoleToGroup(groupId: string, roleName: string): Promise<void> {
  const timestamp = now();

  const edge: GroupRoleEdge = {
    PK: Keys.groupPK(groupId),
    SK: Keys.roleSK(roleName),
    groupId,
    roleName,
    assignedAt: timestamp,
  };

  const validated = GroupRoleEdgeSchema.parse(edge);

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: validated,
      })
    );
  } catch (error) {
    console.error("[assignRoleToGroup] Failed:", error);
    throw new Error(
      `Failed to assign role to group: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get all roles for a group.
 * 
 * Query pattern: Query(PK="GROUP#<groupId>", SK begins_with "ROLE#")
 * 
 * @param groupId - ULID of the group
 * @returns Array of role names
 */
export async function getRolesForGroup(groupId: string): Promise<string[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.groupPK(groupId),
          ":skPrefix": Keys.ROLE_PREFIX,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => {
      const edge = GroupRoleEdgeSchema.parse(item);
      return edge.roleName;
    });
  } catch (error) {
    console.error("[getRolesForGroup] Failed:", error);
    throw new Error(
      `Failed to get roles for group: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================================================
// ROLE → PAGE PERMISSION
// ============================================================================

/**
 * Set page permission for a role.
 * 
 * @param roleName - Name of the role
 * @param pageName - Name of the page
 * @param permission - ALLOW or DENY
 */
export async function setRolePagePermission(
  roleName: string,
  pageName: string,
  permission: Permission
): Promise<void> {
  const timestamp = now();

  const perm: RolePagePermission = {
    PK: Keys.rolePK(roleName),
    SK: Keys.pageSK(pageName),
    roleName,
    pageName,
    permission,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const validated = RolePagePermissionSchema.parse(perm);

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: validated,
      })
    );
  } catch (error) {
    console.error("[setRolePagePermission] Failed:", error);
    throw new Error(
      `Failed to set page permission: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if a role can access a page.
 * 
 * GetItem pattern: GetItem(PK="ROLE#<roleName>", SK="PAGE#<pageName>")
 * 
 * @param roleName - Name of the role
 * @param pageName - Name of the page
 * @returns true if ALLOW, false otherwise
 */
export async function canRoleAccessPage(roleName: string, pageName: string): Promise<boolean> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.rolePK(roleName),
          SK: Keys.pageSK(pageName),
        },
      })
    );

    if (!result.Item) {
      return false;
    }

    const permission = RolePagePermissionSchema.parse(result.Item);
    return permission.permission === "ALLOW";
  } catch (error) {
    console.error("[canRoleAccessPage] Failed:", error);
    return false;
  }
}

/**
 * Get all page permissions for a role.
 * 
 * Query pattern: Query(PK="ROLE#<roleName>", SK begins_with "PAGE#")
 * 
 * @param roleName - Name of the role
 * @returns Array of page permissions
 */
export async function getPagePermissionsForRole(
  roleName: string
): Promise<Array<{ pageName: string; permission: Permission }>> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.rolePK(roleName),
          ":skPrefix": Keys.PAGE_PREFIX,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => {
      const perm = RolePagePermissionSchema.parse(item);
      return {
        pageName: perm.pageName,
        permission: perm.permission,
      };
    });
  } catch (error) {
    console.error("[getPagePermissionsForRole] Failed:", error);
    throw new Error(
      `Failed to get page permissions for role: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
