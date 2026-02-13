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
export {
  registerDataSource,
  getDataSource,
  getStrategy,
  getRegisteredResources,
  clearRegistry,
  type DataSourceStrategy,
  type ResourceName,
} from "./resolver";
