import {
  GetCommand,
  PutCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { docClient, TABLE_NAME, keys } from "../client";
import {
  LocationDbSchema,
  LocationDynamoItemSchema,
  CreateLocationInputSchema,
  type Location,
  type LocationDynamoItem,
  type CreateLocationInput,
  type LocationCodeLookupItem,
} from "~/lib/schemas/db/location.schema";

/**
 * Location Repository
 * 
 * Implements data access for Location entities using DynamoDB single-table design.
 * 
 * Key patterns:
 * - All IDs are ULIDs (not UUIDs)
 * - locationCode uniqueness enforced via lookup item + TransactWrite
 * - No GSIs - uses lookup items for secondary access patterns
 * 
 * Access patterns:
 * 1. Get location by ID: Direct get on LOCATION#<id>
 * 2. Get location by code: Get lookup item, then get location
 * 3. List locations: Scan with filter (suitable for small datasets)
 * 4. Create location: TransactWrite (location + lookup item)
 * 5. Soft delete: Update status to 'inactive'
 */

/**
 * Create a new location with atomic locationCode uniqueness enforcement
 * 
 * Uses TransactWrite to atomically:
 * 1. Create the Location item
 * 2. Create the locationCode lookup item
 * 
 * If the lookup item already exists, the transaction fails,
 * ensuring locationCode uniqueness without GSIs.
 * 
 * @param input - Location data (without locationId, timestamps)
 * @returns Created Location entity
 * @throws Error if locationCode already exists or validation fails
 */
export async function createLocation(input: CreateLocationInput): Promise<Location> {
  // Validate input with Zod schema
  const validatedInput = CreateLocationInputSchema.parse(input);

  // Generate ULID for locationId (server-side only)
  const locationId = ulid();
  const now = new Date().toISOString();

  // Build the full Location entity
  const location: Location = {
    ...validatedInput,
    locationId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  // Validate full entity with DB schema
  LocationDbSchema.parse(location);

  // Build DynamoDB item with PK/SK
  const locationKeys = keys.location(locationId);
  const locationItem: LocationDynamoItem = {
    ...location,
    ...locationKeys,
  };

  // Build lookup item for locationCode uniqueness
  const lookupKeys = keys.locationCodeLookup(validatedInput.locationCode);
  const lookupItem: LocationCodeLookupItem = {
    ...lookupKeys,
    locationId,
    locationCode: validatedInput.locationCode,
  };

  // TransactWrite: atomically create both items
  // Transaction fails if lookup item already exists (locationCode taken)
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // Create Location item
            Put: {
              TableName: TABLE_NAME,
              Item: locationItem,
              // Ensure location doesn't already exist
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            // Create lookup item for locationCode uniqueness
            Put: {
              TableName: TABLE_NAME,
              Item: lookupItem,
              // This fails if locationCode is already taken
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ],
      })
    );
  } catch (error: unknown) {
    // Handle TransactionCanceledException for duplicate locationCode
    if (
      error instanceof Error &&
      error.name === "TransactionCanceledException"
    ) {
      throw new Error(
        `Location code "${validatedInput.locationCode}" is already in use`
      );
    }
    throw error;
  }

  return location;
}

/**
 * Get a location by its ID
 * 
 * @param locationId - ULID of the location
 * @returns Location entity or null if not found
 */
export async function getLocationById(locationId: string): Promise<Location | null> {
  const locationKeys = keys.location(locationId);

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: locationKeys,
    })
  );

  if (!result.Item) {
    return null;
  }

  // Validate and strip DynamoDB keys
  const item = LocationDynamoItemSchema.parse(result.Item);
  const { PK, SK, ...location } = item;

  return location;
}

/**
 * Get a location by its human-friendly code
 * 
 * Two-step process:
 * 1. Get the lookup item to find locationId
 * 2. Get the actual location by ID
 * 
 * @param locationCode - Human-friendly location code
 * @returns Location entity or null if not found
 */
export async function getLocationByCode(locationCode: string): Promise<Location | null> {
  const lookupKeys = keys.locationCodeLookup(locationCode);

  // Step 1: Get lookup item
  const lookupResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: lookupKeys,
    })
  );

  if (!lookupResult.Item) {
    return null;
  }

  const lookupItem = lookupResult.Item as LocationCodeLookupItem;

  // Step 2: Get actual location
  return getLocationById(lookupItem.locationId);
}

/**
 * List all locations
 * 
 * WARNING: Uses Scan operation. Suitable for small datasets only.
 * For production with many locations, implement:
 * - Pagination with LastEvaluatedKey
 * - Consider sharding pattern (e.g., by region)
 * - Or use a dedicated listing GSI (though this repo avoids GSIs)
 * 
 * @param includeInactive - Whether to include soft-deleted locations
 * @returns Array of Location entities
 */
export async function listLocations(includeInactive = false): Promise<Location[]> {
  const filterExpression = includeInactive
    ? "begins_with(PK, :prefix)"
    : "begins_with(PK, :prefix) AND #status = :active";

  const expressionAttributeValues: Record<string, string> = {
    ":prefix": "LOCATION#",
  };

  if (!includeInactive) {
    expressionAttributeValues[":active"] = "active";
  }

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(includeInactive ? {} : { ExpressionAttributeNames: { "#status": "status" } }),
    })
  );

  if (!result.Items) {
    return [];
  }

  // Validate and transform items
  return result.Items.map((item: Record<string, unknown>) => {
    const validated = LocationDynamoItemSchema.parse(item);
    const { PK, SK, ...location } = validated;
    return location;
  });
}

/**
 * Soft-delete a location by setting status to 'inactive'
 * 
 * Optionally removes the lookup item to free up the locationCode.
 * Default behavior: keeps lookup item to prevent code reuse.
 * 
 * @param locationId - ULID of the location to delete
 * @param freeLocationCode - If true, removes lookup item allowing code reuse
 * @returns Updated Location entity or null if not found
 */
export async function softDeleteLocation(
  locationId: string,
  freeLocationCode = false
): Promise<Location | null> {
  // First, get the current location to find its code
  const existing = await getLocationById(locationId);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const locationKeys = keys.location(locationId);

  if (freeLocationCode) {
    // Use transaction to update status AND remove lookup item
    const lookupKeys = keys.locationCodeLookup(existing.locationCode);

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: locationKeys,
              UpdateExpression: "SET #status = :inactive, updatedAt = :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":inactive": "inactive",
                ":now": now,
              },
            },
          },
          {
            Delete: {
              TableName: TABLE_NAME,
              Key: lookupKeys,
            },
          },
        ],
      })
    );
  } else {
    // Just update status, keep lookup item
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: locationKeys,
        UpdateExpression: "SET #status = :inactive, updatedAt = :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":inactive": "inactive",
          ":now": now,
        },
      })
    );
  }

  return {
    ...existing,
    status: "inactive",
    updatedAt: now,
  };
}
