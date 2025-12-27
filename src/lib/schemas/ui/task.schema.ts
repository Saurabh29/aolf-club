/**
 * Task UI Schemas
 * 
 * These schemas define the structure for tasks displayed in:
 * - Serve Hub (task cards)
 * - Dashboard (task reports)
 * 
 * UI-only schemas for Phase 1 (backend persistence not in scope).
 */

import { z } from "zod";

/**
 * Task priority levels
 */
export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

/**
 * Task status for tracking completion
 */
export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * Task category/type for grouping
 */
export const TaskCategorySchema = z.enum([
  "call",
  "follow_up",
  "event",
  "admin",
  "outreach",
  "other",
]);

export type TaskCategory = z.infer<typeof TaskCategorySchema>;

/**
 * Task - Core task entity for Serve Hub and Dashboard
 */
export const TaskSchema = z.object({
  taskId: z.string().ulid(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: TaskCategorySchema,
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  assignedTo: z.string().min(1).max(255).optional(), // User name or ID
  dueAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  locationId: z.string().ulid().optional(), // Associated location if any
  leadId: z.string().ulid().optional(), // Associated lead if any
  notes: z.string().max(2000).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * TaskCardViewModel - Optimized view model for task cards in Serve Hub
 * Includes computed fields for display
 */
export const TaskCardViewModelSchema = TaskSchema.extend({
  isOverdue: z.boolean(),
  isToday: z.boolean(),
  relativeTimeText: z.string().optional(), // e.g., "Due in 2 hours", "Overdue by 1 day"
});

export type TaskCardViewModel = z.infer<typeof TaskCardViewModelSchema>;

/**
 * TaskReportSummary - Aggregated statistics for Dashboard
 */
export const TaskReportSummarySchema = z.object({
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  pendingTasks: z.number().int().min(0),
  overdueTasks: z.number().int().min(0),
  tasksByPriority: z.object({
    low: z.number().int().min(0),
    medium: z.number().int().min(0),
    high: z.number().int().min(0),
    urgent: z.number().int().min(0),
  }),
  tasksByCategory: z.object({
    call: z.number().int().min(0),
    follow_up: z.number().int().min(0),
    event: z.number().int().min(0),
    admin: z.number().int().min(0),
    outreach: z.number().int().min(0),
    other: z.number().int().min(0),
  }),
  tasksByStatus: z.object({
    pending: z.number().int().min(0),
    in_progress: z.number().int().min(0),
    completed: z.number().int().min(0),
    cancelled: z.number().int().min(0),
  }),
});

export type TaskReportSummary = z.infer<typeof TaskReportSummarySchema>;

/**
 * ========== OUTREACH TASK SCHEMAS ==========
 * Phase 2B: Task-based outreach system for teachers/volunteers
 */

/**
 * Outreach Task Status
 */
export const OutreachTaskStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]);
export type OutreachTaskStatus = z.infer<typeof OutreachTaskStatusSchema>;

/**
 * Target Type - Who we're reaching out to
 */
export const TargetTypeSchema = z.enum(["MEMBER", "LEAD"]);
export type TargetType = z.infer<typeof TargetTypeSchema>;

/**
 * Assignment Status
 */
export const AssignmentStatusSchema = z.enum(["PENDING", "DONE", "SKIPPED"]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

/**
 * Assignment Mode
 */
export const AssignmentModeSchema = z.enum(["CREATOR", "SELF"]);
export type AssignmentMode = z.infer<typeof AssignmentModeSchema>;

/**
 * Allowed Actions - What actions volunteers can take
 */
export const AllowedActionsSchema = z.object({
  call: z.boolean(),
  message: z.boolean(),
});
export type AllowedActions = z.infer<typeof AllowedActionsSchema>;

/**
 * Actions Taken - What actions were actually performed
 */
export const ActionsTakenSchema = z.object({
  called: z.boolean(),
  messaged: z.boolean(),
});
export type ActionsTaken = z.infer<typeof ActionsTakenSchema>;

/**
 * Outreach Task - Full task details for Task Detail screen
 */
export const OutreachTaskSchema = z.object({
  taskId: z.string().ulid(),
  locationId: z.string().ulid(),
  locationName: z.string(),
  createdBy: z.string().ulid(),
  createdByName: z.string(),
  title: z.string().min(1).max(255),
  status: OutreachTaskStatusSchema,
  allowedActions: AllowedActionsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OutreachTask = z.infer<typeof OutreachTaskSchema>;

/**
 * Task List Item - Summary for task list page
 */
export const OutreachTaskListItemSchema = z.object({
  taskId: z.string().ulid(),
  title: z.string(),
  locationName: z.string(),
  status: OutreachTaskStatusSchema,
  allowedActions: AllowedActionsSchema,
  totalTargets: z.number().int().min(0),
  assignedCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
});
export type OutreachTaskListItem = z.infer<typeof OutreachTaskListItemSchema>;

/**
 * Interaction - Latest interaction state for a target user
 */
export const InteractionSchema = z.object({
  actionsTaken: ActionsTakenSchema,
  notes: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  followUpAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});
export type Interaction = z.infer<typeof InteractionSchema>;

/**
 * Assigned User - User assigned to current volunteer with interaction state
 */
export const AssignedUserSchema = z.object({
  targetUserId: z.string().ulid(),
  name: z.string(),
  phone: z.string(),
  targetType: TargetTypeSchema,
  assignedAt: z.string().datetime(),
  status: AssignmentStatusSchema,
  interaction: InteractionSchema.optional(),
});
export type AssignedUser = z.infer<typeof AssignedUserSchema>;

/**
 * Self-Assignment Request
 */
export const SelfAssignRequestSchema = z.object({
  taskId: z.string().ulid(),
  count: z.number().int().min(1).max(100),
  filters: z
    .object({
      targetType: TargetTypeSchema.optional(),
    })
    .optional(),
});
export type SelfAssignRequest = z.infer<typeof SelfAssignRequestSchema>;

/**
 * Self-Assignment Result
 */
export const SelfAssignResultSchema = z.object({
  assignedCount: z.number().int().min(0),
  requestedCount: z.number().int().min(0),
  message: z.string(),
});
export type SelfAssignResult = z.infer<typeof SelfAssignResultSchema>;

/**
 * Save Interaction Request
 */
export const SaveInteractionRequestSchema = z.object({
  taskId: z.string().ulid(),
  targetUserId: z.string().ulid(),
  actionsTaken: ActionsTakenSchema,
  notes: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  followUpAt: z.string().datetime().optional(),
});
export type SaveInteractionRequest = z.infer<typeof SaveInteractionRequestSchema>;
