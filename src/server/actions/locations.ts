"use server";

/**
 * Location Server Actions
 * 
 * SolidStart server actions for location management.
 * All mutations use the "use server" directive at both file and function level.
 * 
 * Response Shape:
 * All actions return { success: boolean, data?: T, error?: string }
 * This consistent shape allows the client to handle responses uniformly.
 * 
 * TODO: Add auth check here when authentication is implemented
 */

import {
  createLocation as createLocationRepo,
  getLocationById as getLocationByIdRepo,
  listLocations as listLocationsRepo,
  softDeleteLocation as softDeleteLocationRepo,
  getLocationByCode as getLocationByCodeRepo,
  updateLocation as updateLocationRepo,
} from "~/server/db/repositories/location.repository";
import { getRequestEvent } from "solid-js/web";
import { getUserGroupsForUser } from "~/server/db/repositories/userGroup.repository";
import {
  createUserGroup,
  addUserToGroup,
} from "~/server/db/repositories/userGroup.repository";
import { assignRoleToGroup, createRole } from "~/server/db/repositories/permission.repository";
import { getCurrentUserId } from "~/server/auth";
import {
  AddLocationFormSchema,
  type AddLocationForm,
  type LocationUi,
} from "~/lib/schemas/ui/location.schema";
import type { Location } from "~/lib/schemas/db/location.schema";

/**
 * Standard result type for all server actions.
 * Using a discriminated union for type-safe error handling.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Transforms a DB Location record to the UI representation.
 * Removes internal DynamoDB fields (PK, SK, itemType) and
 * maps locationId to id for UI convention.
 */
function toUiLocation(dbLocation: Location): LocationUi {
  // Spread all DB fields, but add id (for UI) and ensure locationId is present (for type compatibility)
  return {
    ...dbLocation,
    id: dbLocation.locationId,
  };
}

/**
 * Creates a new location.
 * 
 * @param formData - Form data validated against AddLocationFormSchema
 * @returns ActionResult with the created location or error message
 */
export async function createLocation(
  formData: AddLocationForm
): Promise<ActionResult<LocationUi>> {
  "use server";

  try {
    // Validate the form data with the UI schema
    const validatedData = AddLocationFormSchema.parse(formData);

    // Server-side validation: require placeId and coordinates
    // These must come from Google Places Autocomplete
    if (!validatedData.placeId) {
      return {
        success: false,
        error: "Please select a location from the autocomplete. Manual address entry is not allowed.",
      };
    }

    if (validatedData.lat === undefined || validatedData.lng === undefined) {
      return {
        success: false,
        error: "Location coordinates are required. Please select a location from the autocomplete.",
      };
    }

    // TODO: Optionally verify placeId with Google Places API
    // This would require a server-side API call to validate the place exists

    // Transform to repository input (omit auto-generated fields)
    const createInput = {
      locationCode: validatedData.locationCode,
      name: validatedData.name,
      placeId: validatedData.placeId,
      formattedAddress: validatedData.formattedAddress,
      addressComponents: validatedData.addressComponents,
      lat: validatedData.lat,
      lng: validatedData.lng,
      status: validatedData.status,
    };

    // Create the location in DynamoDB
    const dbLocation = await createLocationRepo(createInput);

    try {
      // Create standard groups for the location
      const adminGroup = await createUserGroup({ locationId: dbLocation.locationId, groupType: "ADMIN", name: "Admin" });
      const teacherGroup = await createUserGroup({ locationId: dbLocation.locationId, groupType: "TEACHER", name: "Teacher" });
      const volunteerGroup = await createUserGroup({ locationId: dbLocation.locationId, groupType: "VOLUNTEER", name: "Volunteer" });

      // Ensure roles exist (idempotent createRole via repository will throw if exists)
      try { await createRole({ roleName: "Admin", description: "Location admin role" }); } catch (e) {}
      try { await createRole({ roleName: "Teacher", description: "Location teacher role" }); } catch (e) {}
      try { await createRole({ roleName: "Volunteer", description: "Location volunteer role" }); } catch (e) {}

      // Assign roles to groups
      await assignRoleToGroup(adminGroup.groupId, "Admin");
      await assignRoleToGroup(teacherGroup.groupId, "Teacher");
      await assignRoleToGroup(volunteerGroup.groupId, "Volunteer");

      // Add the creator user to Admin group
      try {
        const userId = await getCurrentUserId();
        await addUserToGroup(userId, adminGroup.groupId, { locationId: dbLocation.locationId, groupType: "ADMIN" });
      } catch (e) {
        // If auth not available or addition fails, log and continue
        console.warn("Failed to add creator to admin group:", e);
      }
      // If the creator does not yet have an activeLocationId, set this newly created location as their active location.
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const userRepo = await import("~/server/db/repositories/user.repository");
          const existing = await userRepo.getUserById(userId);
          if (existing && !existing.activeLocationId) {
            await userRepo.updateUser(userId, { activeLocationId: dbLocation.locationId });
          }
        }
      } catch (e) {
        // non-fatal: if we can't persist the activeLocationId, continue
        console.warn("Failed to persist activeLocationId for creator:", e);
      }
    } catch (err) {
      console.error("Failed to create default groups/roles for location:", err);
    }

    // Transform to UI shape and return
    return {
      success: true,
      data: toUiLocation(dbLocation),
    };
  } catch (error) {
    console.error("[createLocation] Server action failed:", error);

    // Handle Zod validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return {
        success: false,
        error: "Validation failed. Please check your input.",
      };
    }

    // Handle duplicate locationCode errors from repository
    if (error instanceof Error && error.message.includes("already taken")) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create location",
    };
  }
}

/**
 * Retrieves all locations.
 * 
 * @returns ActionResult with array of locations or error message
 */
export async function getLocations(): Promise<ActionResult<LocationUi[]>> {
  "use server";

  try {
    const dbLocations = await listLocationsRepo();
    const uiLocations = dbLocations.map(toUiLocation);
    // Return only active locations (soft-deleted items have status='inactive')
    const activeLocations = uiLocations.filter((l) => l.status === "active");
    return {
      success: true,
      data: activeLocations,
    };
  } catch (error) {
    console.error("[getLocations] Server action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch locations",
    };
  }
}

/**
 * Retrieves a single location by ID.
 * 
 * @param locationId - ULID of the location
 * @returns ActionResult with the location or error message
 */
export async function getLocationById(
  locationId: string
): Promise<ActionResult<LocationUi>> {
  "use server";

  try {
    // Validate the locationId format (ULID)
    if (!locationId || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return {
        success: false,
        error: "Invalid location ID format",
      };
    }

    const dbLocation = await getLocationByIdRepo(locationId);

    if (!dbLocation) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: toUiLocation(dbLocation),
    };
  } catch (error) {
    console.error("[getLocationById] Server action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch location",
    };
  }
}

/**
 * Retrieves a single location by its human-readable code.
 * 
 * @param locationCode - Human-readable location code
 * @returns ActionResult with the location or error message
 */
export async function getLocationByCode(
  locationCode: string
): Promise<ActionResult<LocationUi>> {
  "use server";

  try {
    if (!locationCode || !/^[a-z0-9-]{6,50}$/.test(locationCode)) {
      return {
        success: false,
        error: "Invalid location code format",
      };
    }

    const dbLocation = await getLocationByCodeRepo(locationCode);

    if (!dbLocation) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: toUiLocation(dbLocation),
    };
  } catch (error) {
    console.error("[getLocationByCode] Server action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch location",
    };
  }
}

/**
 * Get all locations the current authenticated user belongs to.
 * Returns an array of { id, name, locationId } objects.
 */
export async function getUserLocations(): Promise<ActionResult<{ locations: Array<{ id: string; name: string }>; activeLocationId?: string }>> {
  "use server";

  try {
    const userId = await getCurrentUserId();

    const groups = await getUserGroupsForUser(userId);
    const uniqueLocationIds = Array.from(new Set(groups.map((g) => g.locationId)));

    const locations: Array<{ id: string; name: string }> = [];
    for (const lid of uniqueLocationIds) {
      const loc = await getLocationByIdRepo(lid);
      if (loc) locations.push({ id: loc.locationId, name: loc.name });
    }

    // Fetch activeLocationId from user record in DB
    let activeLocationId: string | undefined = undefined;
    try {
      const user = await import("~/server/db/repositories/user.repository").then((m) => m.getUserById(userId));
      if (user?.activeLocationId) activeLocationId = user.activeLocationId;
    } catch (e) {
      // ignore
    }

    return { success: true, data: { locations, activeLocationId } };
  } catch (error) {
    console.error("[getUserLocations] Failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch user locations" };
  }
}

/**
 * Soft-deletes a location by setting its status to "inactive".
 * 
 * @param locationId - ULID of the location to delete
 * @returns ActionResult with success status or error message
 */
export async function deleteLocation(
  locationId: string
): Promise<ActionResult<{ deleted: true }>> {
  "use server";

  try {
    // Validate the locationId format
    if (!locationId || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return {
        success: false,
        error: "Invalid location ID format",
      };
    }

      await softDeleteLocationRepo(locationId);

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    console.error("[deleteLocation] Server action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete location",
    };
  }
}

/**
 * Updates an existing location's mutable fields (name only).
 * Location code and address are immutable after creation.
 * 
 * @param locationId - ULID of the location to update
 * @param updates - Fields to update (currently only name)
 * @returns ActionResult with updated location or error message
 */
export async function updateLocation(
  locationId: string,
  updates: { name?: string; placeId?: string; formattedAddress?: string; lat?: number; lng?: number; addressComponents?: any }
): Promise<ActionResult<LocationUi>> {
  "use server";

  try {
    // Validate the locationId format
    if (!locationId || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return {
        success: false,
        error: "Invalid location ID format",
      };
    }

    // Ensure at least one field to update
    if (!updates.name && !updates.placeId && !updates.formattedAddress && updates.lat === undefined && updates.lng === undefined) {
      return {
        success: false,
        error: "No updates provided",
      };
    }

    const repoInput: any = {};
    if (updates.name) repoInput.name = updates.name.trim();
    if (updates.placeId) repoInput.placeId = updates.placeId;
    if (updates.formattedAddress) repoInput.formattedAddress = updates.formattedAddress;
    if (updates.lat !== undefined) repoInput.lat = updates.lat;
    if (updates.lng !== undefined) repoInput.lng = updates.lng;
    if (updates.addressComponents) repoInput.addressComponents = updates.addressComponents;

    const dbLocation = await updateLocationRepo(locationId, repoInput);

    if (!dbLocation) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    return {
      success: true,
      data: toUiLocation(dbLocation),
    };
  } catch (error) {
    console.error("[updateLocation] Server action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update location",
    };
  }
}

/**
 * Persist the active location selection to the authenticated user's profile.
 * The client should call this when the user selects an active location.
 */
export async function setActiveLocation(locationId: string | null): Promise<ActionResult<{ updated: true }>> {
  "use server";

  try {
    // validate locationId if present
    if (locationId && !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return { success: false, error: "Invalid location ID" };
    }

    // Resolve current user and persist the active location
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await import("~/server/db/repositories/user.repository").then((m) => m.updateUser(userId, { activeLocationId: locationId ?? undefined }));

    return { success: true, data: { updated: true } };
  } catch (error) {
    console.error("[setActiveLocation] Failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to set active location" };
  }
}
