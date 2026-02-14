/**
 * Query Validation
 * 
 * Phase 7: Field-level filtering validation for DynamoDB tables.
 * 
 * Purpose:
 * - Prevent filtering on non-indexed fields (poor performance)
 * - Whitelist only safe, meaningful filter fields
 * - Provide clear error messages for unsupported filters
 * - Protect against accidental full-table scans with heavy filters
 * 
 * Only DynamoDB-backed tables need this validation.
 * In-memory sources can filter on any field.
 */

import type { QuerySpec, FilterCondition } from "~/lib/schemas/query";

/**
 * Filterable field configuration for a resource
 */
export interface FilterableFieldConfig {
  /** List of field names that can be filtered */
  allowedFields: string[];
  
  /** Optional: Field-specific operator restrictions */
  fieldOperators?: Record<string, string[]>;
  
  /** Human-readable resource name for error messages */
  resourceName: string;
}

/**
 * User table filterable fields configuration
 * 
 * Rationale for each field:
 * - userType: Common filter (Volunteer/Lead/Partner)
 * - isAdmin: Common filter (admin users)
 * - activeLocationId: Filter users by location
 * - userType: Filter by user type
 * - createdAt: Date range queries (onboarding reports)
 * - updatedAt: Recently modified users
 * 
 * NOT allowed (for performance/security):
 * - displayName: Free-text, use search endpoint instead
 * - email: PII, use exact lookup endpoint
 * - phone: PII, not indexed
 * - image: No valid use case
 */
export const USER_FILTERABLE_FIELDS: FilterableFieldConfig = {
  resourceName: "User",
  allowedFields: [
    "userType",
    "isAdmin",
    "activeLocationId",
    "locationId",
    "createdAt",
    "updatedAt",
  ],
  fieldOperators: {
    userType: ["eq"], // Only exact match
    isAdmin: ["eq"], // Only exact match
    activeLocationId: ["eq"], // Only exact match
    locationId: ["eq"], // Only exact match
    createdAt: ["gt", "lt", "eq"], // Date range queries
    updatedAt: ["gt", "lt", "eq"], // Date range queries
  },
};

/**
 * Validation error class for unsupported filters
 */
export class FilterValidationError extends Error {
  constructor(
    public field: string,
    public operator: string,
    public allowedFields: string[],
    message: string
  ) {
    super(message);
    this.name = "FilterValidationError";
  }
}

/**
 * Validate QuerySpec filters against allowed fields
 * 
 * @param spec Query specification to validate
 * @param config Filterable field configuration
 * @throws FilterValidationError if validation fails
 */
export function validateFilters(
  spec: QuerySpec,
  config: FilterableFieldConfig
): void {
  if (!spec.filters || spec.filters.length === 0) {
    return; // No filters to validate
  }

  for (const filter of spec.filters) {
    validateSingleFilter(filter, config);
  }
}

/**
 * Validate a single filter condition
 */
function validateSingleFilter(
  filter: FilterCondition,
  config: FilterableFieldConfig
): void {
  const { field, op } = filter;

  // Check if field is in allowed list
  if (!config.allowedFields.includes(field)) {
    throw new FilterValidationError(
      field,
      op,
      config.allowedFields,
      `Cannot filter ${config.resourceName} by field "${field}". ` +
      `Allowed fields: ${config.allowedFields.join(", ")}. ` +
      `Use a specific endpoint for other lookups.`
    );
  }

  // Check if operator is allowed for this field
  if (config.fieldOperators && config.fieldOperators[field]) {
    const allowedOps = config.fieldOperators[field];
    if (!allowedOps.includes(op)) {
      throw new FilterValidationError(
        field,
        op,
        config.allowedFields,
        `Operator "${op}" is not supported for field "${field}". ` +
        `Allowed operators for ${field}: ${allowedOps.join(", ")}.`
      );
    }
  }
}

/**
 * Type-safe filter builder for User table
 * 
 * Provides compile-time safety for filter construction.
 * 
 * @example
 * ```typescript
 * const filters = buildUserFilters()
 *   .byUserType("Volunteer")
 *   .byLocation("01HQ7X8Y9Z...")
 *   .createdAfter("2026-01-01T00:00:00Z")
 *   .build();
 * ```
 */
export class UserFilterBuilder {
  private filters: FilterCondition[] = [];

  byUserType(userType: "Volunteer" | "Lead" | "Partner"): this {
    this.filters.push({ field: "userType", op: "eq", value: userType });
    return this;
  }

  byAdmin(isAdmin: boolean): this {
    this.filters.push({ field: "isAdmin", op: "eq", value: isAdmin });
    return this;
  }

  byActiveLocation(locationId: string): this {
    this.filters.push({ field: "activeLocationId", op: "eq", value: locationId });
    return this;
  }

  byLocation(locationId: string): this {
    this.filters.push({ field: "locationId", op: "eq", value: locationId });
    return this;
  }

  createdAfter(date: string): this {
    this.filters.push({ field: "createdAt", op: "gt", value: date });
    return this;
  }

  createdBefore(date: string): this {
    this.filters.push({ field: "createdAt", op: "lt", value: date });
    return this;
  }

  updatedAfter(date: string): this {
    this.filters.push({ field: "updatedAt", op: "gt", value: date });
    return this;
  }

  updatedBefore(date: string): this {
    this.filters.push({ field: "updatedAt", op: "lt", value: date });
    return this;
  }

  build(): FilterCondition[] {
    return this.filters;
  }
}

/**
 * Helper: Create a User filter builder
 */
export function buildUserFilters(): UserFilterBuilder {
  return new UserFilterBuilder();
}
