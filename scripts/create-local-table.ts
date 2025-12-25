/**
 * Script to create the DynamoDB Local table for development
 * 
 * Run with: pnpm db:create-table
 * 
 * Prerequisites:
 * - DynamoDB Local running on localhost:8000
 *   (docker run -d -p 8000:8000 amazon/dynamodb-local)
 * - Environment variables set (copy from .env.example)
 */

import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
  },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "aolf-club-locations";

async function createTable() {
  console.log(`Creating table: ${TABLE_NAME}`);

  try {
    const command = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    });

    await client.send(command);
    console.log("✅ Table created successfully!");
    console.log("\nTable schema:");
    console.log("  PK (String) - Partition Key");
    console.log("  SK (String) - Sort Key");
    console.log("\nAccess patterns:");
    console.log("  Location:       PK=LOCATION#<locationId>, SK=METADATA");
    console.log("  Code Lookup:    PK=LOCATION_CODE#<code>, SK=LOOKUP");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ResourceInUseException") {
      console.log("⚠️  Table already exists");
    } else {
      console.error("❌ Failed to create table:", error);
      process.exit(1);
    }
  }
}

createTable();
