/**
 * Task Stepper Component
 * 
 * Multi-step navigation for task creation/editing.
 * Shows progress and allows navigation between steps.
 */

import { For, type Component } from "solid-js";
import { cn } from "~/lib/utils";

export interface Step {
  number: number;
  label: string;
  description?: string;
}

export interface TaskStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepNumber: number) => void;
}

export const TaskStepper: Component<TaskStepperProps> = (props) => {
  const isStepAccessible = (stepNumber: number): boolean => {
    // Can access current step, completed steps, or next step after last completed
    if (stepNumber === props.currentStep) return true;
    if (props.completedSteps.has(stepNumber)) return true;
    if (stepNumber === props.currentStep + 1) return true;
    return false;
  };

  return (
    <nav aria-label="Progress">
      <ol class="flex items-center justify-between w-full">
        <For each={props.steps}>
          {(step, index) => {
            const isCompleted = props.completedSteps.has(step.number);
            const isCurrent = props.currentStep === step.number;
            const isAccessible = isStepAccessible(step.number);
            const isLast = index() === props.steps.length - 1;

            return (
              <li class={cn("flex items-center", !isLast && "flex-1")}>
                <div class="flex items-center w-full">
                  {/* Step Circle */}
                  <button
                    type="button"
                    onClick={() => isAccessible && props.onStepClick?.(step.number)}
                    disabled={!isAccessible}
                    class={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                      isCurrent && "border-blue-600 bg-blue-600 text-white",
                      isCompleted && !isCurrent && "border-green-600 bg-green-600 text-white",
                      !isCurrent && !isCompleted && "border-gray-300 bg-white text-gray-500",
                      isAccessible && !isCurrent && "hover:border-blue-400 cursor-pointer",
                      !isAccessible && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span class="text-sm font-semibold">{step.number}</span>
                    )}
                  </button>

                  {/* Step Label */}
                  <div class="ml-3 flex-1">
                    <div
                      class={cn(
                        "text-sm font-medium",
                        isCurrent && "text-blue-600",
                        isCompleted && !isCurrent && "text-green-600",
                        !isCurrent && !isCompleted && "text-gray-500"
                      )}
                    >
                      {step.label}
                    </div>
                    {step.description && (
                      <div class="text-xs text-gray-500">{step.description}</div>
                    )}
                  </div>

                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      class={cn(
                        "h-0.5 w-full mx-4",
                        isCompleted ? "bg-green-600" : "bg-gray-300"
                      )}
                    />
                  )}
                </div>
              </li>
            );
          }}
        </For>
      </ol>
    </nav>
  );
};
