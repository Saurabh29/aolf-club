import { query, action } from "@solidjs/router";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";
import type { QuerySpec } from "~/lib/schemas/query";

import {
  getUserLocations,
  setActiveLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  queryLocations,
  queryActiveLocations,
  searchLocationsByName,
  queryLocationById,
} from "~/server/services";

export type { LocationUi };

// ============================================================================
// QUERY ABSTRACTION API
// ============================================================================

/**
 * Get locations for current user (specialized for dropdown/switcher UI)
 * Returns simplified shape with id, name, and activeLocationId
 */
export const getUserLocationsQuery = query(async () => {
  "use server";
  const result = await getUserLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch user locations");
  return result.data;
}, "user-locations");

/**
 * Query locations with filters, sorting, and pagination
 * 
 * @example
 * ```tsx
 * const locationsResult = createAsync(() => queryLocationsQuery({
 *   filters: [{ field: "status", op: "eq", value: "active" }],
 *   sort: { field: "name", direction: "asc" },
 *   pagination: { mode: "offset", limit: 50, offset: 0 }
 * }));
 * ```
 */
export const queryLocationsQuery = query(async (spec: QuerySpec) => {
  "use server";
  const result = await queryLocations(spec);
  if (!result.success) throw new Error(result.error ?? "Failed to query locations");
  return result.data;
}, "query-locations");

/**
 * Get all active locations sorted by name
 */
export const queryActiveLocationsQuery = query(async (
  sortBy?: "name" | "createdAt" | "updatedAt",
  limit?: number
) => {
  "use server";
  const result = await queryActiveLocations(sortBy, limit);
  if (!result.success) throw new Error(result.error ?? "Failed to query active locations");
  return result.data;
}, "query-active-locations");

/**
 * Search locations by name
 */
export const searchLocationsByNameQuery = query(async (nameSearch: string, limit?: number) => {
  "use server";
  const result = await searchLocationsByName(nameSearch, limit);
  if (!result.success) throw new Error(result.error ?? "Failed to search locations");
  return result.data;
}, "search-locations-by-name");

/**
 * Get location by ID (query abstraction version)
 */
export const queryLocationByIdQuery = query(async (locationId: string) => {
  "use server";
  const result = await queryLocationById(locationId);
  if (!result.success) throw new Error(result.error ?? "Failed to query location by ID");
  return result.data;
}, "query-location-by-id");

// ============================================================================
// ACTIONS
// ============================================================================

export const setActiveLocationAction = action(async (locationId: string | null) => {
  "use server";
  return await setActiveLocation(locationId);
}, "set-active-location");

export const createLocationAction = action(async (formData) => {
  "use server";
  return await createLocation(formData);
}, "create-location");

export const updateLocationAction = action(async (locationId: string, updates: any) => {
  "use server";
  return await updateLocation(locationId, updates);
}, "update-location");

export const deleteLocationAction = action(async (locationId: string) => {
  "use server";
  return await deleteLocation(locationId);
}, "delete-location");
