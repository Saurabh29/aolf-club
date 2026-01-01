/**
 * Task Creation & Editing Schemas
 * 
 * Multi-step task creation/editing flow with single shared schema.
 * Supports both NEW task creation and EDIT task modification.
 * 
 * Step Flow:
 * 1. Define Task - title, location, allowed actions, scripts
 * 2. Assign Members/Leads - select target users
 * 3. Assign Teachers/Volunteers - assign targets to assignees
 * 4. Self Assignment - volunteers self-assign targets
 * 
 * REUSE PATTERN: Same schema and components for New Task and Edit Task.
 */

import { z } from "zod";
import { TargetTypeSchema } from "./task.schema";

/**
 * Step 1: Task Definition
 */
export const TaskDefinitionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  taskCode: z.string()
    .min(1, "Task code is required")
    .max(50, "Task code must be 50 characters or less")
    .regex(/^[a-z0-9-]+$/, "Task code must contain only lowercase letters, numbers, and hyphens")
    .refine((code) => !code.startsWith("-") && !code.endsWith("-"), {
      message: "Task code cannot start or end with a hyphen",
    }),
  locationId: z.string().ulid("Invalid location ID"),
  callScript: z.string().max(5000).optional(),
  messageTemplate: z.string().max(2000).optional(),
});
export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

/**
 * Step 2: Target User Selection
 * Represents a user (member/lead) to be added as task target
 */
export const TargetUserSchema = z.object({
  userId: z.string().ulid(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  targetType: TargetTypeSchema,
});
export type TargetUser = z.infer<typeof TargetUserSchema>;

/**
 * Step 2: Selected Targets
 */
export const SelectedTargetsSchema = z.object({
  targets: z.array(TargetUserSchema),
});
export type SelectedTargets = z.infer<typeof SelectedTargetsSchema>;

/**
 * Step 3: Assignee (teacher/volunteer)
 */
export const AssigneeSchema = z.object({
  userId: z.string().ulid(),
  name: z.string(),
  role: z.enum(["TEACHER", "VOLUNTEER"]),
});
export type Assignee = z.infer<typeof AssigneeSchema>;

/**
 * Step 3: Assignment State
 * 
 * Maps target user IDs to their assigned teacher/volunteer (or null if unassigned).
 * This model supports:
 * - Inline row edits in the table UI
 * - Bulk assignment operations
 * - Explicit unassigned state (null)
 * - Easy diffing when saving
 * 
 * Example:
 * {
 *   "01HZXK7G2MEMBER1": "01HZXK7G2TEACHER001",  // Assigned to teacher
 *   "01HZXK7G2MEMBER2": null,                   // Unassigned (for self-assignment)
 *   "01HZXK7G2LEAD001": "01HZXK7G2VOLUNTEER01" // Assigned to volunteer
 * }
 */
export const AssignmentStateSchema = z.record(
  z.string().ulid(),           // targetUserId
  z.string().ulid().nullable() // assigneeUserId or null for unassigned
);
export type AssignmentState = z.infer<typeof AssignmentStateSchema>;

/**
 * Legacy: Assignment Mapping for backend compatibility
 * Converts from Record-based UI state to array format
 */
export const AssignmentMappingSchema = z.object({
  assigneeUserId: z.string().ulid(),
  targetUserIds: z.array(z.string().ulid()),
});
export type AssignmentMapping = z.infer<typeof AssignmentMappingSchema>;

/**
 * Complete Task Form State (All Steps Combined)
 * Used for both NEW and EDIT modes
 */
export const TaskFormStateSchema = z.object({
  // Metadata
  taskId: z.string().ulid().optional(), // Present in EDIT mode, absent in NEW mode
  mode: z.enum(["NEW", "EDIT"]),
  currentStep: z.number().int().min(1).max(3), // Reduced to 3 steps
  
  // Step 1: Definition
  definition: TaskDefinitionSchema.partial(), // Partial for draft state
  
  // Step 2: Targets
  selectedTargets: z.array(TargetUserSchema),
  
  // Step 3: Assignments (Record-based for inline editing)
  // Maps targetUserId -> assigneeUserId | null
  assignments: AssignmentStateSchema,
  
  // Validation state
  step1Valid: z.boolean().default(false),
  step2Valid: z.boolean().default(false),
  step3Valid: z.boolean().default(false),
});
export type TaskFormState = z.infer<typeof TaskFormStateSchema>;

/**
 * Initial empty state for NEW task
 */
export function createNewTaskFormState(): TaskFormState {
  return {
    mode: "NEW",
    currentStep: 1,
    definition: {},
    selectedTargets: [],
    assignments: {}, // Empty record for new tasks
    step1Valid: false,
    step2Valid: false,
    step3Valid: false,
  };
}

/**
 * Initialize state for EDIT task mode
 * Converts backend AssignmentMapping[] to Record-based UI state
 */
export function createEditTaskFormState(
  taskId: string,
  definition: TaskDefinition,
  targets: TargetUser[],
  assignments: AssignmentMapping[]
): TaskFormState {
  // Convert AssignmentMapping[] to Record<targetUserId, assigneeUserId | null>
  const assignmentState: AssignmentState = {};
  for (const mapping of assignments) {
    for (const targetId of mapping.targetUserIds) {
      assignmentState[targetId] = mapping.assigneeUserId;
    }
  }
  
  return {
    taskId,
    mode: "EDIT",
    currentStep: 1,
    definition,
    selectedTargets: targets,
    assignments: assignmentState,
    step1Valid: true,
    step2Valid: targets.length > 0,
    step3Valid: true,
  };
}

/**
 * Validation helper: Check if Step 1 is complete
 */
export function validateStep1(definition: Partial<TaskDefinition>): boolean {
  try {
    TaskDefinitionSchema.parse(definition);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validation helper: Check if Step 2 is complete
 */
export function validateStep2(targets: TargetUser[]): boolean {
  return targets.length > 0;
}

/**
 * Validation helper: Check if Step 3 is complete
 * Step 3 is always valid - unassigned targets are allowed for self-assignment
 */
export function validateStep3(assignments: AssignmentState): boolean {
  return true; // Always valid - users can be left unassigned
}

/**
 * Convert Record-based assignment state to AssignmentMapping[] for backend
 * Groups targets by their assigned user
 */
export function convertToAssignmentMappings(assignments: AssignmentState): AssignmentMapping[] {
  const mappings = new Map<string, string[]>();
  
  for (const [targetUserId, assigneeUserId] of Object.entries(assignments)) {
    if (assigneeUserId) { // Only include assigned targets
      const existing = mappings.get(assigneeUserId) || [];
      existing.push(targetUserId);
      mappings.set(assigneeUserId, existing);
    }
  }
  
  return Array.from(mappings.entries()).map(([assigneeUserId, targetUserIds]) => ({
    assigneeUserId,
    targetUserIds,
  }));
}

/**
 * Save Task Request - Final payload for backend
 */
export const SaveTaskRequestSchema = z.object({
  taskId: z.string().ulid().optional(), // Present for EDIT, absent for NEW
  definition: TaskDefinitionSchema,
  targetUserIds: z.array(z.string().ulid()).min(1, "At least one target required"),
  assignments: z.array(AssignmentMappingSchema).optional(),
});
export type SaveTaskRequest = z.infer<typeof SaveTaskRequestSchema>;
