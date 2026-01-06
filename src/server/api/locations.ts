import { query } from "@solidjs/router";
import * as locationsService from "~/server/services";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";

export { locationsService };
export type { LocationUi };

export const getLocationsQuery = query(async () => {
  "use server";
  const result = await locationsService.getLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch locations");
  return result.data;
}, "locations-for-user");

export const getUserLocationsQuery = query(async () => {
  "use server";
  const result = await locationsService.getUserLocations();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch user locations");
  return result.data;
}, "user-locations");

export const getLocationByIdQuery = query(async (locationId: string) => {
  "use server";
  const result = await locationsService.getLocationById(locationId);
  if (!result.success) throw new Error(result.error ?? "Failed to fetch location");
  return result.data;
}, "location-by-id");

export async function setActiveLocation(locationId: string | null) {
  "use server";
  return await locationsService.setActiveLocation(locationId);
}
