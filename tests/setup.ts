/**
 * Test Setup
 * 
 * Configures the test environment before running tests.
 * Loads environment variables from .env.test or .env
 */

import { config } from "dotenv";

// Load test environment variables
config({ path: ".env.test" });
config({ path: ".env" });

// Set test defaults if not configured
process.env.DYNAMODB_ENDPOINT ??= "http://localhost:8000";
process.env.DYNAMODB_TABLE_NAME ??= "aolfclub-entities-test";
process.env.AWS_REGION ??= "us-east-1";
