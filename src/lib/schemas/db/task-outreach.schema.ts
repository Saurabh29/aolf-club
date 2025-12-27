/**
 * Task Outreach DynamoDB Schemas
 * 
 * Single-table design for outreach task management.
 * Follows Phase 1 design specifications.
 * 
 * Table: aolf_main
 * Keys: PK (partition key), SK (sort key)
 * No GSI, only Query/GetItem operations
 */

import { z } from "zod";

/**
 * ========== ITEM TYPES ==========
 */

/**
 * Task Item - Core task metadata
 * PK: TASK#<taskId>
 * SK: META
 */
export const TaskItemSchema = z.object({
  PK: z.string(), // TASK#<taskId>
  SK: z.literal("META"),
  itemType: z.literal("TASK"),
  taskId: z.string().ulid(),
  locationId: z.string().ulid(),
  createdBy: z.string().ulid(),
  title: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]),
  allowedActions: z.object({
    call: z.boolean(),
    message: z.boolean(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TaskItem = z.infer<typeof TaskItemSchema>;

/**
 * Task Target Item - Users included in a task
 * PK: TASK#<taskId>
 * SK: TARGET#<targetUserId>
 */
export const TaskTargetItemSchema = z.object({
  PK: z.string(), // TASK#<taskId>
  SK: z.string(), // TARGET#<targetUserId>
  itemType: z.literal("TASK_TARGET"),
  taskId: z.string().ulid(),
  targetUserId: z.string().ulid(),
  targetType: z.enum(["MEMBER", "LEAD"]),
  addedAt: z.string(),
});
export type TaskTargetItem = z.infer<typeof TaskTargetItemSchema>;

/**
 * Task Assignment Item - Who works on which target
 * PK: TASK#<taskId>
 * SK: ASSIGNMENT#<assigneeUserId>#<targetUserId>
 */
export const TaskAssignmentItemSchema = z.object({
  PK: z.string(), // TASK#<taskId>
  SK: z.string(), // ASSIGNMENT#<assigneeUserId>#<targetUserId>
  itemType: z.literal("TASK_ASSIGNMENT"),
  taskId: z.string().ulid(),
  assigneeUserId: z.string().ulid(),
  targetUserId: z.string().ulid(),
  assignedBy: z.enum(["CREATOR", "SELF"]),
  assignedAt: z.string(),
  status: z.enum(["PENDING", "DONE", "SKIPPED"]),
});
export type TaskAssignmentItem = z.infer<typeof TaskAssignmentItemSchema>;

/**
 * Interaction Item - Latest interaction state (upserted)
 * PK: TASK#<taskId>
 * SK: INTERACTION#<targetUserId>
 */
export const InteractionItemSchema = z.object({
  PK: z.string(), // TASK#<taskId>
  SK: z.string(), // INTERACTION#<targetUserId>
  itemType: z.literal("INTERACTION"),
  taskId: z.string().ulid(),
  targetUserId: z.string().ulid(),
  assigneeUserId: z.string().ulid(),
  actionsTaken: z.object({
    called: z.boolean(),
    messaged: z.boolean(),
  }),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  followUpAt: z.string().optional(),
  updatedAt: z.string(),
});
export type InteractionItem = z.infer<typeof InteractionItemSchema>;

/**
 * Location Task Index - For task list by location
 * PK: LOCATION#<locationId>
 * SK: TASK#<taskId>
 */
export const LocationTaskIndexSchema = z.object({
  PK: z.string(), // LOCATION#<locationId>
  SK: z.string(), // TASK#<taskId>
  itemType: z.literal("LOCATION_TASK_INDEX"),
  taskId: z.string().ulid(),
  locationId: z.string().ulid(),
  title: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]),
  createdAt: z.string(),
});
export type LocationTaskIndex = z.infer<typeof LocationTaskIndexSchema>;

/**
 * User Task Assignment Index - For "My Tasks" dashboard
 * PK: USER#<userId>
 * SK: TASKASSIGNMENT#<taskId>
 */
export const UserTaskAssignmentIndexSchema = z.object({
  PK: z.string(), // USER#<userId>
  SK: z.string(), // TASKASSIGNMENT#<taskId>
  itemType: z.literal("USER_TASK_INDEX"),
  userId: z.string().ulid(),
  taskId: z.string().ulid(),
  taskTitle: z.string(),
  locationId: z.string().ulid(),
  assignedAt: z.string(),
  status: z.enum(["PENDING", "DONE", "SKIPPED"]),
});
export type UserTaskAssignmentIndex = z.infer<typeof UserTaskAssignmentIndexSchema>;

/**
 * ========== HELPER FUNCTIONS ==========
 */

/**
 * Generate PK for task items
 */
export function taskPK(taskId: string): string {
  return `TASK#${taskId}`;
}

/**
 * Generate SK for task target
 */
export function targetSK(targetUserId: string): string {
  return `TARGET#${targetUserId}`;
}

/**
 * Generate SK for task assignment
 */
export function assignmentSK(assigneeUserId: string, targetUserId: string): string {
  return `ASSIGNMENT#${assigneeUserId}#${targetUserId}`;
}

/**
 * Generate SK for interaction
 */
export function interactionSK(targetUserId: string): string {
  return `INTERACTION#${targetUserId}`;
}

/**
 * Generate PK for location index
 */
export function locationPK(locationId: string): string {
  return `LOCATION#${locationId}`;
}

/**
 * Generate SK for location task index
 */
export function locationTaskSK(taskId: string): string {
  return `TASK#${taskId}`;
}

/**
 * Generate PK for user index
 */
export function userPK(userId: string): string {
  return `USER#${userId}`;
}

/**
 * Generate SK for user task assignment index
 */
export function userTaskAssignmentSK(taskId: string): string {
  return `TASKASSIGNMENT#${taskId}`;
}
