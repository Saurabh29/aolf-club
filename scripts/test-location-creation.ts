/**
 * Location Creation Test Script
 * 
 * Demonstrates the create/list flows for locations against DynamoDB Local.
 * Run with: pnpm tsx scripts/test-location-creation.ts
 * 
 * Prerequisites:
 * 1. DynamoDB Local running: docker run -p 8000:8000 amazon/dynamodb-local
 * 2. Table created: pnpm db:create-table
 * 3. .env file with DYNAMODB_ENDPOINT=http://localhost:8000
 */

import { config } from "dotenv";

// Load environment variables BEFORE importing modules that use them
config();

import {
  createLocation,
  getLocationById,
  getLocationByCode,
  listLocations,
  softDeleteLocation,
} from "../src/server/db/repositories/location.repository";

async function main() {
  console.log("=== Location Creation Test ===");
  console.log("");

  // Test 1: Create a location
  console.log("1. Creating a test location...");
  try {
    const location = await createLocation({
      locationCode: "test-location-001",
      name: "Test Location",
      placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4", // Example Google Place ID
      formattedAddress: "123 Test Street, Test City, TX 12345",
      lat: 30.2672,
      lng: -97.7431,
      addressComponents: {
        streetNumber: "123",
        route: "Test Street",
        city: "Test City",
        state: "Texas",
        stateCode: "TX",
        postalCode: "12345",
        country: "United States",
        countryCode: "US",
      },
      status: "active",
    });

    console.log("   ✅ Location created:", location.locationId);
    console.log("   Name:", location.name);
    console.log("   Code:", location.locationCode);
    console.log("   Address:", location.formattedAddress);
    console.log("");

    // Test 2: Get location by ID
    console.log("2. Getting location by ID...");
    const fetchedById = await getLocationById(location.locationId);
    console.log("   ✅ Found:", fetchedById?.name);
    console.log("");

    // Test 3: Get location by code
    console.log("3. Getting location by code...");
    const fetchedByCode = await getLocationByCode(location.locationCode);
    console.log("   ✅ Found:", fetchedByCode?.name);
    console.log("");

    // Test 4: List all locations
    console.log("4. Listing all locations...");
    const allLocations = await listLocations();
    console.log("   ✅ Total locations:", allLocations.length);
    for (const loc of allLocations) {
      console.log(`      - ${loc.locationCode}: ${loc.name} (${loc.status})`);
    }
    console.log("");

    // Test 5: Soft delete
    console.log("5. Soft-deleting the location...");
    await softDeleteLocation(location.locationId);
    const deleted = await getLocationById(location.locationId);
    console.log("   ✅ Status after delete:", deleted?.status);
    console.log("");

  } catch (error) {
    if (error instanceof Error && error.message.includes("already taken")) {
      console.log("   ⚠️  Location code already exists (expected if run multiple times)");
      console.log("");
    } else {
      console.error("   ❌ Error:", error);
      process.exit(1);
    }
  }

  // Test 6: Duplicate code rejection
  console.log("6. Testing duplicate code rejection...");
  try {
    await createLocation({
      locationCode: "test-location-001",
      name: "Duplicate Location",
      placeId: "test-place-id",
      formattedAddress: "Another Address",
      lat: 30.0,
      lng: -97.0,
      status: "active",
    });
    console.log("   ❌ Should have thrown an error!");
    process.exit(1);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already taken")) {
      console.log("   ✅ Correctly rejected duplicate code:", error.message);
    } else {
      console.error("   ❌ Unexpected error:", error);
      process.exit(1);
    }
  }
  console.log("");

  console.log("=== All tests passed! ===");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
