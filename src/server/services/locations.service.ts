/**
 * Locations service layer (migrated from server/actions/locations.ts)
 */

import {
  createLocation as createLocationRepo,
  getLocationById as getLocationByIdRepo,
  softDeleteLocation as softDeleteLocationRepo,
  getLocationByCode as getLocationByCodeRepo,
  updateLocation as updateLocationRepo,
} from "~/server/db/repositories/location.repository";
import { getLocationsForUser } from "~/server/db/repositories/userLocation.repository";
import { getUserGroupsForUser } from "~/server/db/repositories/userGroup.repository";
import {
  createUserGroup,
  addUserToGroup,
} from "~/server/db/repositories/userGroup.repository";
import { addUserToLocation } from "~/server/db/repositories/userLocation.repository";
import { assignRoleToGroup, createRole } from "~/server/db/repositories/permission.repository";
import { getSessionInfo } from "~/lib/auth"; 
import {
  AddLocationFormSchema,
  type AddLocationForm,
  type LocationUi,
} from "~/lib/schemas/ui/location.schema";
import type { Location } from "~/lib/schemas/db/location.schema";
import type { ApiResult } from "~/lib/types";
import type { QuerySpec, QueryResult } from "~/lib/schemas/query";
import { queryResource, getResourceById } from "~/server/services/query.service";

function toUiLocation(dbLocation: Location): LocationUi {
  return {
    ...dbLocation,
    id: dbLocation.locationId,
  };
}

export async function createLocation(
  formData: AddLocationForm
): Promise<ApiResult<LocationUi>> {
  try {
    const validatedData = AddLocationFormSchema.parse(formData);

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

    const dbLocation = await createLocationRepo(createInput);

    try {
      const adminGroup = await createUserGroup({ locationId: dbLocation.locationId, groupType: "ADMIN", name: "Admin" });
      const teacherGroup = await createUserGroup({ locationId: dbLocation.locationId, groupType: "TEACHER", name: "Teacher" });
      const volunteerGroup = await createUserGroup({ locationId: dbLocation.locationId, groupType: "VOLUNTEER", name: "Volunteer" });

      try { await createRole({ roleName: "Admin", description: "Location admin role" }); } catch (e) {}
      try { await createRole({ roleName: "Teacher", description: "Location teacher role" }); } catch (e) {}
      try { await createRole({ roleName: "Volunteer", description: "Location volunteer role" }); } catch (e) {}

      await assignRoleToGroup(adminGroup.groupId, "Admin");
      await assignRoleToGroup(teacherGroup.groupId, "Teacher");
      await assignRoleToGroup(volunteerGroup.groupId, "Volunteer");

      try {
        const session = await getSessionInfo();
        const userId = session.userId!;
        await addUserToGroup(userId, adminGroup.groupId, { locationId: dbLocation.locationId, groupType: "ADMIN" });
        try {
          await addUserToLocation(userId, dbLocation.locationId);
        } catch (e) {
          console.warn("Failed to add creator to location edges:", e);
        }
      } catch (e) {
        console.warn("Failed to add creator to admin group:", e);
      }

      try {
        const session = await getSessionInfo();
        const userId = session.userId!;
        if (userId) {
          const userRepo = await import("~/server/db/repositories/user.repository");
          const existing = await userRepo.getUserById(userId);
          if (existing && !existing.activeLocationId) {
            await userRepo.updateUser(userId, { activeLocationId: dbLocation.locationId });
          }
        }
      } catch (e) {
        console.warn("Failed to persist activeLocationId for creator:", e);
      }
    } catch (err) {
      console.error("Failed to create default groups/roles for location:", err);
    }

    const result: ApiResult<LocationUi> = {
      success: true,
      data: toUiLocation(dbLocation),
    };
    return result;
  } catch (error) {
    console.error("[createLocation] Server action failed:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return {
        success: false,
        error: "Validation failed. Please check your input.",
      };
    }

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

export async function getLocations(): Promise<ApiResult<LocationUi[]>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    const userLocations = await getLocationsForUser(userId);
    if (userLocations.length === 0) return { success: true, data: [] };
    const dbLocations = await Promise.all(userLocations.map(async (edge) => getLocationByIdRepo(edge.locationId)));
    const validLocations = dbLocations.filter((loc): loc is Location => loc !== null && loc.status === "active");
    const uiLocations = validLocations.map(toUiLocation);
    return { success: true, data: uiLocations };
  } catch (error) {
    console.error("[getLocations] Server action failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch locations" };
  }
}

export async function getLocationById(locationId: string): Promise<ApiResult<LocationUi>> {
  try {
    if (!locationId || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return { success: false, error: "Invalid location ID format" };
    }
    const dbLocation = await getLocationByIdRepo(locationId);
    if (!dbLocation) return { success: false, error: "Location not found" };
    return { success: true, data: toUiLocation(dbLocation) };
  } catch (error) {
    console.error("[getLocationById] Server action failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch location" };
  }
}

export async function getLocationByCode(locationCode: string): Promise<ApiResult<LocationUi>> {
  try {
    if (!locationCode || !/^[a-z0-9-]{6,50}$/.test(locationCode)) {
      return { success: false, error: "Invalid location code format" };
    }
    const dbLocation = await getLocationByCodeRepo(locationCode);
    if (!dbLocation) return { success: false, error: "Location not found" };
    return { success: true, data: toUiLocation(dbLocation) };
  } catch (error) {
    console.error("[getLocationByCode] Server action failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch location" };
  }
}

export async function getUserLocations(): Promise<ApiResult<{ locations: Array<{ id: string; name: string }>; activeLocationId?: string }>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    const groups = await getUserGroupsForUser(userId);
    const uniqueLocationIds = Array.from(new Set(groups.map((g) => g.locationId)));
    const locations: Array<{ id: string; name: string }> = [];
    for (const lid of uniqueLocationIds) {
      const loc = await getLocationByIdRepo(lid);
      if (loc) locations.push({ id: loc.locationId, name: loc.name });
    }
    let activeLocationId: string | undefined = undefined;
    try {
      const user = await import("~/server/db/repositories/user.repository").then((m) => m.getUserById(userId));
      if (user?.activeLocationId) activeLocationId = user.activeLocationId;
    } catch (e) {}
    return { success: true, data: { locations, activeLocationId } };
  } catch (error) {
    console.error("[getUserLocations] Failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch user locations" };
  }
}

export async function deleteLocation(locationId: string): Promise<ApiResult<{ deleted: true }>> {
  try {
    if (!locationId || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return { success: false, error: "Invalid location ID format" };
    }
    await softDeleteLocationRepo(locationId);
    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("[deleteLocation] Server action failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete location" };
  }
}

export async function updateLocation(locationId: string, updates: { name?: string; placeId?: string; formattedAddress?: string; lat?: number; lng?: number; addressComponents?: any }): Promise<ApiResult<LocationUi>> {
  try {
    if (!locationId || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return { success: false, error: "Invalid location ID format" };
    }
    if (!updates.name && !updates.placeId && !updates.formattedAddress && updates.lat === undefined && updates.lng === undefined) {
      return { success: false, error: "No updates provided" };
    }
    const repoInput: any = {};
    if (updates.name) repoInput.name = updates.name.trim();
    if (updates.placeId) repoInput.placeId = updates.placeId;
    if (updates.formattedAddress) repoInput.formattedAddress = updates.formattedAddress;
    if (updates.lat !== undefined) repoInput.lat = updates.lat;
    if (updates.lng !== undefined) repoInput.lng = updates.lng;
    if (updates.addressComponents) repoInput.addressComponents = updates.addressComponents;
    const dbLocation = await updateLocationRepo(locationId, repoInput);
    if (!dbLocation) return { success: false, error: "Location not found" };
    return { success: true, data: toUiLocation(dbLocation) };
  } catch (error) {
    console.error("[updateLocation] Server action failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update location" };
  }
}

export async function setActiveLocation(locationId: string | null): Promise<ApiResult<{ updated: true }>> {
  try {
    if (locationId && !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(locationId)) {
      return { success: false, error: "Invalid location ID" };
    }
    const session = await getSessionInfo();
    const userId = session.userId!;
    await import("~/server/db/repositories/user.repository").then((m) => m.updateUser(userId, { activeLocationId: locationId ?? undefined }));
    return { success: true, data: { updated: true } };
  } catch (error) {
    console.error("[setActiveLocation] Failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to set active location" };
  }
}

/**
 * ============================================================================
 * QUERY ABSTRACTION LAYER FUNCTIONS
 * ============================================================================
 * 
 * New functions that use the query abstraction layer for filtering,
 * sorting, and pagination. These provide consistent API and data-source
 * independence.
 */

/**
 * Query locations with filters, sorting, and pagination (In-memory)
 * 
 * Uses the query abstraction layer. Since locations are small dataset,
 * uses InMemoryDataSource for fast queries with full feature support.
 * 
 * Supports:
 * - Any field filtering (in-memory allows all fields)
 * - Sorting by any field
 * - Offset-based pagination with totalCount
 * 
 * @param spec Query specification (filters, sort, pagination)
 * @returns ApiResult with QueryResult (items, totalCount)
 * 
 * @example
 * ```typescript
 * const result = await queryLocations({
 *   filters: [{ field: "status", op: "eq", value: "active" }],
 *   sort: { field: "name", direction: "asc" },
 *   pagination: { mode: "offset", limit: 50, offset: 0 }
 * });
 * ```
 */
export async function queryLocations(spec: QuerySpec): Promise<ApiResult<QueryResult<Location>>> {
  try {
    return await queryResource<Location>("locations", spec);
  } catch (error) {
    console.error("[queryLocations] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to query locations"
    };
  }
}

/**
 * Get all active locations with sorting (convenience wrapper)
 * 
 * Common use case: list all active locations sorted by name.
 * 
 * @param sortBy Field to sort by (default: "name")
 * @param limit Optional limit
 * @returns ApiResult with QueryResult
 */
export async function queryActiveLocations(
  sortBy: "name" | "createdAt" | "updatedAt" = "name",
  limit = 100
): Promise<ApiResult<QueryResult<Location>>> {
  return queryLocations({
    filters: [{ field: "status", op: "eq", value: "active" }],
    sort: { field: sortBy, direction: "asc" },
    pagination: { mode: "offset", limit, offset: 0 },
  });
}

/**
 * Search locations by name (convenience wrapper)
 * 
 * Uses contains operator for partial matching.
 * 
 * @param nameSearch Search query
 * @param limit Optional limit
 * @returns ApiResult with QueryResult
 */
export async function searchLocationsByName(
  nameSearch: string,
  limit = 50
): Promise<ApiResult<QueryResult<Location>>> {
  return queryLocations({
    filters: [
      { field: "status", op: "eq", value: "active" },
      { field: "name", op: "contains", value: nameSearch },
    ],
    sort: { field: "name", direction: "asc" },
    pagination: { mode: "offset", limit, offset: 0 },
  });
}

/**
 * Get location by ID (query abstraction version)
 * 
 * Optimized single-location lookup using getResourceById.
 * 
 * @param locationId Location ID
 * @returns ApiResult with Location or null
 */
export async function queryLocationById(locationId: string): Promise<ApiResult<Location | null>> {
  try {
    return await getResourceById<Location>("locations", locationId);
  } catch (error) {
    console.error("[queryLocationById] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get location"
    };
  }
}
