/**
 * Tasks List Page
 * 
 * Displays all outreach tasks for the current location.
 * Users can view and navigate to task details.
 * 
 * Phase 2A: UI shell with dummy data only
 */

import { Show, createSignal, onMount, For } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

// Dummy task data
interface TaskListItem {
  taskId: string;
  title: string;
  locationName: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
  allowedActions: {
    call: boolean;
    message: boolean;
  };
  totalTargets: number;
  assignedCount: number;
  createdAt: string;
}

const DUMMY_TASKS: TaskListItem[] = [
  {
    taskId: "01JGAB12XYZ9876543210ABC",
    title: "Weekly Follow-ups - January 2025",
    locationName: "Bangalore Center",
    status: "IN_PROGRESS",
    allowedActions: { call: true, message: true },
    totalTargets: 142,
    assignedCount: 87,
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    taskId: "01JGAB34DEF5432109876XYZ",
    title: "New Member Outreach",
    locationName: "Bangalore Center",
    status: "OPEN",
    allowedActions: { call: true, message: false },
    totalTargets: 56,
    assignedCount: 0,
    createdAt: "2025-01-20T14:30:00Z",
  },
  {
    taskId: "01JGAB56GHI2109876543DEF",
    title: "Event Invitations - Republic Day",
    locationName: "Bangalore Center",
    status: "IN_PROGRESS",
    allowedActions: { call: false, message: true },
    totalTargets: 200,
    assignedCount: 145,
    createdAt: "2025-01-10T09:00:00Z",
  },
  {
    taskId: "01JGAB78JKL9876543210GHI",
    title: "Lead Follow-up Campaign",
    locationName: "Bangalore Center",
    status: "COMPLETED",
    allowedActions: { call: true, message: true },
    totalTargets: 75,
    assignedCount: 75,
    createdAt: "2025-01-05T11:00:00Z",
  },
];

export default function TasksList() {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  // Simple auth check
  onMount(async () => {
    try {
      const resp = await fetch("/api/auth/session");
      if (!resp.ok) {
        setIsAuthenticated(false);
        navigate("/", { replace: true });
        return;
      }
      const data = await resp.json();
      setIsAuthenticated(!!data);
      if (!data) {
        navigate("/", { replace: true });
      }
    } catch (e) {
      console.error("Auth check failed:", e);
      setIsAuthenticated(false);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
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
    <Show when={!loading()}>
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold text-gray-900">Tasks</h1>
          <A href="/tasks/new">
            <Button variant="default">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </Button>
          </A>
        </div>

        <div class="space-y-4">
          <For each={DUMMY_TASKS}>
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
    </Show>
  );
}
