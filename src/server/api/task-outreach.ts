import { query, action } from "@solidjs/router";
import {
  fetchMyTasks,
  fetchTasksForActiveLocation,
  getActiveLocationId,
  fetchTaskById,
  createTask,
  fetchTask,
  fetchMyAssignedUsers,
  fetchUnassignedCount,
  selfAssign,
  saveInteraction,
  skipUser,
} from "~/server/services";

export const fetchMyTasksQuery = query(async () => {
  "use server";
  const result = await fetchMyTasks();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch tasks");
  return result.data;
}, "tasks-my");

export const fetchTasksForActiveLocationQuery = query(async () => {
  "use server";
  const result = await fetchTasksForActiveLocation();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch tasks");
  return result.data;
}, "tasks-active-location");

export const getActiveLocationIdQuery = query(async () => {
  "use server";
  const result = await getActiveLocationId();
  if (!result.success) throw new Error(result.error ?? "Failed to get location");
  return result.data;
}, "active-location-id");

export const fetchTaskByIdAction = action(async (taskId: string) => {
  "use server";
  return await fetchTaskById(taskId);
}, "fetch-task-by-id");

export const createTaskAction = action(async (request: any) => {
  "use server";
  return await createTask(request);
}, "create-task");

export const fetchTaskAction = action(async (taskId: string) => {
  "use server";
  return await fetchTask(taskId);
}, "fetch-task");

export const fetchMyAssignedUsersAction = action(async (taskId: string) => {
  "use server";
  return await fetchMyAssignedUsers(taskId);
}, "fetch-my-assigned-users");

export const fetchUnassignedCountAction = action(async (taskId: string) => {
  "use server";
  return await fetchUnassignedCount(taskId);
}, "fetch-unassigned-count");

export const selfAssignAction = action(async (request: any) => {
  "use server";
  return await selfAssign(request);
}, "self-assign");

export const saveInteractionAction = action(async (request: any) => {
  "use server";
  return await saveInteraction(request);
}, "save-interaction");

export const skipUserAction = action(async (taskId: string, targetUserId: string) => {
  "use server";
  return await skipUser(taskId, targetUserId);
}, "skip-user");
