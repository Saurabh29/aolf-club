/**
 * Task outreach service layer (migrated from server/actions/task-outreach.ts)
 */

import type {
  OutreachTask,
  OutreachTaskListItem,
  AssignedUser,
  SelfAssignRequest,
  SelfAssignResult,
  SaveInteractionRequest,
} from "~/lib/schemas/ui/task.schema";
import type { SaveTaskRequest } from "~/lib/schemas/ui";
import type { ApiResult } from "~/lib/types";
import * as taskRepo from "~/server/db/repositories/task-outreach.repository";
import { getSessionInfo } from "~/lib/auth";

export async function fetchMyTasks(): Promise<ApiResult<OutreachTaskListItem[]>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    const tasks = await taskRepo.getTasksAssignedToUser(userId);
    return { success: true, data: tasks };
  } catch (error) {
    console.error("[fetchMyTasks] Error:", error);
    return { success: false, error: "Failed to fetch your tasks" };
  }
}

export async function fetchTasksForActiveLocation(): Promise<ApiResult<OutreachTaskListItem[]>> {
  try {
    const session = await getSessionInfo();
    const locationId = session.activeLocationId;
    if (!locationId) {
      return { success: true, data: [] };
    }
    const tasks = await taskRepo.getTasksByLocation(locationId);
    return { success: true, data: tasks };
  } catch (error) {
    console.error("[fetchTasksForActiveLocation] Error:", error);
    return { success: false, error: "Failed to fetch tasks for active location" };
  }
}

export async function getActiveLocationId(): Promise<ApiResult<string | null>> {
  try {
    const session = await getSessionInfo();
    return { success: true, data: session.activeLocationId };
  } catch (error) {
    console.error("[getActiveLocationId] Error:", error);
    return { success: false, error: "Failed to get active location ID" };
  }
}

export async function fetchTaskById(taskId: string): Promise<ApiResult<OutreachTask | null>> {
  try {
    const task = await taskRepo.getTaskById(taskId);
    return { success: true, data: task };
  } catch (error) {
    console.error("[fetchTaskById] Error:", error);
    return { success: false, error: "Failed to fetch task details" };
  }
}

export async function fetchTask(taskId: string): Promise<ApiResult<OutreachTask | null>> {
  try {
    const task = await taskRepo.getTaskById(taskId);
    return { success: true, data: task };
  } catch (error) {
    console.error("[fetchTask] Error:", error);
    return { success: false, error: "Failed to fetch task details" };
  }
}

export async function fetchTasksByLocation(locationId: string): Promise<ApiResult<OutreachTaskListItem[]>> {
  try {
    const tasks = await taskRepo.getTasksByLocation(locationId);
    return { success: true, data: tasks };
  } catch (error) {
    console.error("[fetchTasksByLocation] Error:", error);
    return { success: false, error: "Failed to fetch tasks" };
  }
}

export async function fetchMyAssignedUsers(taskId: string): Promise<ApiResult<AssignedUser[]>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    const users = await taskRepo.getAssignedUsersWithInteractions(taskId, userId);
    return { success: true, data: users };
  } catch (error) {
    console.error("[fetchMyAssignedUsers] Error:", error);
    return { success: false, error: "Failed to fetch assigned users" };
  }
}

export async function fetchUnassignedCount(taskId: string): Promise<ApiResult<number>> {
  try {
    const count = await taskRepo.getUnassignedCount(taskId);
    return { success: true, data: count };
  } catch (error) {
    console.error("[fetchUnassignedCount] Error:", error);
    return { success: false, error: "Failed to fetch unassigned count" };
  }
}

export async function selfAssign(request: SelfAssignRequest): Promise<ApiResult<SelfAssignResult>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    const result = await taskRepo.selfAssignUsers(request.taskId, userId, request.count);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("[selfAssign] Error:", error);
    return { success: false, error: error.message || "Failed to assign users" };
  }
}

export async function saveInteraction(request: SaveInteractionRequest): Promise<ApiResult<void>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    await taskRepo.saveInteraction(
      request.taskId,
      request.targetUserId,
      userId,
      request.actionsTaken,
      request.notes,
      request.rating,
      request.followUpAt
    );
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[saveInteraction] Error:", error);
    return { success: false, error: "Failed to save interaction" };
  }
}

export async function skipUser(taskId: string, targetUserId: string): Promise<ApiResult<void>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    await taskRepo.skipAssignment(taskId, userId, targetUserId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[skipUser] Error:", error);
    return { success: false, error: "Failed to skip user" };
  }
}

export async function createTask(request: SaveTaskRequest): Promise<ApiResult<string>> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    const taskId = await taskRepo.createTask(
      userId,
      request.definition,
      request.targetUserIds,
      request.assignments
    );
    return { success: true, data: taskId };
  } catch (error) {
    console.error("[createTask] Error:", error);
    return { success: false, error: "Failed to create task" };
  }
}
