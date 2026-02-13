/**
 * DataSource Resolver (Policy Layer)
 * 
 * Phase 4: Centralized execution strategy decision.
 * 
 * Purpose:
 * ✅ Single source of truth for "which table uses which strategy"
 * ✅ Easy to change strategy without touching UI or consumers
 * ✅ Clear ownership of execution decisions
 * ❌ UI never imports this - server-side only
 * ❌ No business logic here - just routing
 * 
 * Configuration lives here, not scattered across endpoints.
 */

import type { DataSource } from "./data-source.interface";
import { InMemoryDataSource } from "./in-memory.data-source";

/**
 * Supported data source strategies
 */
export type DataSourceStrategy = "memory" | "dynamo";

/**
 * Resource name type
 * 
 * Extensible list of all queryable resources in the app.
 */
export type ResourceName =
  | "users"
  | "locations"
  | "roles"
  | "groups"
  | "pages"
  | "tasks"
  | "leads";

/**
 * Data source configuration map
 * 
 * This is the SINGLE SOURCE OF TRUTH for execution strategy.
 * 
 * Rules:
 * - Only "users" uses DynamoDB-backed querying
 * - All other tables use in-memory querying
 * - To change strategy, edit this map only
 * 
 * Phase 4: Only memory sources configured
 * Phase 5: "users" will switch to "dynamo"
 */
const DATA_SOURCE_CONFIG: Record<ResourceName, DataSourceStrategy> = {
  // Phase 5: Will use DynamoDB
  users: "memory", // TODO: Switch to "dynamo" in Phase 5

  // Always use in-memory (small, bounded datasets)
  locations: "memory",
  roles: "memory",
  groups: "memory",
  pages: "memory",

  // Future: May need DynamoDB if datasets grow large
  tasks: "memory",
  leads: "memory",
};

/**
 * DataSource factory registry
 * 
 * Maps resource names to factory functions that create data sources.
 * This is populated by registerDataSource() calls.
 */
type DataSourceFactory<T = any> = () => DataSource<T>;

const dataSourceRegistry = new Map<ResourceName, DataSourceFactory>();

/**
 * Register a data source factory for a resource
 * 
 * This is called by each resource's repository/service layer
 * to register its data source.
 * 
 * Example:
 * ```ts
 * // In roles.repository.ts
 * registerDataSource("roles", () => 
 *   new InMemoryDataSource(loadAllRoles)
 * );
 * ```
 * 
 * @param resource - Resource name
 * @param factory - Factory function that creates the data source
 */
export function registerDataSource<T>(
  resource: ResourceName,
  factory: DataSourceFactory<T>
): void {
  dataSourceRegistry.set(resource, factory);
}

/**
 * Get data source for a resource
 * 
 * This is the ONLY function consumers should call.
 * 
 * Rules:
 * ✅ Returns appropriate data source based on config
 * ✅ Validates resource name
 * ✅ Throws clear error if not registered
 * ❌ No direct DynamoDB or in-memory knowledge here
 * 
 * @param resource - Resource name
 * @returns DataSource instance for that resource
 * 
 * @throws {Error} If resource not registered
 * 
 * @example
 * ```ts
 * const userDataSource = getDataSource("users");
 * const result = await userDataSource.query(querySpec);
 * ```
 */
export function getDataSource<T = any>(resource: ResourceName): DataSource<T> {
  const factory = dataSourceRegistry.get(resource);

  if (!factory) {
    throw new Error(
      `DataSource not registered for resource: ${resource}. ` +
        `Did you forget to call registerDataSource("${resource}", factory)?`
    );
  }

  return factory() as DataSource<T>;
}

/**
 * Get configured strategy for a resource
 * 
 * Utility function for introspection/debugging.
 * Not typically needed by consumers.
 * 
 * @param resource - Resource name
 * @returns Configured strategy ("memory" or "dynamo")
 */
export function getStrategy(resource: ResourceName): DataSourceStrategy {
  return DATA_SOURCE_CONFIG[resource];
}

/**
 * Get all registered resource names
 * 
 * Utility function for debugging.
 * 
 * @returns Array of registered resource names
 */
export function getRegisteredResources(): ResourceName[] {
  return Array.from(dataSourceRegistry.keys());
}

/**
 * Clear all registered data sources
 * 
 * Only used in tests.
 */
export function clearRegistry(): void {
  dataSourceRegistry.clear();
}
