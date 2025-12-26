/**
 * Test Setup
 * 
 * Configures the test environment before running tests.
 * Loads environment variables from .env.test or .env
 */

import { config } from "dotenv";
import { env } from "~/server/config/env";

// Load test environment variables from files if present
config({ path: ".env.test" });
config({ path: ".env" });

// Export test-friendly defaults derived from validated env.
// Tests should import these defaults or import `env` directly.
export const testEnv = {
	DYNAMODB_ENDPOINT: env.DYNAMODB_ENDPOINT ?? "http://localhost:8000",
	DYNAMODB_TABLE_NAME: env.DYNAMODB_TABLE_NAME ?? "aolfclub-entities-test",
	AWS_REGION: env.AWS_REGION ?? "us-east-1",
};
