/**
 * Data Source Initialization
 * 
 * Phase 6: Register all data sources with their factories.
 * 
 * This module ensures all resources are properly configured and
 * registered before any queries are executed.
 * 
 * Registration happens once at server startup.
 */

import {
  registerDataSource,
  InMemoryDataSource,
  DynamoUserDataSource,
  type ResourceName,
} from "~/server/data-sources";
import type { User } from "~/lib/schemas/db/user.schema";
import type { Location } from "~/lib/schemas/db/location.schema";

/**
 * Register all data source factories.
 * 
 * This should be called once during server initialization.
 * Each resource is mapped to its factory function.
 */
export function initializeDataSources(): void {
  console.log("[DataSources] Initializing data sources...");

  // ========================================================
  // USERS: DynamoDB-backed (scan with filters)
  // ========================================================
  registerDataSource<User>("users", () => {
    return new DynamoUserDataSource();
  });

  // ========================================================
  // LOCATIONS: In-memory (load all, query in RAM)
  // ========================================================
  registerDataSource<Location>("locations", () => {
    return new InMemoryDataSource<Location>(
      async () => {
        // Load all locations from repository
        const { listLocations } = await import("~/server/db/repositories/location.repository");
        return await listLocations();
      },
      { idField: "locationId" }
    );
  });

  // ========================================================
  // GROUPS: In-memory (future implementation)
  // ========================================================
  // registerDataSource<UserGroup>("groups", () => {
  //   return new InMemoryDataSource<UserGroup>({
  //     loader: async () => {
  //       const { listAllGroups } = await import("~/server/db/repositories/userGroup.repository");
  //       return listAllGroups();
  //     },
  //     idField: "groupId",
  //   });
  // });

  // ========================================================
  // ROLES: In-memory (future implementation)
  // ========================================================
  // registerDataSource<Role>("roles", () => {
  //   return new InMemoryDataSource<Role>({
  //     loader: async () => {
  //       const { listAllRoles } = await import("~/server/db/repositories/permission.repository");
  //       return listAllRoles();
  //     },
  //     idField: "roleName",
  //   });
  // });

  // ========================================================
  // PAGES: In-memory (future implementation)
  // ========================================================
  // registerDataSource<Page>("pages", () => {
  //   return new InMemoryDataSource<Page>({
  //     loader: async () => {
  //       const { listAllPages } = await import("~/server/db/repositories/page.repository");
  //       return listAllPages();
  //     },
  //     idField: "pageId",
  //   });
  // });

  console.log("[DataSources] Initialization complete");
}

/**
 * Lazy initialization - call this before first query.
 * 
 * This ensures data sources are registered even if
 * initializeDataSources() wasn't called explicitly.
 */
let initialized = false;

export function ensureDataSourcesInitialized(): void {
  if (!initialized) {
    initializeDataSources();
    initialized = true;
  }
}
