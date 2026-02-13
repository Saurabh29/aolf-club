/**
 * DataSource Interface
 * 
 * Phase 3: The abstraction that hides execution strategy from UI.
 * 
 * Rules:
 * ✅ Implementations decide how to execute queries
 * ✅ UI only knows about QuerySpec and QueryResult
 * ✅ Backend swaps implementations without UI changes
 * ❌ No DynamoDB-specific methods here
 * ❌ No implementation details leaked
 * 
 * Implementations:
 * - InMemoryDataSource<T>: Load all, query in RAM
 * - DynamoUserDataSource: Query DynamoDB directly
 * - (Future) CachedDataSource<T>: Hybrid approach
 */

import type { QuerySpec, QueryResult } from "~/lib/schemas/query";

/**
 * Universal data source interface
 * 
 * Any table data source must implement this interface.
 * The UI never calls DynamoDB or in-memory functions directly.
 * 
 * @template T The entity type (User, Location, Group, etc.)
 */
export interface DataSource<T> {
  /**
   * Execute a query against this data source
   * 
   * How this executes is implementation-specific:
   * - InMemoryDataSource: Filters/sorts an array
   * - DynamoDataSource: Builds DynamoDB Query/Scan
   * 
   * @param query - Universal query specification
   * @returns Promise of query result with items and optional cursor
   * 
   * @throws {ValidationError} If query is invalid for this data source
   * @throws {Error} If execution fails
   */
  query(query: QuerySpec): Promise<QueryResult<T>>;

  /**
   * Optional: Get a single item by ID
   * 
   * @param id - Primary identifier
   * @returns Promise of item or null if not found
   */
  getById?(id: string): Promise<T | null>;

  /**
   * Optional: Get total count (for offset pagination)
   * 
   * Only InMemoryDataSource can provide this efficiently.
   * DynamoDB-backed sources may return undefined.
   * 
   * @returns Promise of total count or undefined
   */
  count?(): Promise<number | undefined>;
}

/**
 * Configuration for data source
 */
export interface DataSourceConfig<T> {
  /**
   * Optional validator for query spec
   * 
   * Allows data source to reject unsupported queries early.
   * Example: DynamoUserDataSource only allows certain filterable fields.
   */
  validateQuery?: (query: QuerySpec) => void;

  /**
   * Optional item transformer
   * 
   * Transforms items before returning to UI.
   * Example: Remove sensitive fields, add computed properties.
   */
  transformItem?: (item: T) => T;
}
