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
