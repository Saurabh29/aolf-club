/**
 * Task Step 1: Define Task
 * 
 * Form for task title, location, allowed actions, and scripts.
 * Used by both NEW and EDIT task flows.
 */

import { createSignal, createResource, type Component, Show } from "solid-js";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { getCurrentUserId } from "~/server/actions/auth";
import { getUserById } from "~/server/db/repositories/user.repository";
import type { TaskDefinition } from "~/lib/schemas/ui";

export interface TaskStep1Props {
  initialData?: Partial<TaskDefinition>;
  onNext: (data: TaskDefinition) => void;
  onCancel?: () => void;
}

export const TaskStep1: Component<TaskStep1Props> = (props) => {
  // Fetch user's active location
  const [locationIdResource] = createResource(async () => {
    try {
      const userId = await getCurrentUserId();
      const user = await getUserById(userId);
      return user?.activeLocationId || null;
    } catch {
      return null;
    }
  });

  const [title, setTitle] = createSignal(props.initialData?.title ?? "");
  const [taskCode, setTaskCode] = createSignal(props.initialData?.taskCode ?? "");
  const [callScript, setCallScript] = createSignal(props.initialData?.callScript ?? "");
  const [messageTemplate, setMessageTemplate] = createSignal(props.initialData?.messageTemplate ?? "");
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title().trim()) {
      newErrors.title = "Title is required";
    } else if (title().length > 255) {
      newErrors.title = "Title must be 255 characters or less";
    }

    const code = taskCode().trim();
    if (!code) {
      newErrors.taskCode = "Task code is required";
    } else if (code.length > 50) {
      newErrors.taskCode = "Task code must be 50 characters or less";
    } else if (!/^[a-z0-9-]+$/.test(code)) {
      newErrors.taskCode = "Task code must contain only lowercase letters, numbers, and hyphens";
    } else if (code.startsWith("-") || code.endsWith("-")) {
      newErrors.taskCode = "Task code cannot start or end with a hyphen";
    }

    const locationId = locationIdResource();
    if (!locationId) {
      newErrors.locationId = "No active location found. Please select a location.";
    }

    if (callScript().length > 5000) {
      newErrors.callScript = "Call script must be 5000 characters or less";
    }

    if (messageTemplate().length > 2000) {
      newErrors.messageTemplate = "Message template must be 2000 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;

    const data: TaskDefinition = {
      title: title().trim(),
      taskCode: taskCode().trim().toLowerCase(),
      locationId: locationIdResource()!,
      // call and message always allowed
      callScript: callScript().trim() || undefined,
      messageTemplate: messageTemplate().trim() || undefined,
    };

    props.onNext(data);
  };

  return (
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Title */}
          <div>
            <Label for="title">Task Title *</Label>
            <Input
              id="title"
              type="text"
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
              placeholder="e.g., Call new leads from Sunday event"
              class="mt-1"
            />
            <Show when={errors().title}>
              <p class="text-sm text-red-600 mt-1">{errors().title}</p>
            </Show>
          </div>

          {/* Task Code */}
          <div>
            <Label for="taskCode">Task Code *</Label>
            <Input
              id="taskCode"
              type="text"
              value={taskCode()}
              onInput={(e) => setTaskCode(e.currentTarget.value.toLowerCase())}
              placeholder="e.g., sunday-event-calls"
              class="mt-1"
            />
            <p class="text-xs text-gray-500 mt-1">
              URL-safe code (lowercase, numbers, hyphens only). Used in task URLs.
            </p>
            <Show when={errors().taskCode}>
              <p class="text-sm text-red-600 mt-1">{errors().taskCode}</p>
            </Show>
          </div>

          {/* Location is auto-detected; not displayed here */}
        </CardContent>
      </Card>

      {/* Allowed Actions removed: Call & Message always allowed */}

      <Card>
        <CardHeader>
          <CardTitle>Scripts & Templates</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Call Script */}
          <div>
            <Label for="callScript">Call Script (Optional)</Label>
            <textarea
              id="callScript"
              value={callScript()}
              onInput={(e) => setCallScript(e.currentTarget.value)}
              placeholder="Script for volunteers to use during calls..."
              class="mt-1 w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div class="flex justify-between items-center mt-1">
              <Show when={errors().callScript}>
                <p class="text-sm text-red-600">{errors().callScript}</p>
              </Show>
              <span class="text-xs text-gray-500 ml-auto">
                {callScript().length} / 5000
              </span>
            </div>
          </div>

          {/* Message Template */}
          <div>
            <Label for="messageTemplate">Message Template (Optional)</Label>
            <textarea
              id="messageTemplate"
              value={messageTemplate()}
              onInput={(e) => setMessageTemplate(e.currentTarget.value)}
              placeholder="Template message for WhatsApp/SMS..."
              class="mt-1 w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div class="flex justify-between items-center mt-1">
              <Show when={errors().messageTemplate}>
                <p class="text-sm text-red-600">{errors().messageTemplate}</p>
              </Show>
              <span class="text-xs text-gray-500 ml-auto">
                {messageTemplate().length} / 2000
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div class="flex justify-between items-center pt-4">
        <Show when={props.onCancel}>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
        </Show>
        <Button variant="default" onClick={handleNext} class="ml-auto" disabled={locationIdResource.loading || !locationIdResource()}>
          {locationIdResource.loading ? "Detecting location..." : "Next: Select Targets"}
        </Button>
      </div>
    </div>
  );
};
