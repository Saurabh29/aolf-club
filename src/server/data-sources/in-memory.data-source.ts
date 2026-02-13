/**
 * In-Memory DataSource Implementation
 * 
 * Phase 3: Safe, simple, debuggable execution strategy.
 * 
 * Strategy:
 * 1. Load all data into memory (via loader function)
 * 2. Apply filters in JavaScript
 * 3. Apply sort in JavaScript
 * 4. Apply offset pagination
 * 
 * Advantages:
 * ✅ Works for any entity type
 * ✅ Supports all filter operators
 * ✅ Easy to debug
 * ✅ No infrastructure complexity
 * ✅ Predictable performance for small datasets
 * 
 * Disadvantages:
 * ❌ Loads all data every time
 * ❌ Not suitable for large datasets (>1000 items)
 * ❌ No true cursor pagination
 * 
 * Recommended for:
 * - Roles, Groups, Pages (< 100 items)
 * - Admin configuration tables
 * - Lookup tables
 * 
 * NOT recommended for:
 * - Users (can be 10,000+)
 * - Tasks, Leads (unbounded growth)
 */

import type { DataSource } from "./data-source.interface";
import type {
  QuerySpec,
  QueryResult,
  FilterCondition,
  SortSpec,
} from "~/lib/schemas/query";

/**
 * Loader function type
 * 
 * Provides all items for in-memory querying.
 * This function should be efficient (e.g., scan cached table).
 */
export type DataLoader<T> = () => Promise<T[]>;

/**
 * In-memory data source implementation
 * 
 * @template T Entity type
 */
export class InMemoryDataSource<T> implements DataSource<T> {
  constructor(
    private loader: DataLoader<T>,
    private options: { idField?: keyof T } = {}
  ) {}

  /**
   * Execute query in memory
   */
  async query(querySpec: QuerySpec): Promise<QueryResult<T>> {
    // Load all items
    let items = await this.loader();

    // Apply filters
    if (querySpec.filters && querySpec.filters.length > 0) {
      items = applyFilters(items, querySpec.filters);
    }

    // Apply sort
    if (querySpec.sort) {
      items = applySort(items, querySpec.sort);
    }

    // Get total count before pagination
    const totalCount = items.length;

    // Apply pagination
    if (querySpec.pagination) {
      const { mode, limit, offset } = querySpec.pagination;

      if (mode === "offset") {
        const start = offset || 0;
        const end = start + limit;
        items = items.slice(start, end);
      } else {
        // Cursor mode: treat cursor as offset for in-memory
        // (This is a simplification - real cursor would be opaque)
        const start = querySpec.pagination.cursor
          ? parseInt(querySpec.pagination.cursor, 10)
          : 0;
        const end = start + limit;
        items = items.slice(start, end);
      }
    }

    return {
      items,
      totalCount,
      // No true cursor for in-memory
      nextCursor: undefined,
    };
  }

  /**
   * Get single item by ID
   */
  async getById(id: string): Promise<T | null> {
    const items = await this.loader();
    const idField = this.options.idField || ("id" as keyof T);
    return items.find((item) => String(item[idField]) === id) || null;
  }

  /**
   * Get total count
   */
  async count(): Promise<number> {
    const items = await this.loader();
    return items.length;
  }
}

/**
 * Apply filters to an array of items
 * 
 * @param items - Items to filter
 * @param filters - Filter conditions
 * @returns Filtered items
 */
export function applyFilters<T>(
  items: T[],
  filters: FilterCondition[]
): T[] {
  return items.filter((item) => {
    // Item must match ALL filters (AND logic)
    return filters.every((filter) => matchesFilter(item, filter));
  });
}

/**
 * Check if item matches a single filter condition
 * 
 * @param item - Item to check
 * @param filter - Filter condition
 * @returns True if item matches filter
 */
function matchesFilter<T>(item: T, filter: FilterCondition): boolean {
  const itemValue = getNestedValue(item, filter.field);
  const filterValue = filter.value;

  switch (filter.op) {
    case "eq":
      return itemValue === filterValue;

    case "contains":
      // Case-insensitive substring match for strings
      if (typeof itemValue === "string" && typeof filterValue === "string") {
        return itemValue.toLowerCase().includes(filterValue.toLowerCase());
      }
      return false;

    case "gt":
      if (typeof itemValue === "number" && typeof filterValue === "number") {
        return itemValue > filterValue;
      }
      if (typeof itemValue === "string" && typeof filterValue === "string") {
        return itemValue > filterValue; // Lexicographic comparison
      }
      return false;

    case "lt":
      if (typeof itemValue === "number" && typeof filterValue === "number") {
        return itemValue < filterValue;
      }
      if (typeof itemValue === "string" && typeof filterValue === "string") {
        return itemValue < filterValue;
      }
      return false;

    default:
      // Unknown operator - fail safe
      return false;
  }
}

/**
 * Apply sort to an array of items
 * 
 * @param items - Items to sort
 * @param sort - Sort specification
 * @returns Sorted items (new array)
 */
export function applySort<T>(items: T[], sort: SortSpec): T[] {
  return [...items].sort((a, b) => {
    const aValue = getNestedValue(a, sort.field);
    const bValue = getNestedValue(b, sort.field);

    // Handle nullish values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    } else {
      // Fallback: string comparison
      comparison = String(aValue).localeCompare(String(bValue));
    }

    // Apply direction
    return sort.direction === "desc" ? -comparison : comparison;
  });
}

/**
 * Apply offset pagination to an array of items
 * 
 * @param items - Items to paginate
 * @param offset - Start index
 * @param limit - Number of items
 * @returns Paginated items
 */
export function applyOffsetPagination<T>(
  items: T[],
  offset: number,
  limit: number
): T[] {
  return items.slice(offset, offset + limit);
}

/**
 * Get nested value from object using dot notation
 * 
 * Example: getNestedValue(user, "profile.name") => user.profile.name
 * 
 * @param obj - Object to extract value from
 * @param path - Dot-separated path
 * @returns Value at path or undefined
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}
