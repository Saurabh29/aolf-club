import { query } from "@solidjs/router";

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

export async function fetchTaskById(taskId: string) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchTaskById(taskId);
}

export async function createTask(request: any) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.createTask(request);
}

export async function fetchTask(taskId: string) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchTask(taskId);
}

export async function fetchMyAssignedUsers(taskId: string) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchMyAssignedUsers(taskId);
}

export async function fetchUnassignedCount(taskId: string) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchUnassignedCount(taskId);
}

export async function selfAssign(request: any) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.selfAssign(request);
}

export async function saveInteraction(request: any) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.saveInteraction(request);
}

export async function skipUser(taskId: string, targetUserId: string) {
  "use server";
  const svc = await import("~/server/services");
  return await svc.skipUser(taskId, targetUserId);
}

export async function fetchMyTasks() {
  "use server";
  const svc = await import("~/server/services");
  return await svc.fetchMyTasks();
}
