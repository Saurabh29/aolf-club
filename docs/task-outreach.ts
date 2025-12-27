/**
 * Task Outreach Server Actions
 * 
 * Server-side functions for task-based outreach UI.
 * Called from SolidStart routes using "use server".
 */

"use server";

import { getRequestEvent } from "solid-js/web";
import { redirect } from "@solidjs/router";
import type {
  OutreachTask,
  OutreachTaskListItem,
  AssignedUser,
  SelfAssignRequest,
  SelfAssignResult,
  SaveInteractionRequest,
} from "~/lib/schemas/ui/task.schema";

// ========== MOCK MODE: In-Memory Data Store ==========
// Enable this for testing without DynamoDB backend
const USE_MOCK_DATA = true; // Set to false when backend is ready

// In-memory store for mock testing
const MOCK_TASKS: Record<string, { task: OutreachTask; targets: AssignedUser[] }> = {};

function ensureMockTask(taskId: string) {
  if (!MOCK_TASKS[taskId]) {
    const now = new Date().toISOString();
    const targets: AssignedUser[] = [];
    
    // Create 20 mock target users
    for (let i = 1; i <= 20; i++) {
      const id = `MOCK-TARGET-${i.toString().padStart(3, '0')}`;
      targets.push({
        targetUserId: id,
        name: `Mock User ${i}`,
        phone: `555-01${(100 + i).toString().slice(-2)}`,
        targetType: i % 5 === 0 ? "LEAD" : "MEMBER",
        assignedAt: null,
        interaction: null,
      } as any);
    }

    MOCK_TASKS[taskId] = {
      task: {
        taskId,
        title: `Demo Task - ${taskId.slice(-8)}`,
        locationId: "MOCK-LOCATION-001",
        locationName: "Chennai Center (Demo)",
        allowedActions: { call: true, message: true },
        status: "IN_PROGRESS",
        createdBy: "MOCK-ADMIN",
        createdAt: now,
        updatedAt: now,
      } as OutreachTask,
      targets,
    };
  }
}

/**
 * Get current authenticated user ID from session
 */
async function getCurrentUserId(): Promise<string> {
  // TODO: Implement proper session handling with start-authjs
  // For now, return a test user ID for development
  // In production, this should:
  // 1. Get session from start-authjs
  // 2. Look up user by email from DynamoDB
  // 3. Return the userId
  return "01JJBK6XQZTEST1234567890"; // Test ULID
}

/**
 * Fetch task details by taskId
 */
export async function fetchTask(taskId: string): Promise<OutreachTask | null> {
  if (USE_MOCK_DATA) {
    ensureMockTask(taskId);
    return MOCK_TASKS[taskId].task;
  }
  
  try {
    const taskRepo = await import("~/server/db/repositories/task-outreach.repository");
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
  if (USE_MOCK_DATA) {
    return Object.values(MOCK_TASKS).map((t) => ({
      taskId: t.task.taskId,
      title: t.task.title,
      locationId: t.task.locationId,
      status: t.task.status,
      createdAt: t.task.createdAt,
    } as any));
  }
  
  try {
    const taskRepo = await import("~/server/db/repositories/task-outreach.repository");
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
  if (USE_MOCK_DATA) {
    ensureMockTask(taskId);
    const userId = await getCurrentUserId();
    return MOCK_TASKS[taskId].targets
      .filter((t: any) => t.assignedTo === userId)
      .map((t) => ({ ...t }));
  }
  
  try {
    const userId = await getCurrentUserId();
    const taskRepo = await import("~/server/db/repositories/task-outreach.repository");
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
  if (USE_MOCK_DATA) {
    ensureMockTask(taskId);
    return MOCK_TASKS[taskId].targets.filter((t: any) => !t.assignedTo).length;
  }
  
  try {
    const taskRepo = await import("~/server/db/repositories/task-outreach.repository");
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
  if (USE_MOCK_DATA) {
    ensureMockTask(request.taskId);
    const userId = await getCurrentUserId();
    const pool = MOCK_TASKS[request.taskId].targets;
    const unassigned = pool.filter((t: any) => !t.assignedTo);
    const count = Math.min(request.count, unassigned.length);
    const assigned: string[] = [];

    for (let i = 0; i < count; i++) {
      const target: any = unassigned[i];
      target.assignedTo = userId;
      target.assignedAt = new Date().toISOString();
      assigned.push(target.targetUserId);
    }

    return {
      assignedCount: assigned.length,
      requestedCount: request.count,
      message: `${assigned.length} users assigned`,
      assignedUserIds: assigned,
    } as SelfAssignResult;
  }
  
  try {
    const userId = await getCurrentUserId();
    const taskRepo = await import("~/server/db/repositories/task-outreach.repository");
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
  if (USE_MOCK_DATA) {
    ensureMockTask(request.taskId);
    const target: any = MOCK_TASKS[request.taskId].targets.find(
      (t) => t.targetUserId === request.targetUserId
    );
    if (!target) throw new Error("Target not found");
    
    target.interaction = {
      actionsTaken: request.actionsTaken,
      notes: request.notes,
      rating: request.rating,
      followUpAt: request.followUpAt,
      updatedAt: new Date().toISOString(),
    };
    return;
  }
  
  try {
    const userId = await getCurrentUserId();
    const taskRepo = await import("~/server/db/repositories/task-outreach.repository");
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
  if (USE_MOCK_DATA) {
    ensureMockTask(taskId);
    const target: any = MOCK_TASKS[taskId].targets.find(
      (t) => t.targetUserId === targetUserId
    );
    if (target) {
      target.assignedTo = null;
      target.assignedAt = null;
    }
    return;
  }
  
  try {
    const userId = await getCurrentUserId();
    const taskRepo = await import("~/server/db/repositories/task-outreach.repository");
    await taskRepo.skipAssignment(taskId, userId, targetUserId);
  } catch (error) {
    console.error("[skipUser] Error:", error);
    throw new Error("Failed to skip user");
  }
}
