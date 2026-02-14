/**
 * Data Source Exports
 * 
 * Central export point for data source abstractions
 */

export type { DataSource, DataSourceConfig } from "./data-source.interface";
export {
  InMemoryDataSource,
  applyFilters,
  applySort,
  applyOffsetPagination,
  type DataLoader,
} from "./in-memory.data-source";
export { DynamoUserDataSource } from "./dynamo-user.data-source";
export {
  registerDataSource,
  getDataSource,
  getStrategy,
  getRegisteredResources,
  clearRegistry,
  type DataSourceStrategy,
  type ResourceName,
} from "./resolver";
export { initializeDataSources, ensureDataSourcesInitialized } from "./init";
export {
  validateFilters,
  buildUserFilters,
  FilterValidationError,
  USER_FILTERABLE_FIELDS,
  UserFilterBuilder,
  type FilterableFieldConfig,
} from "./query-validation";
