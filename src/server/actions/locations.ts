"use server";

import {
  createLocation as repoCreateLocation,
  getLocationById as repoGetLocationById,
  getLocationByCode as repoGetLocationByCode,
  listLocations as repoListLocations,
  softDeleteLocation as repoSoftDeleteLocation,
} from "~/server/db/repositories/location.repository";
import { AddLocationFormSchema, type LocationListItem, type ServerActionResponse } from "~/lib/schemas/ui/location.schema";
import { LocationDbSchema, type Location } from "~/lib/schemas/db/location.schema";

/**
 * Server Actions for Location Management
 * 
 * All server actions:
 * 1. Use "use server" directive
 * 2. Validate input with UI schema first
 * 3. Transform and validate with DB schema before persisting
 * 4. Return consistent response shape: { success, data?, error? }
 * 
 * Future integration points (not implemented):
 * - TODO: Add authentication check before mutations
 * - TODO: Add authorization/role checks for admin operations
 * - TODO: Add audit logging for mutations
 */

/**
 * Create a new location
 * 
 * Validates the form data, transforms to DB entity, and persists.
 * Address/geo data MUST come from Google Places Autocomplete.
 * Server validates presence of placeId and coordinates.
 * 
 * @param formData - Location form data from AddLocationDialog
 * @returns ServerActionResponse with created location or error
 */
export async function createLocation(
  formData: unknown
): Promise<ServerActionResponse<Location>> {
  try {
    // Step 1: Validate with UI schema (derived from DB schema)
    const uiValidation = AddLocationFormSchema.safeParse(formData);
    if (!uiValidation.success) {
      return {
        success: false,
        error: uiValidation.error.errors.map((e: { message: string }) => e.message).join(", "),
      };
    }

    const validatedForm = uiValidation.data;

    // Step 2: Verify placeId and coordinates are present
    // These MUST come from Google Places Autocomplete
    // TODO: Optionally verify placeId with Google Places API server-side
    if (!validatedForm.placeId || validatedForm.placeId.trim() === "") {
      return {
        success: false,
        error: "Address must be selected from Google Places Autocomplete",
      };
    }

    if (
      typeof validatedForm.lat !== "number" ||
      typeof validatedForm.lng !== "number"
    ) {
      return {
        success: false,
        error: "Valid coordinates are required from Google Places",
      };
    }

    // Step 3: Call repository to persist
    // Repository handles ULID generation, timestamps, and TransactWrite
    const created = await repoCreateLocation(validatedForm);

    // Step 4: Validate output with DB schema (defensive)
    LocationDbSchema.parse(created);

    return {
      success: true,
      data: created,
    };
  } catch (error) {
    console.error("createLocation error:", error);
    
    const message =
      error instanceof Error ? error.message : "Failed to create location";
    
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get all locations for list display
 * 
 * Returns UI-shaped location list items.
 * Excludes inactive (soft-deleted) locations by default.
 * 
 * @returns ServerActionResponse with array of locations
 */
export async function getLocations(): Promise<ServerActionResponse<LocationListItem[]>> {
  try {
    const locations = await repoListLocations(false);

    // Transform to UI shape
    const listItems: LocationListItem[] = locations.map((loc) => ({
      locationId: loc.locationId,
      locationCode: loc.locationCode,
      name: loc.name,
      formattedAddress: loc.formattedAddress,
      lat: loc.lat,
      lng: loc.lng,
      status: loc.status,
      createdAt: loc.createdAt,
    }));

    return {
      success: true,
      data: listItems,
    };
  } catch (error) {
    console.error("getLocations error:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch locations",
    };
  }
}

/**
 * Get a single location by ID
 * 
 * @param locationId - ULID of the location
 * @returns ServerActionResponse with location or error
 */
export async function getLocationById(
  locationId: string
): Promise<ServerActionResponse<Location>> {
  try {
    if (!locationId || typeof locationId !== "string") {
      return {
        success: false,
        error: "Invalid location ID",
      };
    }

    const location = await repoGetLocationById(locationId);

    if (!location) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: location,
    };
  } catch (error) {
    console.error("getLocationById error:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch location",
    };
  }
}

/**
 * Get a location by its human-friendly code
 * 
 * @param locationCode - Human-friendly location code
 * @returns ServerActionResponse with location or error
 */
export async function getLocationByCode(
  locationCode: string
): Promise<ServerActionResponse<Location>> {
  try {
    if (!locationCode || typeof locationCode !== "string") {
      return {
        success: false,
        error: "Invalid location code",
      };
    }

    const location = await repoGetLocationByCode(locationCode);

    if (!location) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: location,
    };
  } catch (error) {
    console.error("getLocationByCode error:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch location",
    };
  }
}

/**
 * Soft-delete a location (set status to inactive)
 * 
 * @param locationId - ULID of the location to delete
 * @param freeLocationCode - If true, allows the code to be reused
 * @returns ServerActionResponse with updated location or error
 */
export async function deleteLocation(
  locationId: string,
  freeLocationCode = false
): Promise<ServerActionResponse<Location>> {
  try {
    // TODO: Add authentication check
    // TODO: Add authorization check (admin only?)
    
    if (!locationId || typeof locationId !== "string") {
      return {
        success: false,
        error: "Invalid location ID",
      };
    }

    const deleted = await repoSoftDeleteLocation(locationId, freeLocationCode);

    if (!deleted) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: deleted,
    };
  } catch (error) {
    console.error("deleteLocation error:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete location",
    };
  }
}
