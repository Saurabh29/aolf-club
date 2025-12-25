/**
 * Location UI Schemas
 * 
 * These schemas are DERIVED from the authoritative DB schema using Zod composition.
 * DO NOT manually re-declare fields — use omit/pick/extend to derive from DB schema.
 * 
 * Pattern:
 * 1. Import DB schema: import { LocationSchema as LocationDbSchema } from "~/lib/schemas/db/location.schema";
 * 2. Derive UI schemas using .omit(), .pick(), .extend()
 * 3. Export derived types
 */

import { z } from "zod";
import {
  LocationSchema as LocationDbSchema,
  AddressComponentsSchema,
} from "~/lib/schemas/db/location.schema";

/**
 * PlaceDetails - Data structure for Google Places Autocomplete selection.
 * This is what the GooglePlaceSearch component emits when a place is selected.
 */
export const PlaceDetailsSchema = z.object({
  placeId: z.string().min(1, "Place ID is required"),
  formattedAddress: z.string().min(1, "Address is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  addressComponents: AddressComponentsSchema,
});

export type PlaceDetails = z.infer<typeof PlaceDetailsSchema>;

/**
 * AddLocationFormSchema - Schema for the location creation form.
 * 
 * Derived from DB schema by omitting auto-generated fields:
 * - PK, SK, itemType: DynamoDB internal fields
 * - locationId: Generated server-side as ULID
 * - createdAt, updatedAt: Set server-side
 * 
 * Extends with required Google Places fields that must come from autocomplete.
 */
export const AddLocationFormSchema = LocationDbSchema.omit({
  PK: true,
  SK: true,
  itemType: true,
  locationId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Override optional fields to be required for form submission
  // These must come from Google Places Autocomplete
  placeId: z.string().min(1, "Please select a location from the autocomplete"),
  formattedAddress: z.string().min(1, "Address is required"),
  lat: z.number({ required_error: "Coordinates are required" }),
  lng: z.number({ required_error: "Coordinates are required" }),
});

export type AddLocationForm = z.infer<typeof AddLocationFormSchema>;

/**
 * LocationUiSchema - Schema for displaying locations in the UI.
 * 
 * Derived from DB schema by omitting internal DynamoDB fields.
 * Maps locationId to id for UI convention.
 */
const LocationUiBaseSchema = LocationDbSchema.omit({
  PK: true,
  SK: true,
  itemType: true,
});

type LocationUiBase = z.infer<typeof LocationUiBaseSchema>;

export const LocationUiSchema = LocationUiBaseSchema.transform((loc: LocationUiBase) => ({
  // Map locationId to id for UI convention
  id: loc.locationId,
  locationCode: loc.locationCode,
  name: loc.name,
  placeId: loc.placeId,
  formattedAddress: loc.formattedAddress,
  addressComponents: loc.addressComponents,
  lat: loc.lat,
  lng: loc.lng,
  status: loc.status,
  createdAt: loc.createdAt,
  updatedAt: loc.updatedAt,
}));

/**
 * LocationUi - UI-facing type for Location.
 * Note: Using explicit type instead of z.infer due to transform.
 */
export type LocationUi = {
  id: string;
  locationCode: string;
  name: string;
  placeId?: string;
  formattedAddress?: string;
  addressComponents?: {
    streetNumber?: string;
    route?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  };
  lat?: number;
  lng?: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

/**
 * EditLocationFormSchema - Schema for editing existing locations.
 * All fields are optional except those that identify the location.
 */
export const EditLocationFormSchema = LocationDbSchema.pick({
  name: true,
  status: true,
}).partial();

export type EditLocationForm = z.infer<typeof EditLocationFormSchema>;

/**
 * LocationCodeSchema - Standalone validation for location codes.
 * Used for validating input before sanitization.
 */
export const LocationCodeSchema = z
  .string()
  .min(6, "Location code must be at least 6 characters")
  .max(50, "Location code must be at most 50 characters")
  .regex(/^[a-z0-9-]{6,50}$/, {
    message: "Location code must be lowercase alphanumeric with hyphens",
  });

/**
 * Sanitizes a string to be a valid location code.
 * - Converts to lowercase
 * - Replaces spaces and non-alphanumeric chars with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 */
export function sanitizeLocationCode(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
