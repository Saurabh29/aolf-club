/**
 * Tasks List Page
 * 
 * Displays all outreach tasks for the current location.
 * Users can view and navigate to task details.
 */

import { Show, For, createResource } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { fetchTasksForActiveLocation, getActiveLocationId } from "~/server/actions/task-outreach";
import type { OutreachTaskListItem } from "~/lib/schemas/ui/task.schema";

export default function TasksList() {
  // Get active location ID for conditional rendering
  const [activeLocationId] = createResource(async () => {
    return await getActiveLocationId();
  });

  // Get tasks for the active location
  const [tasks] = createResource(async () => {
    return await fetchTasksForActiveLocation();
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "OPEN":
        return "outline";
      case "IN_PROGRESS":
        return "default";
      case "COMPLETED":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-gray-900">Tasks</h1>
          <Show when={activeLocationId()}>
            <A href="/tasks/new">
              <Button variant="default">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                New Task
              </Button>
            </A>
          </Show>
        </div>

        <Show when={!activeLocationId()}>
          <Card class="border-yellow-200 bg-yellow-50">
            <CardContent class="pt-6">
              <p class="text-yellow-800">
                Please select an active location in your profile to view tasks.
              </p>
            </CardContent>
          </Card>
        </Show>

        <Show when={tasks.loading}>
          <Card>
            <CardContent class="py-12 text-center text-gray-500">
              Loading tasks...
            </CardContent>
          </Card>
        </Show>

        <Show when={tasks.error}>
          <Card class="border-red-200 bg-red-50">
            <CardContent class="pt-6">
              <p class="text-red-800">Failed to load tasks: {String(tasks.error)}</p>
            </CardContent>
          </Card>
        </Show>

        <Show when={tasks() && tasks()!.length === 0 && activeLocationId()}>
          <Card>
            <CardContent class="py-12 text-center text-gray-500">
              <p class="text-lg font-medium">No tasks found</p>
              <p class="text-sm mt-2">Create your first task to get started</p>
            </CardContent>
          </Card>
        </Show>

        <div class="space-y-4">
          <For each={tasks()}>
            {(task) => (
              <Card>
                <CardHeader>
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <CardTitle class="mb-2">{task.title}</CardTitle>
                      <div class="flex items-center gap-4 text-sm text-gray-600">
                        <span class="flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          {task.locationName}
                        </span>
                        <span>Created {formatDate(task.createdAt)}</span>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(task.status)}>{task.status.replace("_", " ")}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div class="space-y-3">
                    <div class="flex items-center gap-3">
                      <span class="text-sm text-gray-600">Actions:</span>
                      <div class="flex items-center gap-2">
                        {task.allowedActions.call && (
                          <Badge variant="outline">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            Call
                          </Badge>
                        )}
                        {task.allowedActions.message && (
                          <Badge variant="outline">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                              />
                            </svg>
                            Message
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t">
                      <div class="text-sm">
                        <span class="font-medium text-gray-900">{task.assignedCount}</span>
                        <span class="text-gray-600"> / {task.totalTargets} assigned</span>
                      </div>
                      <A href={`/tasks/${task.taskId}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </A>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      </div>
  );
}
