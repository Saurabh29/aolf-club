import { query } from "@solidjs/router";
import { getUsersForActiveLocation as getUsersAction, assignUsersToGroup as assignUsersAction, type UserWithGroup } from "~/server/services";
import type { GroupType } from "~/lib/schemas/db/types";

// Re-export the canonical action so callers that expect the ActionResult shape
// can call the action directly (it already has "use server" inside).
export { getUsersAction as getUsersForActiveLocation };
export type { UserWithGroup };

// Provide a query wrapper (typed) for use with SolidStart `query` and preloads.
export const getUsersForActiveLocationQuery = query(async () => {
  "use server";
  const result = await getUsersAction();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch users");
  return result.data;
}, "users-for-active-location");

export async function assignUsersToGroup(userIds: string[], groupType: GroupType) {
  "use server";
  return await assignUsersAction(userIds, groupType);
}
