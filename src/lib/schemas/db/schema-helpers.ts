/**
 * Schema Helper Types for DynamoDB Repository Layer
 * 
 * These utility types derive repository input types from Zod schemas,
 * ensuring type safety between DB schemas and repository operations.
 * 
 * The DB Zod schema is the single source of truth for persisted fields.
 * Repository input types are derived from these schemas, omitting
 * auto-generated fields (PK, SK, itemType, timestamps, IDs).
 */

import type { z } from "zod";

/**
 * CreateInput<TSchema, TIdField>
 * 
 * Derives the input type for creating a new entity.
 * Omits DynamoDB key fields (PK, SK), itemType, timestamps, and the specified ID field.
 * 
 * @example
 * export type CreateLocationInput = CreateInput<typeof LocationSchema, "locationId">;
 * // Results in: Omit<Location, "PK" | "SK" | "itemType" | "createdAt" | "updatedAt" | "locationId">
 */
export type CreateInput<
  TSchema extends z.ZodType,
  TIdField extends string = never
> = Omit<
  z.infer<TSchema>,
  "PK" | "SK" | "itemType" | "createdAt" | "updatedAt" | TIdField
>;

/**
 * UpdateInput<TSchema, TIdField>
 * 
 * Derives the input type for updating an existing entity.
 * All fields are partial (optional), and omits PK, SK, itemType, createdAt, and the ID field.
 * The updatedAt field is retained as it will be set by the repository.
 * 
 * @example
 * export type UpdateLocationInput = UpdateInput<typeof LocationSchema, "locationId">;
 * // Results in: Partial<Omit<Location, "PK" | "SK" | "itemType" | "createdAt" | "locationId">>
 */
export type UpdateInput<
  TSchema extends z.ZodType,
  TIdField extends string = never
> = Partial<
  Omit<z.infer<TSchema>, "PK" | "SK" | "itemType" | "createdAt" | TIdField>
>;
