/**
 * UserGroup Repository
 * 
 * Data access layer for UserGroup entities and user-group memberships.
 * Handles ReBAC core: users belong to groups within locations.
 */

import { GetCommand, PutCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import {
  UserGroupSchema,
  UserGroupEdgeSchema,
  GroupUserEdgeSchema,
  type UserGroup,
  type CreateUserGroupInput,
  type UserGroupEdge,
  type GroupUserEdge,
  type GroupType,
} from "~/lib/schemas/db";

/**
 * Create a new user group.
 * 
 * @param input - Group data (locationId, groupType, name)
 * @returns Created UserGroup with generated groupId
 */
export async function createUserGroup(input: CreateUserGroupInput): Promise<UserGroup> {
  const groupId = ulid();
  const timestamp = now();

  const group: UserGroup = {
    PK: Keys.groupPK(groupId),
    SK: Keys.metaSK(),
    groupId,
    locationId: input.locationId,
    groupType: input.groupType,
    name: input.name,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const validated = UserGroupSchema.parse(group);

  // Create the location→group edge item
  const locationGroupEdge = {
    PK: Keys.locationPK(input.locationId),
    SK: Keys.groupSK(groupId),
    groupId,
    locationId: input.locationId,
    groupType: input.groupType,
    name: input.name,
    createdAt: timestamp,
  };

  try {
    // Atomically create both the group and the location→group edge
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: validated,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: locationGroupEdge,
            },
          },
        ],
      })
    );

    return validated;
  } catch (error) {
    console.error("[createUserGroup] Failed:", error);
    throw new Error(
      `Failed to create user group: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get user group by ID.
 * 
 * @param groupId - ULID of the group
 * @returns UserGroup or null if not found
 */
export async function getUserGroupById(groupId: string): Promise<UserGroup | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.groupPK(groupId),
          SK: Keys.metaSK(),
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return UserGroupSchema.parse(result.Item);
  } catch (error) {
    console.error("[getUserGroupById] Failed:", error);
    throw new Error(
      `Failed to get user group: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get all groups for a location using LOCATION→GROUP edges.
 * 
 * @param locationId - ULID of the location
 * @param groupType - Optional filter by group type
 * @returns Array of group edge items with group metadata
 */
export async function getGroupsForLocation(
  locationId: string,
  groupType?: GroupType
): Promise<Array<{ groupId: string; groupType: GroupType; name: string }>> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.locationPK(locationId),
          ":skPrefix": Keys.GROUP_PREFIX,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    // Filter by groupType if provided
    const groups = result.Items.map((item) => ({
      groupId: item.groupId as string,
      groupType: item.groupType as GroupType,
      name: item.name as string,
    }));

    if (groupType) {
      return groups.filter((g) => g.groupType === groupType);
    }

    return groups;
  } catch (error) {
    console.error("[getGroupsForLocation] Failed:", error);
    throw new Error(
      `Failed to get groups for location: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Add a user to a group.
 * 
 * Creates bidirectional edges atomically:
 * - USER#<userId> → GROUP#<groupId>
 * - GROUP#<groupId> → USER#<userId>
 * 
 * @param userId - ULID of the user
 * @param groupId - ULID of the group
 * @param options - Optional denormalized data for display
 */
export async function addUserToGroup(
  userId: string,
  groupId: string,
  options?: {
    locationId?: string;
    groupType?: GroupType;
    groupName?: string;
    userDisplayName?: string;
  }
): Promise<void> {
  const timestamp = now();

  // If locationId/groupType not provided, fetch the group
  let locationId = options?.locationId;
  let groupType = options?.groupType;
  let groupName = options?.groupName;

  if (!locationId || !groupType) {
    const group = await getUserGroupById(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    locationId = group.locationId;
    groupType = group.groupType;
    groupName = groupName || group.name;
  }

  const userGroupEdge: UserGroupEdge = {
    PK: Keys.userPK(userId),
    SK: Keys.groupSK(groupId),
    userId,
    groupId,
    locationId,
    groupType,
    groupName,
    joinedAt: timestamp,
  };

  const groupUserEdge: GroupUserEdge = {
    PK: Keys.groupPK(groupId),
    SK: Keys.userSK(userId),
    groupId,
    userId,
    userDisplayName: options?.userDisplayName,
    joinedAt: timestamp,
  };

  const validatedUserGroupEdge = UserGroupEdgeSchema.parse(userGroupEdge);
  const validatedGroupUserEdge = GroupUserEdgeSchema.parse(groupUserEdge);

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: validatedUserGroupEdge,
              ConditionExpression: "attribute_not_exists(PK) OR attribute_not_exists(SK)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: validatedGroupUserEdge,
              ConditionExpression: "attribute_not_exists(PK) OR attribute_not_exists(SK)",
            },
          },
        ],
      })
    );
  } catch (error) {
    console.error("[addUserToGroup] Failed:", error);
    throw new Error(
      `Failed to add user to group: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get all groups for a user (optionally filtered by location).
 * 
 * Query pattern: Query(PK="USER#<userId>", SK begins_with "GROUP#")
 * 
 * @param userId - ULID of the user
 * @param locationId - Optional location filter
 * @returns Array of group memberships
 */
export async function getUserGroupsForUser(
  userId: string,
  locationId?: string
): Promise<Array<{ groupId: string; locationId: string; groupType: GroupType; groupName?: string; joinedAt: string }>> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.userPK(userId),
          ":skPrefix": Keys.GROUP_PREFIX,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const edges = result.Items.map((item) => UserGroupEdgeSchema.parse(item));

    // Filter by location if specified
    const filtered = locationId
      ? edges.filter((edge) => edge.locationId === locationId)
      : edges;

    return filtered.map((edge) => ({
      groupId: edge.groupId,
      locationId: edge.locationId,
      groupType: edge.groupType,
      groupName: edge.groupName,
      joinedAt: edge.joinedAt,
    }));
  } catch (error) {
    console.error("[getUserGroupsForUser] Failed:", error);
    throw new Error(
      `Failed to get groups for user: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if a user is a teacher or volunteer in a location.
 * 
 * @param userId - ULID of the user
 * @param locationId - ULID of the location
 * @returns Object with isTeacher and isVolunteer booleans
 */
export async function isUserTeacherOrVolunteer(
  userId: string,
  locationId: string
): Promise<{ isTeacher: boolean; isVolunteer: boolean }> {
  const groups = await getUserGroupsForUser(userId, locationId);

  const isTeacher = groups.some((g) => g.groupType === "TEACHER");
  const isVolunteer = groups.some((g) => g.groupType === "VOLUNTEER");

  return { isTeacher, isVolunteer };
}
