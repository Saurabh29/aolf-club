import { z } from "zod";

/**
 * AUTHORITATIVE DB SCHEMA FOR LOCATION
 * 
 * This is the single source of truth for all Location fields.
 * UI schemas MUST be derived from this schema using Zod's omit/pick/extend helpers.
 * Do NOT duplicate these field definitions elsewhere.
 * 
 * Key design decisions:
 * - locationId: ULID format (not UUID) for sortable, unique IDs
 * - locationCode: Human-friendly code, uniqueness enforced via lookup item pattern
 * - placeId: Required - addresses come ONLY from Google Places Autocomplete
 * - status: Supports soft-delete via 'inactive' status
 */

// ULID regex pattern: 26 characters, Crockford's Base32
const ulidPattern = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

/**
 * Address component from Google Places API
 */
export const AddressComponentSchema = z.object({
  long_name: z.string(),
  short_name: z.string(),
  types: z.array(z.string()),
});

export type AddressComponent = z.infer<typeof AddressComponentSchema>;

/**
 * Structured address components map
 * Keys are component types (e.g., 'street_number', 'locality', 'country')
 */
export const AddressComponentsMapSchema = z.record(z.string(), AddressComponentSchema).optional();

export type AddressComponentsMap = z.infer<typeof AddressComponentsMapSchema>;

/**
 * Location status enum
 */
export const LocationStatusSchema = z.enum(["active", "inactive"]);

export type LocationStatus = z.infer<typeof LocationStatusSchema>;

/**
 * AUTHORITATIVE Location DB Schema
 * 
 * All persisted Location fields are defined here.
 * UI schemas derive from this using Zod composition helpers.
 */
export const LocationDbSchema = z.object({
  // Primary identifier - ULID format, generated server-side
  locationId: z.string().regex(ulidPattern, "locationId must be a valid ULID"),
  
  // Human-friendly unique code (e.g., "SF-001", "NYC-MAIN")
  // Uniqueness enforced via lookup item pattern in DynamoDB
  locationCode: z.string()
    .min(2, "locationCode must be at least 2 characters")
    .max(20, "locationCode must be at most 20 characters")
    .regex(/^[A-Z0-9-]+$/, "locationCode must be uppercase alphanumeric with hyphens only"),
  
  // Display name for the location
  name: z.string()
    .min(1, "name is required")
    .max(100, "name must be at most 100 characters"),
  
  // Google Places ID - REQUIRED, addresses come only from Places Autocomplete
  placeId: z.string().min(1, "placeId is required from Google Places Autocomplete"),
  
  // Formatted address from Google Places
  formattedAddress: z.string().min(1, "formattedAddress is required"),
  
  // Structured address components (optional, for detailed address parsing)
  addressComponents: AddressComponentsMapSchema,
  
  // Latitude - required, from Google Places
  lat: z.number().min(-90).max(90),
  
  // Longitude - required, from Google Places
  lng: z.number().min(-180).max(180),
  
  // Location status for soft-delete support
  status: LocationStatusSchema.default("active"),
  
  // ISO 8601 timestamp strings
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Exported TypeScript type derived from the DB schema
 */
export type Location = z.infer<typeof LocationDbSchema>;

/**
 * DynamoDB item shape for Location
 * Includes PK/SK for single-table design
 */
export const LocationDynamoItemSchema = LocationDbSchema.extend({
  PK: z.string(), // LOCATION#<locationId>
  SK: z.string(), // METADATA
});

export type LocationDynamoItem = z.infer<typeof LocationDynamoItemSchema>;

/**
 * Lookup item schema for locationCode uniqueness
 * Used in TransactWrite to enforce unique codes atomically
 */
export const LocationCodeLookupItemSchema = z.object({
  PK: z.string(), // LOCATION_CODE#<locationCode>
  SK: z.string(), // LOOKUP
  locationId: z.string().regex(ulidPattern),
  locationCode: z.string(),
});

export type LocationCodeLookupItem = z.infer<typeof LocationCodeLookupItemSchema>;

/**
 * CreateLocation input type - derived from DB schema
 * Omits server-generated fields (locationId, timestamps)
 */
export const CreateLocationInputSchema = LocationDbSchema.omit({
  locationId: true,
  createdAt: true,
  updatedAt: true,
  status: true, // Defaults to 'active' on creation
});

export type CreateLocationInput = z.infer<typeof CreateLocationInputSchema>;
