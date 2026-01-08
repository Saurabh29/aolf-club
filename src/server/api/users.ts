import { query, action } from "@solidjs/router";
import type { UserWithGroup } from "~/server/services/users.service";
import type { GroupType } from "~/lib/schemas/db/types";
import {
  getUsersForActiveLocation,
  assignUsersToGroup,
  createUserManual,
  importUsersFromCSV,
} from "~/server/services";

export type { UserWithGroup };

// Provide a query wrapper (typed) for use with SolidStart `query` and preloads.
export const getUsersForActiveLocationQuery = query(async () => {
  "use server";
  const result = await getUsersForActiveLocation();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch users");
  return result.data;
}, "users-for-active-location");

export const assignUsersToGroupAction = action(async (userIds: string[], groupType: GroupType) => {
  "use server";
  return await assignUsersToGroup(userIds, groupType);
}, "assign-users-to-group");

export const createUserManualAction = action(async (input: any) => {
  "use server";
  return await createUserManual(input);
}, "create-user-manual");

export const importUsersFromCSVAction = action(async (input: any) => {
  "use server";
  return await importUsersFromCSV(input);
}, "import-users-from-csv");
