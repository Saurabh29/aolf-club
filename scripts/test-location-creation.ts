/**
 * Test script for Location creation and listing
 * 
 * Demonstrates repository behavior against DynamoDB Local.
 * 
 * Run with: pnpm test:location
 * 
 * Prerequisites:
 * 1. DynamoDB Local running: docker run -d -p 8000:8000 amazon/dynamodb-local
 * 2. Table created: pnpm db:create-table
 * 3. Environment variables set (copy from .env.example)
 */

import { ulid } from "ulid";

// Set environment for local DynamoDB before importing repository
process.env.DYNAMODB_LOCAL_ENDPOINT = process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000";
process.env.DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "aolf-club-locations";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "local";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "local";

// Import repository functions
import {
  createLocation,
  getLocationById,
  getLocationByCode,
  listLocations,
  softDeleteLocation,
} from "../src/server/db/repositories/location.repository";
import type { CreateLocationInput } from "../src/lib/schemas/db/location.schema";

async function runTests() {
  console.log("🧪 Location Repository Test Script\n");
  console.log("=".repeat(50));

  // Generate unique location code for this test run
  const testCode = `TEST-${Date.now().toString(36).toUpperCase()}`;

  // Test 1: Create Location
  console.log("\n📍 Test 1: Create Location");
  console.log("-".repeat(30));

  const createInput: CreateLocationInput = {
    name: "Test Location",
    locationCode: testCode,
    placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4", // Example Google Place ID
    formattedAddress: "123 Test Street, Test City, TS 12345",
    lat: 37.7749,
    lng: -122.4194,
    addressComponents: {
      street_number: {
        long_name: "123",
        short_name: "123",
        types: ["street_number"],
      },
      route: {
        long_name: "Test Street",
        short_name: "Test St",
        types: ["route"],
      },
    },
  };

  try {
    const created = await createLocation(createInput);
    console.log("✅ Location created successfully!");
    console.log(`   ID: ${created.locationId}`);
    console.log(`   Code: ${created.locationCode}`);
    console.log(`   Name: ${created.name}`);
    console.log(`   Address: ${created.formattedAddress}`);
    console.log(`   Coordinates: (${created.lat}, ${created.lng})`);
    console.log(`   Status: ${created.status}`);
    console.log(`   Created: ${created.createdAt}`);

    // Test 2: Get Location by ID
    console.log("\n📍 Test 2: Get Location by ID");
    console.log("-".repeat(30));

    const byId = await getLocationById(created.locationId);
    if (byId) {
      console.log("✅ Location retrieved by ID");
      console.log(`   Matches: ${byId.locationId === created.locationId}`);
    } else {
      console.log("❌ Failed to retrieve location by ID");
    }

    // Test 3: Get Location by Code
    console.log("\n📍 Test 3: Get Location by Code");
    console.log("-".repeat(30));

    const byCode = await getLocationByCode(testCode);
    if (byCode) {
      console.log("✅ Location retrieved by code");
      console.log(`   Matches: ${byCode.locationCode === testCode}`);
    } else {
      console.log("❌ Failed to retrieve location by code");
    }

    // Test 4: List Locations
    console.log("\n📍 Test 4: List Locations");
    console.log("-".repeat(30));

    const locations = await listLocations();
    console.log(`✅ Found ${locations.length} location(s)`);
    for (const loc of locations) {
      console.log(`   - ${loc.locationCode}: ${loc.name}`);
    }

    // Test 5: Duplicate Code Rejection
    console.log("\n📍 Test 5: Duplicate Code Rejection");
    console.log("-".repeat(30));

    try {
      await createLocation({
        ...createInput,
        name: "Duplicate Test",
      });
      console.log("❌ Should have rejected duplicate code!");
    } catch (error) {
      if (error instanceof Error && error.message.includes("already in use")) {
        console.log("✅ Correctly rejected duplicate locationCode");
        console.log(`   Error: ${error.message}`);
      } else {
        console.log("❌ Unexpected error:", error);
      }
    }

    // Test 6: Soft Delete
    console.log("\n📍 Test 6: Soft Delete");
    console.log("-".repeat(30));

    const deleted = await softDeleteLocation(created.locationId);
    if (deleted && deleted.status === "inactive") {
      console.log("✅ Location soft-deleted successfully");
      console.log(`   Status: ${deleted.status}`);
    } else {
      console.log("❌ Failed to soft-delete location");
    }

    // Test 7: Verify soft-deleted not in list
    console.log("\n📍 Test 7: Verify Soft-Deleted Not Listed");
    console.log("-".repeat(30));

    const activeLocations = await listLocations(false);
    const found = activeLocations.find((l) => l.locationId === created.locationId);
    if (!found) {
      console.log("✅ Soft-deleted location not in active list");
    } else {
      console.log("❌ Soft-deleted location still in active list");
    }

  } catch (error) {
    console.error("❌ Test failed with error:", error);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ All tests completed!\n");
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
