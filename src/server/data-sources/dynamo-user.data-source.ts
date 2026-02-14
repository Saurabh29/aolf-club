/**
 * DynamoDB User Data Source
 * 
 * Implements querying for User entities from DynamoDB using docClient.
 * Uses cursor-based pagination and scan operations.
 * 
 * Phase 5 Implementation:
 * - Uses docClient (NOT ElectroDB)
 * - Cursor-based pagination with ExclusiveStartKey
 * - FilterExpression for filtering
 * - No sorting (all users have SK="META")
 */

import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { DataSource } from "~/server/data-sources/data-source.interface";
import type { QuerySpec, QueryResult, FilterCondition, PaginationSpec } from "~/lib/schemas/query";
import type { User } from "~/lib/schemas/db/user.schema";
import { UserSchema } from "~/lib/schemas/db/user.schema";
import { docClient, TABLE_NAME, Keys } from "~/server/db/client";
import { validateFilters, USER_FILTERABLE_FIELDS, FilterValidationError } from "~/server/data-sources/query-validation";

/**
 * DynamoUserDataSource - DynamoDB-backed data source for User entities.
 * 
 * Uses docClient's ScanCommand since users don't share a common PK value.
 * Each user has a unique PK (USER#<userId>), so we scan with filters.
 * 
 * Phase 7: Includes filter validation to prevent unsafe queries.
 */
export class DynamoUserDataSource implements DataSource<User> {
  async query(spec: QuerySpec): Promise<QueryResult<User>> {
    // Phase 7: Validate filters against allowed fields
    try {
      validateFilters(spec, USER_FILTERABLE_FIELDS);
    } catch (error) {
      if (error instanceof FilterValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }

    // Build FilterExpression and ExpressionAttributeValues
    const { filterExpression, expressionAttributeNames, expressionAttributeValues } = 
      this.buildFilterExpression(spec.filters);

    // Extract pagination parameters
    const { limit, exclusiveStartKey } = this.extractPagination(spec.pagination);

    // Build scan command
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: filterExpression || undefined,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
        ? expressionAttributeNames 
        : undefined,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 
        ? expressionAttributeValues 
        : undefined,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey || undefined,
    });

    try {
      const result = await docClient.send(scanCommand);

      // Parse and validate items
      const items = (result.Items ?? [])
        .filter(item => item.PK?.startsWith("USER#") && item.SK === "META")
        .map(item => {
          try {
            return UserSchema.parse(item);
          } catch (error) {
            console.error("[DynamoUserDataSource] Failed to parse user:", error);
            return null;
          }
        })
        .filter((item): item is User => item !== null);

      // Convert LastEvaluatedKey to cursor string
      const nextCursor = result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
        : undefined;

      return {
        items,
        nextCursor,
        totalCount: undefined, // Scan doesn't provide total count efficiently
      };
    } catch (error) {
      console.error("[DynamoUserDataSource] Scan failed:", error);
      throw new Error(
        `Failed to query users: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Build DynamoDB FilterExpression from QuerySpec filters.
   * 
   * Note: DynamoDB scan filters are applied after reading items (consumes RCU).
   * Phase 7 will add validation to limit which fields can be filtered.
   */
  private buildFilterExpression(filters?: FilterCondition[]): {
    filterExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, any>;
  } {
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    const conditions: string[] = [];

    if (!filters || filters.length === 0) {
      return {
        filterExpression: "",
        expressionAttributeNames,
        expressionAttributeValues,
      };
    }

    filters.forEach((filter, index) => {
      const fieldPlaceholder = `#field${index}`;
      const valuePlaceholder = `:value${index}`;
      
      expressionAttributeNames[fieldPlaceholder] = filter.field;
      expressionAttributeValues[valuePlaceholder] = filter.value;

      switch (filter.op) {
        case "eq":
          conditions.push(`${fieldPlaceholder} = ${valuePlaceholder}`);
          break;
        case "contains":
          conditions.push(`contains(${fieldPlaceholder}, ${valuePlaceholder})`);
          break;
        case "gt":
          conditions.push(`${fieldPlaceholder} > ${valuePlaceholder}`);
          break;
        case "lt":
          conditions.push(`${fieldPlaceholder} < ${valuePlaceholder}`);
          break;
        default:
          console.warn(`[DynamoUserDataSource] Unsupported filter operator: ${filter.op}`);
      }
    });

    return {
      filterExpression: conditions.join(" AND "),
      expressionAttributeNames,
      expressionAttributeValues,
    };
  }

  /**
   * Extract pagination parameters from QuerySpec.
   * Converts cursor string to DynamoDB ExclusiveStartKey.
   */
  private extractPagination(pagination?: PaginationSpec): {
    limit: number;
    exclusiveStartKey: Record<string, any> | null;
  } {
    if (!pagination) {
      return { limit: 50, exclusiveStartKey: null };
    }

    const limit = pagination.limit ?? 50;

    // Handle cursor-based pagination
    if ("cursor" in pagination && pagination.cursor) {
      try {
        const decoded = Buffer.from(pagination.cursor, "base64").toString("utf-8");
        const exclusiveStartKey = JSON.parse(decoded);
        return { limit, exclusiveStartKey };
      } catch (error) {
        console.error("[DynamoUserDataSource] Invalid cursor:", error);
        return { limit, exclusiveStartKey: null };
      }
    }

    // Handle offset-based pagination (not ideal for DynamoDB)
    if ("offset" in pagination && pagination.offset && pagination.offset > 0) {
      console.warn(
        "[DynamoUserDataSource] Offset-based pagination is inefficient for DynamoDB. " +
        "Consider using cursor-based pagination instead."
      );
      // We can't efficiently implement offset with DynamoDB
      // Would need to scan offset+limit items and discard first offset items
      // For now, just use cursor-based approach
    }

    return { limit, exclusiveStartKey: null };
  }

  /**
   * Get user by ID (optional optimization).
   * Uses GetCommand for efficient single-item retrieval.
   */
  async getById(userId: string): Promise<User | null> {
    const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
    
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: Keys.userPK(userId),
            SK: Keys.metaSK(),
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      return UserSchema.parse(result.Item);
    } catch (error) {
      console.error("[DynamoUserDataSource] GetById failed:", error);
      throw new Error(
        `Failed to get user by ID: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
