import { query, action } from "@solidjs/router";

export const fetchMyTasksQuery = query(async () => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchMyTasks();
}, "tasks-my");

export const fetchTasksForActiveLocationQuery = query(async () => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchTasksForActiveLocation();
}, "tasks-active-location");

export const getActiveLocationIdQuery = query(async () => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.getActiveLocationId();
}, "active-location-id");

export const fetchTaskByIdAction = action(async (taskId: string) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchTaskById(taskId);
}, "fetch-task-by-id");

export const createTaskAction = action(async (request: any) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.createTask(request);
}, "create-task");

export const fetchTaskAction = action(async (taskId: string) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchTask(taskId);
}, "fetch-task");

export const fetchMyAssignedUsersAction = action(async (taskId: string) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchMyAssignedUsers(taskId);
}, "fetch-my-assigned-users");

export const fetchUnassignedCountAction = action(async (taskId: string) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchUnassignedCount(taskId);
}, "fetch-unassigned-count");

export const selfAssignAction = action(async (request: any) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.selfAssign(request);
}, "self-assign");

export const saveInteractionAction = action(async (request: any) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.saveInteraction(request);
}, "save-interaction");

export const skipUserAction = action(async (taskId: string, targetUserId: string) => {
  "use server";
  const svc = await import("~/server/services");
  return await svc.skipUser(taskId, targetUserId);
}, "skip-user");
