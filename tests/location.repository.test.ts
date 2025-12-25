import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Unit tests for Location Repository
 * 
 * Tests create success and duplicate code rejection.
 * 
 * Run with: pnpm test
 * 
 * Note: These tests require DynamoDB Local running.
 * For CI, use a mock or container setup.
 */

// Set environment before imports
process.env.DYNAMODB_LOCAL_ENDPOINT = "http://localhost:8000";
process.env.DYNAMODB_TABLE_NAME = "aolf-club-locations-test";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_ACCESS_KEY_ID = "local";
process.env.AWS_SECRET_ACCESS_KEY = "local";

import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  createLocation,
  getLocationById,
  getLocationByCode,
  listLocations,
} from "~/server/db/repositories/location.repository";
import type { CreateLocationInput } from "~/lib/schemas/db/location.schema";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

const TABLE_NAME = "aolf-club-locations-test";

async function setupTable() {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
        ],
        BillingMode: "PAY_PER_REQUEST",
      })
    );
    // Wait for table to be ready
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== "ResourceInUseException") {
      throw error;
    }
  }
}

async function teardownTable() {
  try {
    await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
  } catch {
    // Ignore errors during cleanup
  }
}

describe("Location Repository", () => {
  beforeAll(async () => {
    await setupTable();
  });

  afterAll(async () => {
    await teardownTable();
  });

  const testInput: CreateLocationInput = {
    name: "Test Location",
    locationCode: "TEST-001",
    placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    formattedAddress: "123 Test St, Test City, TS 12345",
    lat: 37.7749,
    lng: -122.4194,
  };

  describe("createLocation", () => {
    it("should create a location with ULID id", async () => {
      const uniqueInput = {
        ...testInput,
        locationCode: `TEST-${Date.now()}`,
      };

      const result = await createLocation(uniqueInput);

      expect(result).toBeDefined();
      expect(result.locationId).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
      expect(result.locationCode).toBe(uniqueInput.locationCode);
      expect(result.name).toBe(uniqueInput.name);
      expect(result.status).toBe("active");
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("should reject duplicate locationCode", async () => {
      const code = `DUP-${Date.now()}`;
      const input1 = { ...testInput, locationCode: code };
      const input2 = { ...testInput, locationCode: code, name: "Different Name" };

      // First creation should succeed
      await createLocation(input1);

      // Second creation with same code should fail
      await expect(createLocation(input2)).rejects.toThrow(
        `Location code "${code}" is already in use`
      );
    });

    it("should require valid placeId", async () => {
      const invalidInput = {
        ...testInput,
        locationCode: `VALID-${Date.now()}`,
        placeId: "", // Invalid
      };

      await expect(createLocation(invalidInput)).rejects.toThrow();
    });
  });

  describe("getLocationById", () => {
    it("should retrieve a location by ID", async () => {
      const code = `GETID-${Date.now()}`;
      const created = await createLocation({ ...testInput, locationCode: code });

      const result = await getLocationById(created.locationId);

      expect(result).toBeDefined();
      expect(result?.locationId).toBe(created.locationId);
      expect(result?.name).toBe(testInput.name);
    });

    it("should return null for non-existent ID", async () => {
      const result = await getLocationById("01ARZ3NDEKTSV4RRFFQ69G5FAV");

      expect(result).toBeNull();
    });
  });

  describe("getLocationByCode", () => {
    it("should retrieve a location by code via lookup item", async () => {
      const code = `GETCODE-${Date.now()}`;
      const created = await createLocation({ ...testInput, locationCode: code });

      const result = await getLocationByCode(code);

      expect(result).toBeDefined();
      expect(result?.locationCode).toBe(code);
      expect(result?.locationId).toBe(created.locationId);
    });

    it("should return null for non-existent code", async () => {
      const result = await getLocationByCode("NONEXISTENT-999");

      expect(result).toBeNull();
    });
  });

  describe("listLocations", () => {
    it("should list active locations", async () => {
      const code = `LIST-${Date.now()}`;
      await createLocation({ ...testInput, locationCode: code });

      const result = await listLocations(false);

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((loc) => loc.locationCode === code)).toBe(true);
    });
  });
});
