/**
 * Task Outreach Server Actions
 * 
 * Server-side functions for task-based outreach UI.
 * Called from SolidStart routes using "use server".
 */

"use server";

import { redirect } from "@solidjs/router";
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

/**
 * Get current authenticated user ID from session
 */
import { getCurrentUserId } from "./auth";

/**
 * Fetch all tasks assigned to the current user
 */
export async function fetchMyTasks(): Promise<OutreachTaskListItem[]> {
  try {
    const userId = await getCurrentUserId();
    // Query USER#userId + SK begins_with TASKASSIGNMENT#
    // Then join with TASK items to get full details
    return await taskRepo.getTasksAssignedToUser(userId);
  } catch (error) {
    console.error("[fetchMyTasks] Error:", error);
    throw new Error("Failed to fetch your tasks");
  }
}

/**
 * Fetch task details by taskId (alias for fetchTask)
 */
export async function fetchTaskById(taskId: string): Promise<OutreachTask | null> {
  try {
    return await taskRepo.getTaskById(taskId);
  } catch (error) {
    console.error("[fetchTaskById] Error:", error);
    throw new Error("Failed to fetch task details");
  }
}

/**
 * Fetch task details by taskId
 */
export async function fetchTask(taskId: string): Promise<OutreachTask | null> {
  try {
    return await taskRepo.getTaskById(taskId);
  } catch (error) {
    console.error("[fetchTask] Error:", error);
    throw new Error("Failed to fetch task details");
  }
}

/**
 * Fetch tasks for a location
 */
export async function fetchTasksByLocation(locationId: string): Promise<OutreachTaskListItem[]> {
  try {
    return await taskRepo.getTasksByLocation(locationId);
  } catch (error) {
    console.error("[fetchTasksByLocation] Error:", error);
    throw new Error("Failed to fetch tasks");
  }
}

/**
 * Fetch assigned users for current user in a task
 */
export async function fetchMyAssignedUsers(taskId: string): Promise<AssignedUser[]> {
  try {
    const userId = await getCurrentUserId();
    return await taskRepo.getAssignedUsersWithInteractions(taskId, userId);
  } catch (error) {
    console.error("[fetchMyAssignedUsers] Error:", error);
    throw new Error("Failed to fetch assigned users");
  }
}

/**
 * Get unassigned user count for a task
 */
export async function fetchUnassignedCount(taskId: string): Promise<number> {
  try {
    return await taskRepo.getUnassignedCount(taskId);
  } catch (error) {
    console.error("[fetchUnassignedCount] Error:", error);
    return 0;
  }
}

/**
 * Self-assign users atomically with retry logic
 */
export async function selfAssign(request: SelfAssignRequest): Promise<SelfAssignResult> {
  try {
    const userId = await getCurrentUserId();
    return await taskRepo.selfAssignUsers(request.taskId, userId, request.count);
  } catch (error: any) {
    console.error("[selfAssign] Error:", error);
    throw new Error(error.message || "Failed to assign users");
  }
}

/**
 * Save interaction state for a target user
 */
export async function saveInteraction(request: SaveInteractionRequest): Promise<void> {
  try {
    const userId = await getCurrentUserId();
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

/**
 * Mark assignment as skipped
 */
export async function skipUser(taskId: string, targetUserId: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    await taskRepo.skipAssignment(taskId, userId, targetUserId);
  } catch (error) {
    console.error("[skipUser] Error:", error);
    throw new Error("Failed to skip user");
  }
}

/**
 * Create a new outreach task
 */
export async function createTask(request: SaveTaskRequest): Promise<string> {
  try {
    const userId = await getCurrentUserId();
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
