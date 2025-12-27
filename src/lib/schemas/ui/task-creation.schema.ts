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
import { AllowedActionsSchema, TargetTypeSchema } from "./task.schema";

/**
 * Step 1: Task Definition
 */
export const TaskDefinitionSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  locationId: z.string().ulid("Invalid location ID"),
  allowedActions: AllowedActionsSchema,
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
 * Step 3: Assignment Mapping
 * Maps multiple targets to one assignee
 */
export const AssignmentMappingSchema = z.object({
  assigneeUserId: z.string().ulid(),
  targetUserIds: z.array(z.string().ulid()),
});
export type AssignmentMapping = z.infer<typeof AssignmentMappingSchema>;

/**
 * Step 3: Assignment Configuration
 */
export const AssignmentConfigSchema = z.object({
  assignments: z.array(AssignmentMappingSchema),
});
export type AssignmentConfig = z.infer<typeof AssignmentConfigSchema>;

/**
 * Complete Task Form State (All Steps Combined)
 * Used for both NEW and EDIT modes
 */
export const TaskFormStateSchema = z.object({
  // Metadata
  taskId: z.string().ulid().optional(), // Present in EDIT mode, absent in NEW mode
  mode: z.enum(["NEW", "EDIT"]),
  currentStep: z.number().int().min(1).max(4),
  
  // Step 1: Definition
  definition: TaskDefinitionSchema.partial(), // Partial for draft state
  
  // Step 2: Targets
  selectedTargets: z.array(TargetUserSchema),
  
  // Step 3: Assignments
  assignments: z.array(AssignmentMappingSchema),
  
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
    assignments: [],
    step1Valid: false,
    step2Valid: false,
    step3Valid: false,
  };
}

/**
 * Initialize state for EDIT task mode
 */
export function createEditTaskFormState(
  taskId: string,
  definition: TaskDefinition,
  targets: TargetUser[],
  assignments: AssignmentMapping[]
): TaskFormState {
  return {
    taskId,
    mode: "EDIT",
    currentStep: 1,
    definition,
    selectedTargets: targets,
    assignments,
    step1Valid: true,
    step2Valid: targets.length > 0,
    step3Valid: assignments.length > 0,
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
 */
export function validateStep3(assignments: AssignmentMapping[]): boolean {
  return assignments.length > 0 && assignments.every(a => a.targetUserIds.length > 0);
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
