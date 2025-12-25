/**
 * Location Database Schema
 * 
 * This is the AUTHORITATIVE Zod schema for Location entities persisted in DynamoDB.
 * All UI schemas must be DERIVED from this schema using Zod composition helpers
 * (omit, pick, extend) — never duplicate field definitions.
 * 
 * DynamoDB Single-Table Design:
 * - Location item: PK = "LOCATION#<locationId>", SK = "META"
 * - Lookup item: PK = "LOCATION_CODE#<locationCode>", SK = "META" (for uniqueness)
 * 
 * The locationCode uniqueness is enforced via TransactWrite with a lookup item pattern.
 * See src/server/db/repositories/location.repository.ts for implementation.
 */

import { z } from "zod";

/**
 * Address components extracted from Google Places API.
 * These are optional structured fields for city, state, zip, etc.
 */
export const AddressComponentsSchema = z.object({
  streetNumber: z.string().optional(),
  route: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
}).optional();

export type AddressComponents = z.infer<typeof AddressComponentsSchema>;

/**
 * Location status enum.
 * - "active": Location is operational and visible
 * - "inactive": Location is soft-deleted (hidden from normal views)
 */
export const LocationStatusSchema = z.enum(["active", "inactive"]);
export type LocationStatus = z.infer<typeof LocationStatusSchema>;

/**
 * ULID pattern for validation.
 * ULIDs are 26 characters, Crockford Base32 encoded.
 */
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

/**
 * Location code pattern.
 * Human-readable unique identifier: lowercase alphanumeric with hyphens, 6-50 chars.
 * Examples: "austin-main", "nyc-downtown-01", "sf-mission-district"
 */
const LOCATION_CODE_PATTERN = /^[a-z0-9-]{6,50}$/;

/**
 * LocationSchema - The authoritative DB schema for Location entities.
 * 
 * Fields:
 * - PK/SK: DynamoDB primary key components
 * - itemType: Discriminator for single-table design filtering
 * - locationId: ULID primary identifier (generated server-side)
 * - locationCode: Human-readable unique code
 * - name: Display name for the location
 * - placeId: Google Places API place_id
 * - formattedAddress: Full address string from Google Places
 * - addressComponents: Structured address parts
 * - lat/lng: Geographic coordinates
 * - status: Active or inactive (soft-delete)
 * - createdAt/updatedAt: ISO 8601 timestamps
 */
export const LocationSchema = z.object({
  // DynamoDB Key Fields
  PK: z.string().regex(/^LOCATION#[0-9A-HJKMNP-TV-Z]{26}$/i, {
    message: "PK must be in format LOCATION#<ULID>",
  }),
  SK: z.literal("META"),
  itemType: z.literal("Location"),

  // Primary Identifier (ULID, generated server-side)
  locationId: z.string().regex(ULID_PATTERN, {
    message: "locationId must be a valid ULID",
  }),

  // Human-readable unique code
  locationCode: z
    .string()
    .min(6, "Location code must be at least 6 characters")
    .max(50, "Location code must be at most 50 characters")
    .regex(LOCATION_CODE_PATTERN, {
      message: "Location code must be lowercase alphanumeric with hyphens (6-50 chars)",
    }),

  // Display name
  name: z.string().min(1, "Name is required").max(200, "Name must be at most 200 characters"),

  // Google Places data (required at creation, but optional in schema for flexibility)
  placeId: z.string().min(1).optional(),
  formattedAddress: z.string().min(1).optional(),
  addressComponents: AddressComponentsSchema,

  // Geographic coordinates
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),

  // Status for soft-delete
  status: LocationStatusSchema.default("active"),

  // Timestamps (ISO 8601)
  createdAt: z.string().datetime({ message: "createdAt must be a valid ISO datetime" }),
  updatedAt: z.string().datetime({ message: "updatedAt must be a valid ISO datetime" }),
});

export type Location = z.infer<typeof LocationSchema>;

/**
 * LocationCodeLookupSchema - Schema for the lookup item that enforces locationCode uniqueness.
 * 
 * This item is created atomically with the Location item via TransactWrite.
 * It maps locationCode -> locationId for quick lookups and uniqueness enforcement.
 */
export const LocationCodeLookupSchema = z.object({
  PK: z.string().regex(/^LOCATION_CODE#[a-z0-9-]{6,50}$/, {
    message: "PK must be in format LOCATION_CODE#<locationCode>",
  }),
  SK: z.literal("META"),
  itemType: z.literal("LocationCodeLookup"),
  locationId: z.string().regex(ULID_PATTERN, {
    message: "locationId must be a valid ULID",
  }),
  locationCode: z.string().regex(LOCATION_CODE_PATTERN),
  createdAt: z.string().datetime(),
});

export type LocationCodeLookup = z.infer<typeof LocationCodeLookupSchema>;
