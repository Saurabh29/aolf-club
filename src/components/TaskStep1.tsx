/**
 * Task Step 1: Define Task
 * 
 * Form for task title, location, allowed actions, and scripts.
 * Used by both NEW and EDIT task flows.
 */

import { createSignal, type Component, Show } from "solid-js";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import type { TaskDefinition } from "~/lib/schemas/ui";

export interface TaskStep1Props {
  initialData?: Partial<TaskDefinition>;
  onNext: (data: TaskDefinition) => void;
  onCancel?: () => void;
}

export const TaskStep1: Component<TaskStep1Props> = (props) => {
  const [title, setTitle] = createSignal(props.initialData?.title ?? "");
  const [locationId, setLocationId] = createSignal(props.initialData?.locationId ?? "");
  const [allowCall, setAllowCall] = createSignal(props.initialData?.allowedActions?.call ?? true);
  const [allowMessage, setAllowMessage] = createSignal(props.initialData?.allowedActions?.message ?? true);
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

    if (!locationId().trim()) {
      newErrors.locationId = "Location is required";
    }

    if (!allowCall() && !allowMessage()) {
      newErrors.allowedActions = "At least one action (Call or Message) must be enabled";
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
      locationId: locationId().trim(),
      allowedActions: {
        call: allowCall(),
        message: allowMessage(),
      },
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

          {/* Location */}
          <div>
            <Label for="locationId">Location *</Label>
            <Input
              id="locationId"
              type="text"
              value={locationId()}
              onInput={(e) => setLocationId(e.currentTarget.value)}
              placeholder="Location ID (ULID format)"
              class="mt-1"
            />
            <Show when={errors().locationId}>
              <p class="text-sm text-red-600 mt-1">{errors().locationId}</p>
            </Show>
            <p class="text-xs text-gray-500 mt-1">
              Future: Location dropdown will be implemented
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Actions</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center gap-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCall()}
                onChange={(e) => setAllowCall(e.currentTarget.checked)}
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm font-medium text-gray-700">Enable Call</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMessage()}
                onChange={(e) => setAllowMessage(e.currentTarget.checked)}
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm font-medium text-gray-700">Enable Message</span>
            </label>
          </div>
          <Show when={errors().allowedActions}>
            <p class="text-sm text-red-600">{errors().allowedActions}</p>
          </Show>
        </CardContent>
      </Card>

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
        <Button variant="default" onClick={handleNext} class="ml-auto">
          Next: Select Targets
        </Button>
      </div>
    </div>
  );
};
