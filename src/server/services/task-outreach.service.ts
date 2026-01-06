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
import * as taskRepo from "~/server/db/repositories/task-outreach.repository";
import { getSessionInfo } from "~/lib/auth";

export async function fetchMyTasks(): Promise<OutreachTaskListItem[]> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    return await taskRepo.getTasksAssignedToUser(userId);
  } catch (error) {
    console.error("[fetchMyTasks] Error:", error);
    throw new Error("Failed to fetch your tasks");
  }
}

export async function fetchTasksForActiveLocation(): Promise<OutreachTaskListItem[]> {
  try {
    const session = await getSessionInfo();
    const locationId = session.activeLocationId;
    if (!locationId) return [];
    return await taskRepo.getTasksByLocation(locationId);
  } catch (error) {
    console.error("[fetchTasksForActiveLocation] Error:", error);
    throw new Error("Failed to fetch tasks for active location");
  }
}

export async function getActiveLocationId(): Promise<string | null> {
  try {
    const session = await getSessionInfo();
    return session.activeLocationId;
  } catch (error) {
    console.error("[getActiveLocationId] Error:", error);
    return null;
  }
}

export async function fetchTaskById(taskId: string): Promise<OutreachTask | null> {
  try {
    return await taskRepo.getTaskById(taskId);
  } catch (error) {
    console.error("[fetchTaskById] Error:", error);
    throw new Error("Failed to fetch task details");
  }
}

export async function fetchTask(taskId: string): Promise<OutreachTask | null> {
  try {
    return await taskRepo.getTaskById(taskId);
  } catch (error) {
    console.error("[fetchTask] Error:", error);
    throw new Error("Failed to fetch task details");
  }
}

export async function fetchTasksByLocation(locationId: string): Promise<OutreachTaskListItem[]> {
  try {
    return await taskRepo.getTasksByLocation(locationId);
  } catch (error) {
    console.error("[fetchTasksByLocation] Error:", error);
    throw new Error("Failed to fetch tasks");
  }
}

export async function fetchMyAssignedUsers(taskId: string): Promise<AssignedUser[]> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    return await taskRepo.getAssignedUsersWithInteractions(taskId, userId);
  } catch (error) {
    console.error("[fetchMyAssignedUsers] Error:", error);
    throw new Error("Failed to fetch assigned users");
  }
}

export async function fetchUnassignedCount(taskId: string): Promise<number> {
  try {
    return await taskRepo.getUnassignedCount(taskId);
  } catch (error) {
    console.error("[fetchUnassignedCount] Error:", error);
    return 0;
  }
}

export async function selfAssign(request: SelfAssignRequest): Promise<SelfAssignResult> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    return await taskRepo.selfAssignUsers(request.taskId, userId, request.count);
  } catch (error: any) {
    console.error("[selfAssign] Error:", error);
    throw new Error(error.message || "Failed to assign users");
  }
}

export async function saveInteraction(request: SaveInteractionRequest): Promise<void> {
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
  } catch (error) {
    console.error("[saveInteraction] Error:", error);
    throw new Error("Failed to save interaction");
  }
}

export async function skipUser(taskId: string, targetUserId: string): Promise<void> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    await taskRepo.skipAssignment(taskId, userId, targetUserId);
  } catch (error) {
    console.error("[skipUser] Error:", error);
    throw new Error("Failed to skip user");
  }
}

export async function createTask(request: SaveTaskRequest): Promise<string> {
  try {
    const session = await getSessionInfo();
    const userId = session.userId!;
    return await taskRepo.createTask(
      userId,
      request.definition,
      request.targetUserIds,
      request.assignments
    );
  } catch (error) {
    console.error("[createTask] Error:", error);
    throw new Error("Failed to create task");
  }
}
