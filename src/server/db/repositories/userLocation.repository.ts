/**
 * User-Location Membership Repository
 * 
 * Manages bidirectional user ↔ location relationships.
 * Supports queries: "get all locations for user" and "get all users in location".
 */

import { QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import {
  UserLocationEdgeSchema,
  LocationUserEdgeSchema,
  type UserLocationEdge,
  type LocationUserEdge,
} from "~/lib/schemas/db";

/**
 * Add a user to a location.
 * 
 * Creates bidirectional edges atomically:
 * - USER#<userId> → LOCATION#<locationId>
 * - LOCATION#<locationId> → USER#<userId>
 * 
 * @param userId - ULID of the user
 * @param locationId - ULID of the location
 * @param options - Optional denormalized data for display
 */
export async function addUserToLocation(
  userId: string,
  locationId: string,
  options?: {
    userDisplayName?: string;
    userType?: "MEMBER" | "LEAD";
    locationCode?: string;
    locationName?: string;
  }
): Promise<void> {
  const timestamp = now();

  const userLocationEdge: UserLocationEdge = {
    PK: Keys.userPK(userId),
    SK: Keys.locationSK(locationId),
    userId,
    locationId,
    locationCode: options?.locationCode,
    locationName: options?.locationName,
    joinedAt: timestamp,
  };

  const locationUserEdge: LocationUserEdge = {
    PK: Keys.locationPK(locationId),
    SK: Keys.userSK(userId),
    locationId,
    userId,
    userDisplayName: options?.userDisplayName,
    userType: options?.userType,
    joinedAt: timestamp,
  };

  const validatedUserLocationEdge = UserLocationEdgeSchema.parse(userLocationEdge);
  const validatedLocationUserEdge = LocationUserEdgeSchema.parse(locationUserEdge);

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: validatedUserLocationEdge,
              ConditionExpression: "attribute_not_exists(PK) OR attribute_not_exists(SK)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: validatedLocationUserEdge,
              ConditionExpression: "attribute_not_exists(PK) OR attribute_not_exists(SK)",
            },
          },
        ],
      })
    );
  } catch (error) {
    console.error("[addUserToLocation] Failed:", error);
    throw new Error(
      `Failed to add user to location: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get all locations for a user.
 * 
 * Query pattern: Query(PK="USER#<userId>", SK begins_with "LOCATION#")
 * 
 * @param userId - ULID of the user
 * @returns Array of location IDs with optional denormalized data
 */
export async function getLocationsForUser(
  userId: string
): Promise<Array<{ locationId: string; locationCode?: string; locationName?: string; joinedAt: string }>> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.userPK(userId),
          ":skPrefix": Keys.LOCATION_PREFIX,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => {
      const edge = UserLocationEdgeSchema.parse(item);
      return {
        locationId: edge.locationId,
        locationCode: edge.locationCode,
        locationName: edge.locationName,
        joinedAt: edge.joinedAt,
      };
    });
  } catch (error) {
    console.error("[getLocationsForUser] Failed:", error);
    throw new Error(
      `Failed to get locations for user: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get all users in a location.
 * 
 * Query pattern: Query(PK="LOCATION#<locationId>", SK begins_with "USER#")
 * 
 * @param locationId - ULID of the location
 * @returns Array of user IDs with optional denormalized data
 */
export async function getUsersForLocation(
  locationId: string
): Promise<Array<{ userId: string; userDisplayName?: string; userType?: "MEMBER" | "LEAD"; joinedAt: string }>> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": Keys.locationPK(locationId),
          ":skPrefix": Keys.USER_PREFIX,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => {
      const edge = LocationUserEdgeSchema.parse(item);
      return {
        userId: edge.userId,
        userDisplayName: edge.userDisplayName,
        userType: edge.userType,
        joinedAt: edge.joinedAt,
      };
    });
  } catch (error) {
    console.error("[getUsersForLocation] Failed:", error);
    throw new Error(
      `Failed to get users for location: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
