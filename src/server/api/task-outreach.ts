import { query } from "@solidjs/router";
import * as taskService from "~/server/services";

export { taskService };

export const fetchMyTasksQuery = query(async () => {
  "use server";
  return await taskService.fetchMyTasks();
}, "tasks-my");

export const fetchTasksForActiveLocationQuery = query(async () => {
  "use server";
  return await taskService.fetchTasksForActiveLocation();
}, "tasks-active-location");

export const getActiveLocationIdQuery = query(async () => {
  "use server";
  return await taskService.getActiveLocationId();
}, "active-location-id");

export async function fetchTaskById(taskId: string) {
  "use server";
  return await taskService.fetchTaskById(taskId);
}

export async function createTask(request: any) {
  "use server";
  return await taskService.createTask(request);
}
