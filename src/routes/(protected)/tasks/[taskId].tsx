/**
 * Task Detail Page
 * 
 * Single-screen interface for task outreach management.
 * Sections:
 * A. Task Summary - Title, location, allowed actions, status
 * B. Assignment Panel - Assign users (creator) or self-assign (volunteer)
 * C. My Assigned Users - Work area with call/message/notes/rating/follow-up
 * 
 * Phase 2B: Backend integration with real DynamoDB calls
 */

import { Show, createSignal, For, createResource } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type {
  SelfAssignRequest,
  SaveInteractionRequest,
} from "~/lib/schemas/ui/task.schema";
import {
  fetchTaskAction,
  fetchMyAssignedUsersAction,
  fetchUnassignedCountAction,
  selfAssignAction,
  saveInteractionAction,
  skipUserAction,
} from "~/server/api/task-outreach";

// ========== Component ==========

export default function TaskDetail() {
  const params = useParams();

  // Format date for display
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Local state
  const [assignCount, setAssignCount] = createSignal(20);
  const [error, setError] = createSignal<string | null>(null);
  const [saveStatus, setSaveStatus] = createSignal<string | null>(null);
  
  // Track user inputs before save
  const [userInputs, setUserInputs] = createSignal<Map<string, any>>(new Map());

  // Fetch task data
  const [task] = createResource(
    () => params.taskId,
    async (taskId) => {
      if (!taskId) throw new Error("Task ID is required");
      const result = await fetchTaskAction(taskId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to fetch task");
      }
      if (!result.data) {
        throw new Error("Task not found");
      }
      return result.data;
    }
  );

  // Fetch assigned users
  const [assignedUsers, { refetch: refetchAssignedUsers }] = createResource(
    () => params.taskId,
    async (taskId) => {
      if (!taskId) return [];
      const result = await fetchMyAssignedUsersAction(taskId);
      if (!result.success) {
        console.error("Failed to fetch assigned users:", result.error);
        return [];
      }
      return result.data;
    }
  );

  // Fetch unassigned count
  const [unassignedCount, { refetch: refetchUnassignedCount }] = createResource(
    () => params.taskId,
    async (taskId) => {
      if (!taskId) return 0;
      const result = await fetchUnassignedCountAction(taskId);
      if (!result.success) {
        console.error("Failed to fetch unassigned count:", result.error);
        return 0;
      }
      return result.data;
    }
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "outline";
      case "DONE":
        return "secondary";
      case "SKIPPED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleMessage = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const updateUserInput = (userId: string, field: string, value: any) => {
    const inputs = new Map(userInputs());
    const userInput = inputs.get(userId) || {};
    inputs.set(userId, { ...userInput, [field]: value });
    setUserInputs(inputs);
  };

  const getUserInput = (userId: string, field: string, defaultValue: any = "") => {
    const inputs = userInputs();
    const userInput = inputs.get(userId) || {};
    return userInput[field] !== undefined ? userInput[field] : defaultValue;
  };

  // Check if current user is the creator
  const isCreator = () => {
    // TODO: Get current user ID from session and compare with task().createdBy
    return false; // For now, assume volunteer view
  };

  const handleSave = async (userId: string) => {
    try {
      setSaveStatus("saving");
      setError(null);

      // Find the user from assigned users
      const user = assignedUsers()?.find((u: any) => u.targetUserId === userId);
      if (!user) {
        setError("User not found in assignments");
        return;
      }

      const inputs = userInputs().get(userId) || {};
      const called = inputs.called !== undefined ? inputs.called : user.interaction?.actionsTaken.called || false;
      const messaged = inputs.messaged !== undefined ? inputs.messaged : user.interaction?.actionsTaken.messaged || false;
      const notes = inputs.notes !== undefined ? inputs.notes : user.interaction?.notes || "";
      const rating = inputs.rating !== undefined ? inputs.rating : user.interaction?.rating;
      const followUpAt = inputs.followUpAt !== undefined ? inputs.followUpAt : user.interaction?.followUpAt;

      if (!params.taskId) {
        setError("Task ID is missing");
        return;
      }
      const request: SaveInteractionRequest = {
        taskId: params.taskId,
        targetUserId: userId,
        actionsTaken: { called, messaged },
        notes,
        rating,
        followUpAt,
      };

      const result = await saveInteractionAction(request);
      if (!result.success) {
        setError(result.error ?? "Failed to save interaction");
        setSaveStatus(null);
        return;
      }
      setSaveStatus("saved");
      
      // Refetch assigned users to show updated state
      await refetchAssignedUsers();
      
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSaveStatus(null);
    }
  };

  const handleSkip = async (userId: string) => {
    try {
      setError(null);
      if (!params.taskId) {
        setError("Task ID is missing");
        return;
      }
      const result = await skipUserAction(params.taskId, userId);
      if (!result.success) {
        setError(result.error ?? "Failed to skip user");
        return;
      }
      await refetchAssignedUsers();
    } catch (err: any) {
      setError(err.message || "Failed to skip user");
    }
  };

  const handleSelfAssign = async () => {
    try {
      setError(null);
      if (!params.taskId) {
        setError("Task ID is missing");
        return;
      }
      const request: SelfAssignRequest = {
        taskId: params.taskId,
        count: assignCount(),
      };

      const result = await selfAssignAction(request);
      if (!result.success) {
        setError(result.error ?? "Failed to assign users");
        return;
      }
      
      // Refetch all data
      await Promise.all([refetchAssignedUsers(), refetchUnassignedCount()]);
      
      // Show success message
      alert(result.data.message);
    } catch (err: any) {
      setError(err.message || "Failed to assign users");
    }
  };

  return (
    <Show
        when={!task.loading && !assignedUsers.loading}
        fallback={
          <div class="p-6 flex items-center justify-center min-h-screen">
            <div class="text-center">
              <svg
                class="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p class="text-gray-600">Loading task details...</p>
            </div>
          </div>
        }
      >
        <Show when={task() && !task.error} fallback={<div class="p-6 text-red-600">Error: {task.error?.message || "Task not found"}</div>}>
          <div class="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Error Display */}
            <Show when={error()}>
              <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error()}
              </div>
            </Show>

            {/* Back Navigation */}
            <A href="/tasks" class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tasks
            </A>

            {/* ========== SECTION A: TASK SUMMARY ========== */}
            <Card>
              <CardHeader>
                <div class="space-y-3">
                  <div class="flex items-start justify-between">
                    <div>
                      <CardTitle class="text-2xl mb-2">{task()!.title}</CardTitle>
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
                          {task()!.locationName}
                        </span>
                        <span>Created by {task()!.createdByName}</span>
                        <span>{formatDate(task()!.createdAt)}</span>
                      </div>
                    </div>
                    <Badge variant="default">{task()!.status.replace("_", " ")}</Badge>
                  </div>

                  <div class="flex items-center gap-3 pt-2 border-t">
                    <span class="text-sm font-medium text-gray-700">Allowed Actions:</span>
                    <div class="flex items-center gap-2">
                      {task()!.allowedActions.call && (
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
                      {task()!.allowedActions.message && (
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
            </div>
          </CardHeader>
        </Card>

        {/* ========== SECTION B: ASSIGNMENT PANEL ========== */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <Show
              when={!isCreator()}
              fallback={
                <div class="space-y-4">
                  <p class="text-sm text-gray-600">Creator view: Assign targets to volunteers manually.</p>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Assign To</Label>
                      <select class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                        <option>Select Teacher/Volunteer</option>
                        <option>Deepak Patel</option>
                        <option>Sneha Reddy</option>
                        <option>Arjun Iyer</option>
                      </select>
                    </div>
                    <div>
                      <Label>Number of Users</Label>
                      <Input type="number" value="10" class="mt-1" />
                    </div>
                  </div>
                  <Button variant="default">Assign Selected Users</Button>
                </div>
              }
            >
              {/* Volunteer View: Self-Assignment */}
              <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span class="font-semibold text-blue-900">{unassignedCount() ?? 0} unassigned users available</span>
                    </div>
                    <p class="text-sm text-blue-700 mt-1">Click below to claim users and start outreach</p>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <Label>Assign</Label>
                    <Input
                      type="number"
                      value={assignCount()}
                      onInput={(e) => setAssignCount(parseInt(e.currentTarget.value) || 20)}
                      class="w-20"
                      min="1"
                      max={unassignedCount() ?? 100}
                    />
                    <span class="text-sm text-gray-600">users to me</span>
                  </div>
                  <Button variant="default" onClick={handleSelfAssign} disabled={!unassignedCount() || unassignedCount() === 0}>
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Assign Me
                  </Button>
                </div>

                <div class="text-xs text-gray-500">
                  Tip: Users are assigned atomically. If another volunteer claims the same users, you'll be assigned
                  from the remaining pool.
                </div>
              </div>
            </Show>
          </CardContent>
        </Card>

            {/* ========== SECTION C: MY ASSIGNED USERS ========== */}
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-900">My Assigned Users ({assignedUsers()?.length ?? 0})</h2>
                <div class="flex items-center gap-2">
                  <select class="px-3 py-1 text-sm border border-gray-300 rounded-md">
                    <option>All</option>
                    <option>Pending</option>
                    <option>Done</option>
                    <option>Follow-up Today</option>
                  </select>
                </div>
              </div>

              <Show when={saveStatus()}>
                <div class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  {saveStatus() === "saving" ? "Saving..." : "Saved successfully!"}
                </div>
              </Show>

              <div class="space-y-4">
                <For each={assignedUsers()}>
                  {(user) => (
                    <Card>
                      <CardHeader>
                        <div class="flex items-start justify-between">
                          <div>
                            <CardTitle class="text-lg">
                              {user.name}
                              <Badge variant="outline" class="ml-2">
                                {user.targetType}
                              </Badge>
                            </CardTitle>
                            <div class="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              {user.phone}
                            </div>
                          </div>
                          <Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div class="space-y-4">
                          {/* Action Buttons */}
                          <div class="flex items-center gap-2">
                            {task()!.allowedActions.call && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => {
                                  handleCall(user.phone);
                                  updateUserInput(user.targetUserId, "called", true);
                                }}
                              >
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                Call
                              </Button>
                            )}
                            {task()!.allowedActions.message && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  handleMessage(user.phone);
                                  updateUserInput(user.targetUserId, "messaged", true);
                                }}
                              >
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                              />
                            </svg>
                            Message
                          </Button>
                        )}
                        {user.interaction && (
                          <div class="flex items-center gap-2 ml-4 text-xs text-gray-500">
                            {user.interaction?.actionsTaken.called && <span>Γ£ô Called</span>}
                            {user.interaction?.actionsTaken.messaged && <span>Γ£ô Messaged</span>}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <Label>Notes</Label>
                        <textarea
                          class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md resize-none"
                          rows="3"
                          placeholder="Add notes about the interaction..."
                          value={getUserInput(user.targetUserId, "notes", user.interaction?.notes || "")}
                          onInput={(e) => updateUserInput(user.targetUserId, "notes", e.currentTarget.value)}
                        />
                      </div>

                      {/* Rating */}
                      <div>
                        <Label>Rating</Label>
                        <div class="flex items-center gap-1 mt-1">
                          <For each={[1, 2, 3, 4, 5]}>
                            {(star) => {
                              const currentRating = getUserInput(user.targetUserId, "rating", user.interaction?.rating);
                              return (
                                <button
                                  type="button"
                                  class={`text-2xl ${
                                    currentRating && star <= currentRating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  } hover:text-yellow-400`}
                                  onClick={() => updateUserInput(user.targetUserId, "rating", star)}
                                >
                                  Γÿà
                                </button>
                              );
                            }}
                          </For>
                        </div>
                      </div>

                      {/* Follow-up Date */}
                      <div>
                        <Label>Follow-up Date (Optional)</Label>
                        <Input
                          type="date"
                          class="mt-1"
                          value={
                            getUserInput(
                              user.targetUserId,
                              "followUpAt",
                              user.interaction?.followUpAt ? user.interaction.followUpAt.split("T")[0] : ""
                            )
                          }
                          onInput={(e) => {
                            const dateValue = e.currentTarget.value;
                            updateUserInput(
                              user.targetUserId,
                              "followUpAt",
                              dateValue ? new Date(dateValue).toISOString() : undefined
                            );
                          }}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div class="flex items-center justify-between pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => handleSkip(user.targetUserId)}>
                          Mark as Skipped
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleSave(user.targetUserId)}>
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Save
                        </Button>
                      </div>

                      {user.interaction?.updatedAt && (
                        <div class="text-xs text-gray-500 text-right">
                          Last updated: {formatDate(user.interaction.updatedAt)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </For>
          </div>

          {/* Empty State */}
          <Show when={(assignedUsers()?.length ?? 0) === 0}>
            <div class="text-center py-12 text-gray-500">
              <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p class="text-lg font-medium">No users assigned yet</p>
              <p class="text-sm mt-1">Click "Assign Me" above to get started</p>
            </div>
          </Show>
        </div>
      </div>
        </Show>
      </Show>
  );
}
