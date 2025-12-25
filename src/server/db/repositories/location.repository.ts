/**
 * Location Repository
 * 
 * Data access layer for Location entities in DynamoDB.
 * Implements single-table design with lookup items for locationCode uniqueness.
 * 
 * Key Patterns:
 * - Location item: PK = "LOCATION#<locationId>", SK = "META"
 * - Lookup item: PK = "LOCATION_CODE#<locationCode>", SK = "META"
 * 
 * Uniqueness Enforcement:
 * Location codes are unique across all locations. This is enforced using a
 * TransactWrite that atomically creates both the Location item and a lookup item.
 * If the lookup item already exists, the transaction fails.
 * 
 * See docs/ACCESS_PATTERNS.md for detailed access pattern documentation.
 */

import {
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, Keys, now } from "~/server/db/client";
import {
  LocationSchema,
  LocationCodeLookupSchema,
  type Location,
  type LocationCodeLookup,
} from "~/lib/schemas/db/location.schema";
import type { CreateInput, UpdateInput } from "~/lib/schemas/db/schema-helpers";

/**
 * Input type for creating a new location.
 * Omits auto-generated fields: PK, SK, itemType, locationId, createdAt, updatedAt.
 */
export type CreateLocationInput = CreateInput<typeof LocationSchema, "locationId">;

/**
 * Input type for updating an existing location.
 * All fields are optional. ID fields and createdAt are not updatable.
 */
export type UpdateLocationInput = UpdateInput<typeof LocationSchema, "locationId">;

/**
 * Creates a new location with atomic uniqueness enforcement.
 * 
 * Uses TransactWrite to atomically:
 * 1. Create the Location item
 * 2. Create the LocationCodeLookup item (for uniqueness)
 * 
 * If the locationCode already exists, the transaction fails.
 * 
 * @param input - Location data (without auto-generated fields)
 * @returns The created Location
 * @throws Error if locationCode is already taken or validation fails
 */
export async function createLocation(input: CreateLocationInput): Promise<Location> {
  // Generate ULID for the new location
  const locationId = ulid();
  const timestamp = now();

  // Build the full location object
  const location: Location = {
    PK: Keys.locationPK(locationId),
    SK: Keys.locationSK(),
    itemType: "Location",
    locationId,
    locationCode: input.locationCode,
    name: input.name,
    placeId: input.placeId,
    formattedAddress: input.formattedAddress,
    addressComponents: input.addressComponents,
    lat: input.lat,
    lng: input.lng,
    status: input.status ?? "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate the location against the DB schema
  const validatedLocation = LocationSchema.parse(location);

  // Build the lookup item for locationCode uniqueness
  const lookupItem: LocationCodeLookup = {
    PK: Keys.locationCodePK(input.locationCode),
    SK: Keys.locationCodeSK(),
    itemType: "LocationCodeLookup",
    locationId,
    locationCode: input.locationCode,
    createdAt: timestamp,
  };

  // Validate the lookup item
  LocationCodeLookupSchema.parse(lookupItem);

  try {
    // Atomic transaction: create both items with uniqueness conditions
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // Create the Location item
            Put: {
              TableName: TABLE_NAME,
              Item: validatedLocation,
              // Fail if location already exists (shouldn't happen with ULID)
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            // Create the lookup item (enforces locationCode uniqueness)
            Put: {
              TableName: TABLE_NAME,
              Item: lookupItem,
              // Fail if locationCode is already taken
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      })
    );

    return validatedLocation;
  } catch (error: unknown) {
    // Handle transaction cancellation (e.g., duplicate locationCode)
    if (
      error instanceof Error &&
      error.name === "TransactionCanceledException"
    ) {
      // Check if it's a ConditionalCheckFailed on the lookup item
      const message = error.message || "";
      if (message.includes("ConditionalCheckFailed")) {
        throw new Error(
          `Location code "${input.locationCode}" is already taken. Please choose a different code.`
        );
      }
    }

    // Re-throw with context
    console.error("[createLocation] Transaction failed:", error);
    throw new Error(
      `Failed to create location: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Retrieves a location by its ID.
 * 
 * @param locationId - ULID of the location
 * @returns The Location or null if not found
 */
export async function getLocationById(locationId: string): Promise<Location | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.locationPK(locationId),
          SK: Keys.locationSK(),
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    // Validate the retrieved item against the schema
    return LocationSchema.parse(result.Item);
  } catch (error) {
    console.error("[getLocationById] Failed:", error);
    throw new Error(
      `Failed to get location: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Retrieves a location by its human-readable code.
 * 
 * Uses a two-step lookup:
 * 1. Fetch the lookup item to get the locationId
 * 2. Fetch the Location item using the locationId
 * 
 * @param locationCode - Human-readable location code
 * @returns The Location or null if not found
 */
export async function getLocationByCode(locationCode: string): Promise<Location | null> {
  try {
    // Step 1: Get the lookup item
    const lookupResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.locationCodePK(locationCode),
          SK: Keys.locationCodeSK(),
        },
      })
    );

    if (!lookupResult.Item) {
      return null;
    }

    // Validate and extract locationId
    const lookup = LocationCodeLookupSchema.parse(lookupResult.Item);

    // Step 2: Get the actual location
    return getLocationById(lookup.locationId);
  } catch (error) {
    console.error("[getLocationByCode] Failed:", error);
    throw new Error(
      `Failed to get location by code: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Lists all locations.
 * 
 * Uses Scan with FilterExpression to return only Location items.
 * This is safe for small datasets but should be paginated for large ones.
 * 
 * NOTE: For production with many locations, implement pagination using
 * LastEvaluatedKey and ExclusiveStartKey. Consider caching or GSI for
 * high-volume read patterns.
 * 
 * @returns Array of all Location items
 */
export async function listLocations(): Promise<Location[]> {
  try {
    const locations: Location[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    // Paginate through all results
    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "itemType = :type",
          ExpressionAttributeValues: {
            ":type": "Location",
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      // Validate and collect items
      if (result.Items) {
        for (const item of result.Items) {
          try {
            const location = LocationSchema.parse(item);
            locations.push(location);
          } catch (validationError) {
            console.warn("[listLocations] Skipping invalid item:", validationError);
          }
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    // Sort by createdAt descending (newest first)
    return locations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("[listLocations] Failed:", error);
    throw new Error(
      `Failed to list locations: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Soft-deletes a location by setting status to "inactive".
 * 
 * The location remains in the database but is marked as inactive.
 * The locationCode lookup item is NOT removed, preventing reuse of the code.
 * 
 * TODO: Consider whether to remove lookup item to allow code reuse.
 * 
 * @param locationId - ULID of the location to soft-delete
 */
export async function softDeleteLocation(locationId: string): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.locationPK(locationId),
          SK: Keys.locationSK(),
        },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "inactive",
          ":updatedAt": now(),
        },
        ConditionExpression: "attribute_exists(PK)",
      })
    );
  } catch (error) {
    console.error("[softDeleteLocation] Failed:", error);
    throw new Error(
      `Failed to delete location: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Updates a location's mutable fields.
 * 
 * Only name and status can be updated. Address/geo data is immutable
 * after creation (tied to the original Google Places selection).
 * 
 * @param locationId - ULID of the location to update
 * @param input - Fields to update
 * @returns The updated Location
 */
export async function updateLocation(
  locationId: string,
  input: UpdateLocationInput
): Promise<Location | null> {
  // Build update expression dynamically based on provided fields
  const updates: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updates.push("#name = :name");
    expressionNames["#name"] = "name";
    expressionValues[":name"] = input.name;
  }

  if (input.status !== undefined) {
    updates.push("#status = :status");
    expressionNames["#status"] = "status";
    expressionValues[":status"] = input.status;
  }

  // Allow updating address/place fields if provided
  if (input.placeId !== undefined) {
    updates.push("placeId = :placeId");
    expressionValues[":placeId"] = input.placeId;
  }

  if (input.formattedAddress !== undefined) {
    updates.push("formattedAddress = :formattedAddress");
    expressionValues[":formattedAddress"] = input.formattedAddress;
  }

  if (input.addressComponents !== undefined) {
    updates.push("addressComponents = :addressComponents");
    expressionValues[":addressComponents"] = input.addressComponents;
  }

  if (input.lat !== undefined) {
    updates.push("lat = :lat");
    expressionValues[":lat"] = input.lat;
  }

  if (input.lng !== undefined) {
    updates.push("lng = :lng");
    expressionValues[":lng"] = input.lng;
  }

  if (updates.length === 0) {
    // Nothing to update, return current location
    return getLocationById(locationId);
  }

  // Always update the updatedAt timestamp
  updates.push("updatedAt = :updatedAt");
  expressionValues[":updatedAt"] = now();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: Keys.locationPK(locationId),
          SK: Keys.locationSK(),
        },
        UpdateExpression: `SET ${updates.join(", ")}`,
        ExpressionAttributeNames:
          Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: "attribute_exists(PK)",
        ReturnValues: "ALL_NEW",
      })
    );

    if (!result.Attributes) {
      return null;
    }

    return LocationSchema.parse(result.Attributes);
  } catch (error) {
    console.error("[updateLocation] Failed:", error);
    throw new Error(
      `Failed to update location: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
