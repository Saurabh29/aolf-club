/**
 * DynamoDB Client Configuration
 * 
 * This module provides the DynamoDB DocumentClient and helper utilities
 * for the single-table design pattern used in this application.
 * 
 * Environment Variables:
 * - DYNAMODB_TABLE_NAME: Table name (default: "aolfclub-entities")
 * - AWS_REGION: AWS region (default: "us-east-1")
 * - DYNAMODB_ENDPOINT: Local endpoint for DynamoDB Local (e.g., "http://localhost:8000")
 * 
 * When DYNAMODB_ENDPOINT is set, the client uses static local credentials.
 * Otherwise, it uses the default AWS credential chain (IAM roles, env vars, etc.).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Configuration from environment variables
export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "aolfclub-entities";
export const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT;

/**
 * Creates the DynamoDB client with appropriate configuration.
 * Uses local endpoint and credentials when DYNAMODB_ENDPOINT is set.
 */
function createDynamoDBClient(): DynamoDBClient {
  const isLocal = !!DYNAMODB_ENDPOINT;

  if (isLocal) {
    console.log(`[DynamoDB] Using local endpoint: ${DYNAMODB_ENDPOINT}`);
    return new DynamoDBClient({
      region: AWS_REGION,
      endpoint: DYNAMODB_ENDPOINT,
      credentials: {
        accessKeyId: "local",
        secretAccessKey: "local",
      },
    });
  }

  // Production: use default credential chain
  return new DynamoDBClient({
    region: AWS_REGION,
  });
}

// Create the low-level client
const ddbClient = createDynamoDBClient();

// Create the DocumentClient for simplified operations
export const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Keys - Helper object for generating PK/SK values.
 * 
 * Centralizes key generation to ensure consistency across the codebase.
 * All DynamoDB operations should use these helpers.
 * 
 * PK/SK Patterns (Single-Table Design):
 * 
 * ENTITIES (Nodes):
 * - EmailIdentity:      PK = "EMAIL#<email>",              SK = "META"
 * - User:               PK = "USER#<userId>",              SK = "META"
 * - Location:           PK = "LOCATION#<locationId>",      SK = "META"
 * - LocationCodeLookup: PK = "LOCATION_CODE#<code>",       SK = "META"
 * - UserGroup:          PK = "GROUP#<groupId>",            SK = "META"
 * - Role:               PK = "ROLE#<roleName>",            SK = "META"
 * - Page:               PK = "PAGE#<pageName>",            SK = "META"
 * 
 * RELATIONSHIPS (Edges):
 * - User→Location:      PK = "USER#<userId>",              SK = "LOCATION#<locationId>"
 * - Location→User:      PK = "LOCATION#<locationId>",      SK = "USER#<userId>"
 * - User→Group:         PK = "USER#<userId>",              SK = "GROUP#<groupId>"
 * - Group→User:         PK = "GROUP#<groupId>",            SK = "USER#<userId>"
 * - Group→Role:         PK = "GROUP#<groupId>",            SK = "ROLE#<roleName>"
 * - Role→Page:          PK = "ROLE#<roleName>",            SK = "PAGE#<pageName>"
 */
export const Keys = {
  // ===========================================================================
  // ENTITY KEYS (PK for nodes)
  // ===========================================================================
  
  /**
   * Generate PK for an EmailIdentity item.
   * @param email - User's email address
   * @returns PK in format "EMAIL#<email>"
   */
  emailPK: (email: string): string => `EMAIL#${email.toLowerCase()}`,

  /**
   * Generate PK for a User item.
   * @param userId - ULID of the user
   * @returns PK in format "USER#<userId>"
   */
  userPK: (userId: string): string => `USER#${userId}`,

  /**
   * Generate PK for a Location item.
   * @param locationId - ULID of the location
   * @returns PK in format "LOCATION#<locationId>"
   */
  locationPK: (locationId: string): string => `LOCATION#${locationId}`,

  /**
   * Generate PK for a LocationCodeLookup item.
   * @param locationCode - Human-readable location code
   * @returns PK in format "LOCATION_CODE#<locationCode>"
   */
  locationCodePK: (locationCode: string): string => `LOCATION_CODE#${locationCode}`,

  /**
   * Generate PK for a UserGroup item.
   * @param groupId - ULID of the group
   * @returns PK in format "GROUP#<groupId>"
   */
  groupPK: (groupId: string): string => `GROUP#${groupId}`,

  /**
   * Generate PK for a Role item.
   * @param roleName - Name of the role
   * @returns PK in format "ROLE#<roleName>"
   */
  rolePK: (roleName: string): string => `ROLE#${roleName}`,

  /**
   * Generate PK for a Page item.
   * @param pageName - Name of the page
   * @returns PK in format "PAGE#<pageName>"
   */
  pagePK: (pageName: string): string => `PAGE#${pageName}`,

  // ===========================================================================
  // SK VALUES
  // ===========================================================================
  
  /**
   * Generate SK for entity META items.
   * @returns "META" literal
   */
  metaSK: (): "META" => "META" as const,

  /**
   * Generate SK for User→Location or Location→User edges.
   * @param locationId - ULID of the location
   * @returns SK in format "LOCATION#<locationId>"
   */
  locationSK: (locationId: string): string => `LOCATION#${locationId}`,

  /**
   * Generate SK for Location→User or Group→User edges.
   * @param userId - ULID of the user
   * @returns SK in format "USER#<userId>"
   */
  userSK: (userId: string): string => `USER#${userId}`,

  /**
   * Generate SK for User→Group edges.
   * @param groupId - ULID of the group
   * @returns SK in format "GROUP#<groupId>"
   */
  groupSK: (groupId: string): string => `GROUP#${groupId}`,

  /**
   * Generate SK for Group→Role edges.
   * @param roleName - Name of the role
   * @returns SK in format "ROLE#<roleName>"
   */
  roleSK: (roleName: string): string => `ROLE#${roleName}`,

  /**
   * Generate SK for Role→Page edges.
   * @param pageName - Name of the page
   * @returns SK in format "PAGE#<pageName>"
   */
  pageSK: (pageName: string): string => `PAGE#${pageName}`,

  // ===========================================================================
  // SK PREFIXES (for Query operations with begins_with)
  // ===========================================================================
  
  /** Prefix for querying all locations under a USER# PK */
  LOCATION_PREFIX: "LOCATION#" as const,
  
  /** Prefix for querying all users under a LOCATION# or GROUP# PK */
  USER_PREFIX: "USER#" as const,
  
  /** Prefix for querying all groups under a USER# PK */
  GROUP_PREFIX: "GROUP#" as const,
  
  /** Prefix for querying all roles under a GROUP# PK */
  ROLE_PREFIX: "ROLE#" as const,
  
  /** Prefix for querying all pages under a ROLE# PK */
  PAGE_PREFIX: "PAGE#" as const,

  // ===========================================================================
  // DEPRECATED (kept for backward compatibility)
  // ===========================================================================
  
  /**
   * @deprecated Use metaSK() instead
   */
  locationCodeSK: (): "META" => "META" as const,
};

/**
 * Returns the current timestamp as an ISO 8601 string.
 * Used for createdAt and updatedAt fields.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Extracts the ID from a PK string.
 * @param pk - PK string (e.g., "LOCATION#01ARZ3NDEKTSV4RRFFQ69G5FAV")
 * @param prefix - Expected prefix (e.g., "LOCATION#")
 * @returns The ID portion, or null if format doesn't match
 */
export function extractIdFromPK(pk: string, prefix: string): string | null {
  if (!pk.startsWith(prefix)) {
    return null;
  }
  return pk.slice(prefix.length);
}
