/**
 * TanStack Table → QuerySpec Adapter
 * 
 * Phase 2: One-way mapping from UI table state to universal QuerySpec.
 * 
 * This adapter:
 * ✅ Isolates UI state conversion logic
 * ✅ Has no backend knowledge
 * ✅ Can be tested independently
 * ❌ Does NOT implement backend execution
 * ❌ Does NOT know about DynamoDB
 * 
 * Usage (future):
 * ```ts
 * const querySpec = tanstackStateToQuerySpec(tableState);
 * const result = await fetchData(querySpec); // Backend decides how
 * ```
 */

import type {
  QuerySpec,
  FilterCondition,
  FilterOperator,
  SortSpec,
  PaginationSpec,
} from "~/lib/schemas/query";

/**
 * Generic table state structure
 * 
 * Compatible with TanStack Table or similar table libraries.
 * This is a minimal interface - adapt as needed.
 */
export interface TableState {
  /**
   * Column filters from TanStack Table
   * Example: [{ id: "name", value: "john" }]
   */
  columnFilters?: Array<{
    id: string;
    value: unknown;
  }>;

  /**
   * Global filter (search across all columns)
   */
  globalFilter?: string;

  /**
   * Sorting state
   * Example: [{ id: "createdAt", desc: true }]
   */
  sorting?: Array<{
    id: string;
    desc: boolean;
  }>;

  /**
   * Pagination state
   */
  pagination?: {
    pageIndex: number;
    pageSize: number;
  };

  /**
   * Optional cursor for server-side pagination
   */
  cursor?: string;
}

/**
 * Configuration for filter operator mapping
 * 
 * Maps field-specific filter logic to QuerySpec operators.
 */
export interface FilterConfig {
  /**
   * Default operator for a field type
   * 
   * Example:
   * ```
   * {
   *   string: "contains",
   *   number: "eq",
   *   date: "gt"
   * }
   * ```
   */
  defaultOperator?: FilterOperator;

  /**
   * Field-specific operator overrides
   * 
   * Example:
   * ```
   * {
   *   email: "eq",
   *   name: "contains",
   *   age: "gt"
   * }
   * ```
   */
  fieldOperators?: Record<string, FilterOperator>;
}

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  /**
   * Filter operator mapping rules
   */
  filters?: FilterConfig;

  /**
   * Pagination mode preference
   * 
   * - "cursor": Use cursor-based pagination (for DynamoDB)
   * - "offset": Use offset-based pagination (for in-memory)
   * - "auto": Detect based on presence of cursor in state
   */
  paginationMode?: "cursor" | "offset" | "auto";

  /**
   * Default page size if not specified
   */
  defaultPageSize?: number;
}

/**
 * Converts TanStack Table state to QuerySpec
 * 
 * This is a pure transformation - no side effects, no backend calls.
 * 
 * @param state - Table state from TanStack Table or compatible library
 * @param config - Optional configuration for mapping behavior
 * @returns QuerySpec that can be sent to any backend
 * 
 * @example
 * ```ts
 * const tableState = {
 *   columnFilters: [{ id: "name", value: "john" }],
 *   sorting: [{ id: "createdAt", desc: true }],
 *   pagination: { pageIndex: 0, pageSize: 20 }
 * };
 * 
 * const querySpec = tanstackStateToQuerySpec(tableState);
 * // {
 * //   filters: [{ field: "name", op: "contains", value: "john" }],
 * //   sort: { field: "createdAt", direction: "desc" },
 * //   pagination: { mode: "offset", limit: 20, offset: 0 }
 * // }
 * ```
 */
export function tanstackStateToQuerySpec(
  state: TableState,
  config: AdapterConfig = {}
): QuerySpec {
  const {
    filters: filterConfig = {},
    paginationMode = "auto",
    defaultPageSize = 20,
  } = config;

  const querySpec: QuerySpec = {};

  // Convert column filters to QuerySpec filters
  if (state.columnFilters && state.columnFilters.length > 0) {
    querySpec.filters = state.columnFilters.map((filter) => {
      // Determine operator based on field and config
      const operator =
        filterConfig.fieldOperators?.[filter.id] ||
        filterConfig.defaultOperator ||
        getDefaultOperator(filter.value);

      const condition: FilterCondition = {
        field: filter.id,
        op: operator,
        value: filter.value,
      };

      return condition;
    });
  }

  // Convert global filter to multi-field search (if needed)
  // For now, we'll skip this - it's data-source specific
  // Backend can handle globalFilter separately

  // Convert sorting
  if (state.sorting && state.sorting.length > 0) {
    // Take first sort field (multi-sort not supported in Phase 1)
    const firstSort = state.sorting[0];
    const sortSpec: SortSpec = {
      field: firstSort.id,
      direction: firstSort.desc ? "desc" : "asc",
    };
    querySpec.sort = sortSpec;
  }

  // Convert pagination
  if (state.pagination) {
    const { pageIndex, pageSize } = state.pagination;
    const limit = pageSize || defaultPageSize;

    // Determine pagination mode
    let mode: "cursor" | "offset" = "offset";
    if (paginationMode === "cursor") {
      mode = "cursor";
    } else if (paginationMode === "auto" && state.cursor) {
      mode = "cursor";
    }

    const paginationSpec: PaginationSpec = {
      mode,
      limit,
    };

    if (mode === "cursor" && state.cursor) {
      paginationSpec.cursor = state.cursor;
    } else if (mode === "offset") {
      paginationSpec.offset = pageIndex * limit;
    }

    querySpec.pagination = paginationSpec;
  }

  return querySpec;
}

/**
 * Infer default filter operator based on value type
 * 
 * @param value - Filter value
 * @returns Appropriate operator
 */
function getDefaultOperator(value: unknown): FilterOperator {
  if (typeof value === "string") {
    return "contains"; // Case-insensitive substring match
  }
  if (typeof value === "number") {
    return "eq"; // Exact match for numbers
  }
  // Default to equality for boolean, null, etc.
  return "eq";
}

/**
 * Reverse adapter: QueryResult → TanStack Table pagination state
 * 
 * Phase 2: Not needed yet, but included for completeness.
 * This helps UI update its state after receiving results.
 * 
 * @param result - Query result from backend
 * @param currentState - Current table state
 * @returns Updated table state
 */
export function queryResultToTableState<T>(
  result: { items: T[]; nextCursor?: string; totalCount?: number },
  currentState: TableState
): Partial<TableState> {
  const update: Partial<TableState> = {};

  // Update cursor if present
  if (result.nextCursor) {
    update.cursor = result.nextCursor;
  }

  // Could update pagination state based on totalCount
  // But that's UI-specific, so leave it for now

  return update;
}
