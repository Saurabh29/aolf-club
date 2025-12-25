import { z } from "zod";
import { LocationDbSchema, LocationStatusSchema } from "../db/location.schema";

/**
 * UI SCHEMA FOR LOCATION - DERIVED FROM DB SCHEMA
 * 
 * IMPORTANT: This file derives all schemas from the authoritative DB schema.
 * Do NOT manually re-declare fields that exist in the DB schema.
 * Use Zod's omit/pick/extend helpers to derive UI-specific schemas.
 * 
 * Pattern:
 * 1. Import the authoritative DB schema
 * 2. Use .omit() to remove DB-only fields (locationId, timestamps)
 * 3. Use .extend() to add UI-only fields if needed
 * 4. Export derived types for type-safety
 */

/**
 * AddLocationForm UI Schema
 * 
 * Derived from LocationDbSchema by:
 * - Omitting DB-only fields: locationId, createdAt, updatedAt, status
 * - These fields are generated server-side during creation
 * 
 * Required fields from Google Places Autocomplete:
 * - placeId, formattedAddress, lat, lng (populated by autocomplete selection)
 * 
 * User-entered fields:
 * - name, locationCode
 */
export const AddLocationFormSchema = LocationDbSchema.omit({
  locationId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export type AddLocationFormData = z.infer<typeof AddLocationFormSchema>;

/**
 * Location list item for UI display
 * Derived from DB schema, picking only display-relevant fields
 */
export const LocationListItemSchema = LocationDbSchema.pick({
  locationId: true,
  locationCode: true,
  name: true,
  formattedAddress: true,
  lat: true,
  lng: true,
  status: true,
  createdAt: true,
});

export type LocationListItem = z.infer<typeof LocationListItemSchema>;

/**
 * Location detail view
 * Full location data for detail pages
 */
export const LocationDetailSchema = LocationDbSchema;

export type LocationDetail = z.infer<typeof LocationDetailSchema>;

/**
 * Google Places selection data
 * Used to capture autocomplete selection before form submission
 */
export const PlaceSelectionSchema = z.object({
  placeId: z.string().min(1, "Please select a location from the autocomplete"),
  formattedAddress: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  addressComponents: z.record(z.string(), z.object({
    long_name: z.string(),
    short_name: z.string(),
    types: z.array(z.string()),
  })).optional(),
});

export type PlaceSelection = z.infer<typeof PlaceSelectionSchema>;

/**
 * Form state for AddLocationDialog
 * Combines user input with place selection
 */
export const AddLocationDialogStateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  locationCode: z.string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 20 characters")
    .regex(/^[A-Z0-9-]+$/, "Code must be uppercase alphanumeric with hyphens"),
  placeSelection: PlaceSelectionSchema.nullable(),
});

export type AddLocationDialogState = z.infer<typeof AddLocationDialogStateSchema>;

/**
 * Server action response shape
 * All server actions return this exact shape for consistency
 */
export const ServerActionResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

export type ServerActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
