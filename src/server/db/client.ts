import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * DynamoDB Client Configuration
 * 
 * Environment-aware client that supports:
 * - Local development with DynamoDB Local (Docker)
 * - Production AWS DynamoDB
 * 
 * Environment Variables:
 * - DYNAMODB_LOCAL_ENDPOINT: Set for local development (e.g., http://localhost:8000)
 * - AWS_REGION: AWS region (default: us-east-1)
 * - DYNAMODB_TABLE_NAME: Single table name for all entities
 */

const isLocal = !!process.env.DYNAMODB_LOCAL_ENDPOINT;

const clientConfig = isLocal
  ? {
      region: process.env.AWS_REGION || "us-east-1",
      endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
      },
    }
  : {
      region: process.env.AWS_REGION || "us-east-1",
      // In production, use IAM roles or environment credentials
    };

/**
 * Base DynamoDB client
 */
const dynamoClient = new DynamoDBClient(clientConfig);

/**
 * DocumentClient with marshalling/unmarshalling
 * Use this for all DynamoDB operations
 */
export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Table name from environment
 */
export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "aolf-club-locations";

/**
 * PK/SK key builders for single-table design
 * 
 * Pattern: ENTITY_TYPE#<id>
 */
export const keys = {
  /**
   * Location item keys
   * PK: LOCATION#<locationId>
   * SK: METADATA
   */
  location: (locationId: string) => ({
    PK: `LOCATION#${locationId}`,
    SK: "METADATA",
  }),

  /**
   * Location code lookup item keys
   * Used for enforcing locationCode uniqueness via TransactWrite
   * PK: LOCATION_CODE#<locationCode>
   * SK: LOOKUP
   */
  locationCodeLookup: (locationCode: string) => ({
    PK: `LOCATION_CODE#${locationCode}`,
    SK: "LOOKUP",
  }),
} as const;

/**
 * Extract locationId from PK
 */
export function extractLocationIdFromPK(pk: string): string | null {
  if (pk.startsWith("LOCATION#")) {
    return pk.replace("LOCATION#", "");
  }
  return null;
}

/**
 * Check if running against DynamoDB Local
 */
export function isLocalDynamoDB(): boolean {
  return isLocal;
}
