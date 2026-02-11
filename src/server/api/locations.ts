import { query, action } from "@solidjs/router";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";

import {
  getLocations,
  getUserLocations,
  getLocationById,
  setActiveLocation,
  createLocation,
  updateLocation,
  deleteLocation,
} from "~/server/services";

export type { LocationUi };

export const getLocationsQuery = query(async () => {
  "use server";
  const result = await getLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch locations");
  return result.data;
}, "locations-for-user");

export const getUserLocationsQuery = query(async () => {
  "use server";
  const result = await getUserLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch user locations");
  return result.data;
}, "user-locations");

export const getLocationByIdQuery = query(async (locationId: string) => {
  "use server";
  const result = await getLocationById(locationId);
  if (!result.success) throw new Error(result.error ?? "Failed to fetch location");
  return result.data;
}, "location-by-id");

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
