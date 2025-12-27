/**
 * Task Form Container
 * 
 * Multi-step task creation/editing with shared flow.
 * Handles state management and step navigation.
 * 
 * Usage:
 * - NEW task: <TaskForm mode="NEW" onSave={...} onCancel={...} />
 * - EDIT task: <TaskForm mode="EDIT" taskId="..." initialData={...} onSave={...} onCancel={...} />
 */

import { createSignal, createMemo, Show, type Component } from "solid-js";
import { TaskStepper, type Step } from "~/components/TaskStepper";
import { TaskStep1 } from "~/components/TaskStep1";
import { TaskStep2 } from "~/components/TaskStep2";
import TaskStep3 from "~/components/TaskStep3";

import type {
  TaskFormState,
  TaskDefinition,
  TargetUser,
  AssignmentMapping,
  AssignmentState,
  SaveTaskRequest,
} from "~/lib/schemas/ui";
import { createNewTaskFormState, createEditTaskFormState, convertToAssignmentMappings } from "~/lib/schemas/ui";

const STEPS: Step[] = [
  { number: 1, label: "Define Task", description: "Title, location, actions" },
  { number: 2, label: "Select Targets", description: "Members or leads" },
  { number: 3, label: "Assign Volunteers", description: "Assign to teachers/volunteers" },
];

export interface TaskFormProps {
  mode: "NEW" | "EDIT";
  taskId?: string; // Required for EDIT mode
  initialData?: {
    definition: TaskDefinition;
    targets: TargetUser[];
    assignments: AssignmentMapping[]; // Backend format
  }; // Required for EDIT mode
  onSave: (request: SaveTaskRequest) => void;
  onCancel: () => void;
}

export const TaskForm: Component<TaskFormProps> = (props) => {
  // Initialize form state based on mode
  const [state, setState] = createSignal<TaskFormState>(
    props.mode === "EDIT" && props.initialData
      ? createEditTaskFormState(
          props.taskId!,
          props.initialData.definition,
          props.initialData.targets,
          props.initialData.assignments
        )
      : createNewTaskFormState()
  );

  // Completed steps (for stepper UI)
  const completedSteps = createMemo(() => {
    const s = state();
    const completed = new Set<number>();
    if (s.step1Valid) completed.add(1);
    if (s.step2Valid) completed.add(2);
    if (s.step3Valid) completed.add(3);
    return completed;
  });

  // Navigation
  const goToStep = (stepNumber: number) => {
    setState((prev) => ({ ...prev, currentStep: stepNumber }));
  };

  // Step 1: Save definition and move to step 2
  const handleStep1Next = (definition: TaskDefinition) => {
    setState((prev) => ({
      ...prev,
      definition,
      step1Valid: true,
      currentStep: 2,
    }));
  };

  // Step 2: Save targets and move to step 3
  const handleStep2Next = (targets: TargetUser[]) => {
    setState((prev) => ({
      ...prev,
      selectedTargets: targets,
      step2Valid: true,
      currentStep: 3,
    }));
  };

  // Step 3: Save assignments and submit
  const handleStep3Next = (assignments: AssignmentState) => {
    setState((prev) => ({
      ...prev,
      assignments,
      step3Valid: true,
    }));
    submitTask(assignments);
  };

  // Submit final task
  const submitTask = (assignments: AssignmentState) => {
    const s = state();
    if (!s.step1Valid || !s.step2Valid) {
      alert("Please complete all required steps");
      return;
    }

    // Convert Record-based assignments to AssignmentMapping[] for backend
    const assignmentMappings = convertToAssignmentMappings(assignments);

    const request: SaveTaskRequest = {
      taskId: s.taskId,
      definition: s.definition as TaskDefinition,
      targetUserIds: s.selectedTargets.map((t) => t.userId),
      assignments: assignmentMappings.length > 0 ? assignmentMappings : undefined,
    };

    props.onSave(request);
  };

  return (
    <div class="max-w-7xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          {props.mode === "NEW" ? "Create New Task" : "Edit Task"}
        </h1>
        <p class="text-gray-600 mt-2">
          {props.mode === "NEW"
            ? "Follow the steps below to create a new outreach task"
            : "Update task details and assignments"}
        </p>
      </div>

      {/* Stepper */}
      <TaskStepper
        steps={STEPS}
        currentStep={state().currentStep}
        completedSteps={completedSteps()}
        onStepClick={goToStep}
      />

      {/* Step Content */}
      <div class="mt-8">
        <Show when={state().currentStep === 1}>
          <TaskStep1
            initialData={state().definition}
            onNext={handleStep1Next}
            onCancel={props.onCancel}
          />
        </Show>

        <Show when={state().currentStep === 2}>
          <TaskStep2
            initialSelection={state().selectedTargets}
            onNext={handleStep2Next}
            onPrevious={() => goToStep(1)}
          />
        </Show>

        <Show when={state().currentStep === 3}>
          <TaskStep3
            targets={state().selectedTargets.map(t => ({ id: t.userId, name: t.name, phone: t.phone ?? "", type: t.targetType === "MEMBER" ? "Volunteer" : "Teacher" }))}
            volunteers={[]}
            teachers={[]}
            initialAssignments={state().assignments}
            onNext={handleStep3Next}
          />
        </Show>
      </div>
    </div>
  );
};
