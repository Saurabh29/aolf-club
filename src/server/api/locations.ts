import { query, action } from "@solidjs/router";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";

export type { LocationUi };

export const getLocationsQuery = query(async () => {
  "use server";
  const svc = await import("~/server/services");
  const result = await svc.getLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch locations");
  return result.data;
}, "locations-for-user");

export const getUserLocationsQuery = query(async () => {
  "use server";
  const svc = await import("~/server/services");
  const result = await svc.getUserLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch user locations");
  return result.data;
}, "user-locations");

export const getLocationByIdQuery = query(async (locationId: string) => {
  "use server";
  const svc = await import("~/server/services");
  const result = await svc.getLocationById(locationId);
  if (!result.success) throw new Error(result.error ?? "Failed to fetch location");
  return result.data;
}, "location-by-id");

export const setActiveLocationAction = action(async (locationId: string | null) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.setActiveLocation(locationId);
}, "set-active-location");

export const createLocationAction = action(async (formData: any) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.createLocation(formData);
}, "create-location");

export const updateLocationAction = action(async (locationId: string, updates: any) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.updateLocation(locationId, updates);
}, "update-location");

export const deleteLocationAction = action(async (locationId: string) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.deleteLocation(locationId);
}, "delete-location");
