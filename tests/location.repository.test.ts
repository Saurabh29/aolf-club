/**
 * Location Repository Unit Tests
 * 
 * Tests for the location repository layer.
 * Requires DynamoDB Local running on http://localhost:8000
 * 
 * Run tests: pnpm test
 * 
 * Note: These tests use a real DynamoDB Local instance.
 * For CI, consider using Testcontainers or mocking the SDK.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import {
  createLocation,
  getLocationById,
  getLocationByCode,
  listLocations,
  softDeleteLocation,
} from "~/server/db/repositories/location.repository";
import { testEnv } from "./setup";

const TABLE_NAME = testEnv.DYNAMODB_TABLE_NAME;
const ENDPOINT = testEnv.DYNAMODB_ENDPOINT;
const REGION = testEnv.AWS_REGION;

// Create DynamoDB client for test setup
const ddbClient = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

/**
 * Ensures the test table exists before running tests.
 */
async function ensureTable() {
  try {
    await ddbClient.send(
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
    console.log(`Created test table: ${TABLE_NAME}`);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      // Table already exists, that's fine
    } else {
      throw error;
    }
  }
}

describe("Location Repository", () => {
  beforeAll(async () => {
    // Ensure the test table exists
    await ensureTable();
  });

  describe("createLocation", () => {
    it("should create a location with all required fields", async () => {
      const uniqueCode = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const location = await createLocation({
        locationCode: uniqueCode,
        name: "Test Location",
        placeId: "test-place-id",
        formattedAddress: "123 Test St, Test City, TX 12345",
        lat: 30.2672,
        lng: -97.7431,
        status: "active",
      });

      expect(location).toBeDefined();
      expect(location.locationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i); // ULID format
      expect(location.locationCode).toBe(uniqueCode);
      expect(location.name).toBe("Test Location");
      expect(location.PK).toBe(`LOCATION#${location.locationId}`);
      expect(location.SK).toBe("META");
      expect(location.itemType).toBe("Location");
      expect(location.createdAt).toBeDefined();
      expect(location.updatedAt).toBeDefined();
    });

    it("should reject duplicate location codes", async () => {
      const uniqueCode = `dup-test-${Date.now()}`;

      // Create first location
      await createLocation({
        locationCode: uniqueCode,
        name: "First Location",
        placeId: "test-place-id",
        formattedAddress: "123 Test St",
        lat: 30.0,
        lng: -97.0,
        status: "active",
      });

      // Attempt to create second location with same code
      await expect(
        createLocation({
          locationCode: uniqueCode,
          name: "Duplicate Location",
          placeId: "test-place-id-2",
          formattedAddress: "456 Other St",
          lat: 31.0,
          lng: -98.0,
          status: "active",
        })
      ).rejects.toThrow(/already taken/i);
    });
  });

  describe("getLocationById", () => {
    it("should retrieve a location by its ID", async () => {
      const uniqueCode = `get-id-${Date.now()}`;

      const created = await createLocation({
        locationCode: uniqueCode,
        name: "Get By ID Test",
        placeId: "test-place-id",
        formattedAddress: "123 Test St",
        lat: 30.0,
        lng: -97.0,
        status: "active",
      });

      const fetched = await getLocationById(created.locationId);

      expect(fetched).toBeDefined();
      expect(fetched?.locationId).toBe(created.locationId);
      expect(fetched?.name).toBe("Get By ID Test");
    });

    it("should return null for non-existent ID", async () => {
      const result = await getLocationById("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      expect(result).toBeNull();
    });
  });

  describe("getLocationByCode", () => {
    it("should retrieve a location by its code", async () => {
      const uniqueCode = `get-code-${Date.now()}`;

      await createLocation({
        locationCode: uniqueCode,
        name: "Get By Code Test",
        placeId: "test-place-id",
        formattedAddress: "123 Test St",
        lat: 30.0,
        lng: -97.0,
        status: "active",
      });

      const fetched = await getLocationByCode(uniqueCode);

      expect(fetched).toBeDefined();
      expect(fetched?.locationCode).toBe(uniqueCode);
      expect(fetched?.name).toBe("Get By Code Test");
    });

    it("should return null for non-existent code", async () => {
      const result = await getLocationByCode("non-existent-code-xyz");
      expect(result).toBeNull();
    });
  });

  describe("listLocations", () => {
    it("should return an array of locations", async () => {
      const locations = await listLocations();

      expect(Array.isArray(locations)).toBe(true);
      // Should have at least the locations we created in previous tests
      expect(locations.length).toBeGreaterThan(0);
    });

    it("should return locations sorted by createdAt descending", async () => {
      const locations = await listLocations();

      if (locations.length >= 2) {
        for (let i = 0; i < locations.length - 1; i++) {
          const current = new Date(locations[i].createdAt).getTime();
          const next = new Date(locations[i + 1].createdAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  describe("softDeleteLocation", () => {
    it("should set location status to inactive", async () => {
      const uniqueCode = `soft-del-${Date.now()}`;

      const created = await createLocation({
        locationCode: uniqueCode,
        name: "Soft Delete Test",
        placeId: "test-place-id",
        formattedAddress: "123 Test St",
        lat: 30.0,
        lng: -97.0,
        status: "active",
      });

      expect(created.status).toBe("active");

      await softDeleteLocation(created.locationId);

      const fetched = await getLocationById(created.locationId);
      expect(fetched?.status).toBe("inactive");
    });
  });
});
