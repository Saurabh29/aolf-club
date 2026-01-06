import { query } from "@solidjs/router";
import type { UserWithGroup } from "~/server/services";
import type { GroupType } from "~/lib/schemas/db/types";

export type { UserWithGroup };

// Provide a query wrapper (typed) for use with SolidStart `query` and preloads.
export const getUsersForActiveLocationQuery = query(async () => {
  "use server";
  const svc = await import("~/server/services");
  const result = await svc.getUsersForActiveLocation();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch users");
  return result.data;
}, "users-for-active-location");

export async function assignUsersToGroup(userIds: string[], groupType: GroupType) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.assignUsersToGroup(userIds, groupType);
}

export async function createUserManual(input: any) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.createUserManual(input);
}

export async function importUsersFromCSV(input: any) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.importUsersFromCSV(input);
}
