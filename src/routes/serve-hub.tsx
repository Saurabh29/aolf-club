/**
 * Serve Hub Page
 * 
 * Primary screen for volunteers to:
 * 1. View tasks assigned to them
 * 2. Work on assigned targets (call/message/notes/follow-up)
 * 
 * Flow:
 * - Landing: List of tasks assigned to current user (no Scan, uses User Index)
 * - Task Detail: Mobile-first cards for each assigned target with inline actions
 * 
 * Requirements:
 * - Single working screen (no separate detail page)
 * - Respects task allowedActions
 * - No call history/logs (only latest interaction state)
 */

import { Show, createSignal, For, createResource, createMemo } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { AssignedUser } from "~/lib/schemas/ui/task.schema";
import { 
  fetchMyTasks,
  fetchTaskById,
  fetchMyAssignedUsers,
  saveInteraction,
  skipUser
} from "~/server/services";

export default function ServeHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Selected task (from query param)
  const selectedTaskId = createMemo(() => searchParams.taskId as string | undefined);
  
  // Fetch my assigned tasks
  const [tasks] = createResource(async () => {
    return await fetchMyTasks();
  });
  
  // Fetch task details when task is selected
  const [taskDetails] = createResource(selectedTaskId, async (taskId) => {
    if (!taskId) return null;
    return await fetchTaskById(taskId);
  });
  
  // Fetch assigned users for selected task
  const [assignedUsers, { refetch: refetchUsers }] = createResource(selectedTaskId, async (taskId) => {
    if (!taskId) return null;
    return await fetchMyAssignedUsers(taskId);
  });
  
  // Local state for interactions (before save)
  const [interactions, setInteractions] = createSignal<Record<string, any>>({});
  const [savingUserId, setSavingUserId] = createSignal<string | null>(null);
  
  const handleTaskSelect = (taskId: string) => {
    setSearchParams({ taskId });
  };
  
  const handleBackToList = () => {
    setSearchParams({});
  };
  
  const updateInteraction = (userId: string, field: string, value: any) => {
    setInteractions((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };
  
  const handleSave = async (user: AssignedUser) => {
    if (!selectedTaskId()) return;
    
    try {
      setSavingUserId(user.targetUserId);
      
      const userInteraction = interactions()[user.targetUserId] || {};
      const existingInteraction = user.interaction;
      
      await saveInteraction({
        taskId: selectedTaskId()!,
        targetUserId: user.targetUserId,
        actionsTaken: {
          called: userInteraction.called ?? existingInteraction?.actionsTaken.called ?? false,
          messaged: userInteraction.messaged ?? existingInteraction?.actionsTaken.messaged ?? false,
        },
        notes: userInteraction.notes ?? existingInteraction?.notes ?? "",
        rating: userInteraction.rating ?? existingInteraction?.rating,
        followUpAt: userInteraction.followUpAt ?? existingInteraction?.followUpAt,
      });
      
      // Refetch to show updated state
      await refetchUsers();
      
      // Clear local state for this user
      setInteractions((prev) => {
        const copy = { ...prev };
        delete copy[user.targetUserId];
        return copy;
      });
    } catch (error: any) {
      console.error("Failed to save:", error);
      alert(error.message || "Failed to save interaction");
    } finally {
      setSavingUserId(null);
    }
  };
  
  const handleSkip = async (user: AssignedUser) => {
    if (!selectedTaskId()) return;
    if (!confirm(`Skip ${user.name}? This will remove them from your list.`)) return;
    
    try {
      await skipUser(selectedTaskId()!, user.targetUserId);
      await refetchUsers();
    } catch (error: any) {
      console.error("Failed to skip:", error);
      alert(error.message || "Failed to skip user");
    }
  };

  return (
    <div class="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Serve Hub</h1>
          <p class="text-sm text-gray-600 mt-1">
            {selectedTaskId() ? "Work on your assigned targets" : "Your assigned tasks"}
          </p>
        </div>
        <Show when={selectedTaskId()}>
          <Button variant="outline" onClick={handleBackToList}>
            ← Back to Tasks
          </Button>
        </Show>
      </div>
      
      {/* Task List View */}
      <Show when={!selectedTaskId()}>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Show when={tasks.loading}>
            <div class="col-span-full text-center py-12 text-gray-500">
              Loading your tasks...
            </div>
          </Show>
          
          <Show when={tasks.error}>
            <div class="col-span-full">
              <Card class="border-red-200 bg-red-50">
                <CardContent class="pt-6">
                  <p class="text-red-800">Failed to load tasks: {String(tasks.error)}</p>
                </CardContent>
              </Card>
            </div>
          </Show>
          
          <Show when={tasks() && tasks()!.length === 0}>
            <div class="col-span-full text-center py-12 text-gray-500">
              <p class="text-lg font-medium">No tasks assigned</p>
              <p class="text-sm mt-2">Check back later or contact your coordinator</p>
            </div>
          </Show>
          
          <For each={tasks()}>
            {(task) => (
              <Card class="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleTaskSelect(task.taskId)}>
                <CardHeader>
                  <div class="flex items-start justify-between gap-2">
                    <CardTitle class="text-base font-semibold line-clamp-2">{task.title}</CardTitle>
                    <Badge variant={task.status === "COMPLETED" ? "default" : "secondary"} class="shrink-0">
                      {task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div class="flex items-center gap-2 text-sm text-gray-600">
                    <span class="font-medium">📍</span>
                    <span class="line-clamp-1">{task.locationName}</span>
                  </div>
                  
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex gap-2">
                      <Show when={task.assignedCount > 0}>
                        <Badge variant="outline">
                          {task.assignedCount} assigned
                        </Badge>
                      </Show>
                      <Show when={task.totalTargets - task.assignedCount > 0}>
                        <Badge variant="secondary">
                          {task.totalTargets - task.assignedCount} unassigned
                        </Badge>
                      </Show>
                    </div>
                    <span class="text-gray-500">→</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      </Show>
      
      {/* Task Detail View */}
      <Show when={selectedTaskId() && taskDetails()}>
        <div class="space-y-4">
          {/* Task Info Header */}
          <Card>
            <CardHeader>
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <CardTitle class="text-xl">{taskDetails()!.title}</CardTitle>
                  <p class="text-sm text-gray-600 mt-1">{taskDetails()!.locationName}</p>
                </div>
                <Badge variant={taskDetails()!.status === "COMPLETED" ? "default" : "secondary"}>
                  {taskDetails()!.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex gap-4 text-sm text-gray-600">
                <Show when={taskDetails()!.allowedActions.call}>
                  <Badge variant="outline">📞 Calling enabled</Badge>
                </Show>
                <Show when={taskDetails()!.allowedActions.message}>
                  <Badge variant="outline">💬 Messaging enabled</Badge>
                </Show>
              </div>
            </CardContent>
          </Card>
          
          {/* Assigned Users */}
          <div class="space-y-3">
            <h2 class="text-lg font-semibold text-gray-900">My Assigned Targets</h2>
            
            <Show when={assignedUsers.loading}>
              <Card>
                <CardContent class="py-12 text-center text-gray-500">
                  Loading assigned users...
                </CardContent>
              </Card>
            </Show>
            
            <Show when={assignedUsers.error}>
              <Card class="border-red-200 bg-red-50">
                <CardContent class="pt-6">
                  <p class="text-red-800">Failed to load assigned users: {String(assignedUsers.error)}</p>
                </CardContent>
              </Card>
            </Show>
            
            <Show when={assignedUsers() && assignedUsers()!.length === 0}>
              <Card>
                <CardContent class="py-12 text-center text-gray-500">
                  <p>No users assigned to you yet</p>
                </CardContent>
              </Card>
            </Show>
            
            <For each={assignedUsers()}>
              {(user) => {
                const localInteraction = () => interactions()[user.targetUserId] || {};
                const currentInteraction = () => user.interaction;
                const isSaving = () => savingUserId() === user.targetUserId;
                
                return (
                  <Card class="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1">
                          <CardTitle class="text-base font-semibold">{user.name}</CardTitle>
                          <p class="text-sm text-gray-600 mt-1">{user.phone}</p>
                        </div>
                        <div class="flex gap-2 items-center">
                          <Badge variant={user.targetType === "LEAD" ? "default" : "outline"}>
                            {user.targetType}
                          </Badge>
                          <Badge variant={user.status === "DONE" ? "default" : user.status === "SKIPPED" ? "secondary" : "outline"}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent class="space-y-4">
                      {/* Action Buttons */}
                      <div class="flex flex-wrap gap-2">
                        <Show when={taskDetails()!.allowedActions.call}>
                          <Button
                            as="a"
                            href={`tel:${user.phone}`}
                            variant="default"
                            size="sm"
                            onClick={() => updateInteraction(user.targetUserId, "called", true)}
                          >
                            📞 Call
                          </Button>
                        </Show>
                        <Show when={taskDetails()!.allowedActions.message}>
                          <Button
                            as="a"
                            href={`https://wa.me/${user.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="default"
                            size="sm"
                            onClick={() => updateInteraction(user.targetUserId, "messaged", true)}
                          >
                            💬 WhatsApp
                          </Button>
                        </Show>
                      </div>
                      
                      {/* Actions Taken */}
                      <div class="flex gap-4 text-sm">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localInteraction().called ?? currentInteraction()?.actionsTaken.called ?? false}
                            onChange={(e) => updateInteraction(user.targetUserId, "called", e.currentTarget.checked)}
                            class="rounded border-gray-300"
                          />
                          <span>Called</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localInteraction().messaged ?? currentInteraction()?.actionsTaken.messaged ?? false}
                            onChange={(e) => updateInteraction(user.targetUserId, "messaged", e.currentTarget.checked)}
                            class="rounded border-gray-300"
                          />
                          <span>Messaged</span>
                        </label>
                      </div>
                      
                      {/* Notes */}
                      <div class="space-y-1.5">
                        <Label for={`notes-${user.targetUserId}`} class="text-sm font-medium">Notes</Label>
                        <textarea
                          id={`notes-${user.targetUserId}`}
                          value={localInteraction().notes ?? currentInteraction()?.notes ?? ""}
                          onInput={(e) => updateInteraction(user.targetUserId, "notes", e.currentTarget.value)}
                          placeholder="Add notes about this interaction..."
                          class="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={2000}
                        />
                        <p class="text-xs text-gray-500 text-right">
                          {(localInteraction().notes ?? currentInteraction()?.notes ?? "").length} / 2000
                        </p>
                      </div>
                      
                      {/* Rating */}
                      <div class="space-y-1.5">
                        <Label class="text-sm font-medium">Rating</Label>
                        <div class="flex gap-1">
                          <For each={[1, 2, 3, 4, 5]}>
                            {(star) => (
                              <button
                                type="button"
                                onClick={() => updateInteraction(user.targetUserId, "rating", star)}
                                class={`text-2xl transition-colors ${
                                  (localInteraction().rating ?? currentInteraction()?.rating ?? 0) >= star
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              >
                                ★
                              </button>
                            )}
                          </For>
                        </div>
                      </div>
                      
                      {/* Follow-up Date */}
                      <div class="space-y-1.5">
                        <Label for={`followup-${user.targetUserId}`} class="text-sm font-medium">Follow-up Date</Label>
                        <Input
                          id={`followup-${user.targetUserId}`}
                          type="datetime-local"
                          value={localInteraction().followUpAt ?? currentInteraction()?.followUpAt ?? ""}
                          onInput={(e) => updateInteraction(user.targetUserId, "followUpAt", e.currentTarget.value)}
                          class="text-sm"
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div class="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleSave(user)}
                          disabled={isSaving()}
                          class="flex-1"
                        >
                          {isSaving() ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleSkip(user)}
                          disabled={isSaving()}
                        >
                          Skip
                        </Button>
                      </div>
                      
                      {/* Last Updated */}
                      <Show when={currentInteraction()?.updatedAt}>
                        <p class="text-xs text-gray-500 text-center">
                          Last updated: {new Date(currentInteraction()!.updatedAt!).toLocaleString()}
                        </p>
                      </Show>
                    </CardContent>
                  </Card>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
