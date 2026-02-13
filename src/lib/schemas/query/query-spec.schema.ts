/**
 * QuerySpec - Data-source agnostic query specification
 * 
 * Phase 1: Ground truth for filtering, sorting, and pagination.
 * This schema has NO knowledge of:
 * - DynamoDB
 * - TanStack Table
 * - Any specific backend implementation
 * 
 * It represents pure query intent.
 */

import { z } from "zod";

/**
 * Filter operators supported across all data sources
 */
export const FilterOperatorSchema = z.enum([
  "eq",        // Equals
  "contains",  // String contains (case-insensitive)
  "gt",        // Greater than
  "lt",        // Less than
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * Single filter condition
 */
export const FilterConditionSchema = z.object({
  field: z.string().min(1, "Field name is required"),
  op: FilterOperatorSchema,
  value: z.unknown(), // Value type depends on field
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

/**
 * Sort direction
 */
export const SortDirectionSchema = z.enum(["asc", "desc"]);

export type SortDirection = z.infer<typeof SortDirectionSchema>;

/**
 * Sort specification
 */
export const SortSpecSchema = z.object({
  field: z.string().min(1, "Sort field is required"),
  direction: SortDirectionSchema,
});

export type SortSpec = z.infer<typeof SortSpecSchema>;

/**
 * Pagination mode
 * - cursor: Server-side pagination with opaque cursor (for DynamoDB)
 * - offset: Traditional offset/limit pagination (for in-memory)
 */
export const PaginationModeSchema = z.enum(["cursor", "offset"]);

export type PaginationMode = z.infer<typeof PaginationModeSchema>;

/**
 * Pagination specification
 */
export const PaginationSpecSchema = z.object({
  mode: PaginationModeSchema,
  limit: z.number().int().positive().max(100, "Limit cannot exceed 100"),
  cursor: z.string().optional(), // For cursor-based pagination
  offset: z.number().int().nonnegative().optional(), // For offset-based pagination
});

export type PaginationSpec = z.infer<typeof PaginationSpecSchema>;

/**
 * Complete query specification
 * 
 * This is the universal query language:
 * - UI produces this
 * - Backend consumes this
 * - Implementation is hidden
 */
export const QuerySpecSchema = z.object({
  filters: z.array(FilterConditionSchema).optional(),
  sort: SortSpecSchema.optional(),
  pagination: PaginationSpecSchema.optional(),
});

export type QuerySpec = z.infer<typeof QuerySpecSchema>;

/**
 * Query result envelope
 * 
 * Uniform response shape regardless of data source:
 * - InMemoryDataSource returns this
 * - DynamoDataSource returns this
 * - UI only sees this
 */
export const QueryResultSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().optional(), // Undefined for in-memory or last page
    totalCount: z.number().int().nonnegative().optional(), // Only for in-memory
  });

export type QueryResult<T> = {
  items: T[];
  nextCursor?: string;
  totalCount?: number;
};
