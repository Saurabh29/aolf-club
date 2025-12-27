/**
 * Task Step 3: Assign Teachers/Volunteers to Targets
 * 
 * Allows selecting multiple targets and assigning them to one specific teacher/volunteer.
 * Shows clear indication of who is assigned to whom.
 */

import { For, Show, createSignal, createMemo, type Component } from "solid-js";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { TargetUser, AssignmentMapping, Assignee } from "~/lib/schemas/ui";

// Dummy assignees (teachers/volunteers)
const DUMMY_ASSIGNEES: Assignee[] = [
  { userId: "01HZXK7G2TEACHER001", name: "Deepak Patel", role: "TEACHER" },
  { userId: "01HZXK7G2TEACHER002", name: "Sneha Reddy", role: "TEACHER" },
  { userId: "01HZXK7G2VOLUNTEER01", name: "Arjun Iyer", role: "VOLUNTEER" },
  { userId: "01HZXK7G2VOLUNTEER02", name: "Meera Shah", role: "VOLUNTEER" },
];

export interface TaskStep3Props {
  targets: TargetUser[];
  initialAssignments?: AssignmentMapping[];
  onNext: (assignments: AssignmentMapping[]) => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export const TaskStep3: Component<TaskStep3Props> = (props) => {
  const [assignments, setAssignments] = createSignal<Map<string, string[]>>(
    new Map(
      (props.initialAssignments ?? []).map((a) => [a.assigneeUserId, a.targetUserIds])
    )
  );
  const [selectedTargetIds, setSelectedTargetIds] = createSignal<Set<string>>(new Set());
  const [selectedAssignee, setSelectedAssignee] = createSignal<string | null>(null);

  // Get assignment for a target
  const getAssignmentForTarget = (targetUserId: string): Assignee | null => {
    for (const [assigneeId, targetIds] of assignments()) {
      if (targetIds.includes(targetUserId)) {
        return DUMMY_ASSIGNEES.find((a) => a.userId === assigneeId) ?? null;
      }
    }
    return null;
  };

  // Get targets assigned to an assignee
  const getTargetsForAssignee = (assigneeUserId: string): TargetUser[] => {
    const targetIds = assignments().get(assigneeUserId) ?? [];
    return props.targets.filter((t) => targetIds.includes(t.userId));
  };

  // Unassigned targets
  const unassignedTargets = createMemo(() => {
    const assignedIds = new Set<string>();
    for (const targetIds of assignments().values()) {
      targetIds.forEach((id) => assignedIds.add(id));
    }
    return props.targets.filter((t) => !assignedIds.has(t.userId));
  });

  // Toggle target selection
  const toggleTarget = (targetUserId: string) => {
    const newSet = new Set(selectedTargetIds());
    if (newSet.has(targetUserId)) {
      newSet.delete(targetUserId);
    } else {
      newSet.add(targetUserId);
    }
    setSelectedTargetIds(newSet);
  };

  // Assign selected targets to chosen assignee
  const handleAssign = () => {
    if (!selectedAssignee()) {
      alert("Please select a teacher or volunteer");
      return;
    }
    if (selectedTargetIds().size === 0) {
      alert("Please select at least one target user");
      return;
    }

    const assigneeId = selectedAssignee()!;
    const newAssignments = new Map(assignments());
    const existing = newAssignments.get(assigneeId) ?? [];
    const updated = [...new Set([...existing, ...Array.from(selectedTargetIds())])];
    newAssignments.set(assigneeId, updated);

    setAssignments(newAssignments);
    setSelectedTargetIds(new Set<string>());
    setSelectedAssignee(null);
  };

  // Remove a single assignment
  const handleRemoveAssignment = (assigneeUserId: string, targetUserId: string) => {
    const newAssignments = new Map(assignments());
    const existing = newAssignments.get(assigneeUserId) ?? [];
    const updated = existing.filter((id) => id !== targetUserId);
    if (updated.length > 0) {
      newAssignments.set(assigneeUserId, updated);
    } else {
      newAssignments.delete(assigneeUserId);
    }
    setAssignments(newAssignments);
  };

  const handleNext = () => {
    const mappings: AssignmentMapping[] = Array.from(assignments()).map(
      ([assigneeUserId, targetUserIds]) => ({
        assigneeUserId,
        targetUserIds,
      })
    );
    props.onNext(mappings);
  };

  return (
    <div class="space-y-6">
      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
          <p class="text-sm text-gray-600 mt-2">
            {unassignedTargets().length} of {props.targets.length} targets unassigned
          </p>
        </CardHeader>
        <CardContent class="space-y-4">
          <Show
            when={assignments().size > 0}
            fallback={
              <div class="text-center text-gray-500 py-6">
                No assignments yet. Select targets below and assign to a teacher/volunteer.
              </div>
            }
          >
            <For each={DUMMY_ASSIGNEES}>
              {(assignee) => {
                const assignedTargets = getTargetsForAssignee(assignee.userId);
                return (
                  <Show when={assignedTargets.length > 0}>
                    <div class="p-4 border border-gray-200 rounded-lg space-y-2">
                      <div class="flex items-center justify-between">
                        <div>
                          <span class="font-medium text-gray-900">{assignee.name}</span>
                          <Badge variant="outline" class="ml-2">
                            {assignee.role}
                          </Badge>
                        </div>
                        <span class="text-sm text-gray-600">
                          {assignedTargets.length} target{assignedTargets.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <For each={assignedTargets}>
                          {(target) => (
                            <div class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm">
                              <span>{target.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAssignment(assignee.userId, target.userId)}
                                class="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                );
              }}
            </For>
          </Show>
        </CardContent>
      </Card>

      {/* Assignment Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Targets to Teacher/Volunteer</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Step 1: Select targets */}
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">
              Step 1: Select target users ({selectedTargetIds().size} selected)
            </h4>
            <div class="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-12">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <Show
                    when={unassignedTargets().length > 0}
                    fallback={
                      <TableRow>
                        <TableCell colspan={4} class="text-center text-gray-500 py-6">
                          All targets have been assigned
                        </TableCell>
                      </TableRow>
                    }
                  >
                    <For each={unassignedTargets()}>
                      {(target) => {
                        const isSelected = () => selectedTargetIds().has(target.userId);
                        return (
                          <TableRow
                            class="cursor-pointer"
                            classList={{ "bg-blue-50": isSelected() }}
                            onClick={() => toggleTarget(target.userId)}
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={isSelected()}
                                onChange={() => toggleTarget(target.userId)}
                                onClick={(e) => e.stopPropagation()}
                                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </TableCell>
                            <TableCell>
                              <div class="font-medium text-gray-900">{target.name}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{target.targetType}</Badge>
                            </TableCell>
                            <TableCell>
                              <span class="text-sm text-gray-500">Unassigned</span>
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    </For>
                  </Show>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Step 2: Choose assignee */}
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">
              Step 2: Choose teacher or volunteer
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <For each={DUMMY_ASSIGNEES}>
                {(assignee) => (
                  <button
                    type="button"
                    onClick={() => setSelectedAssignee(assignee.userId)}
                    class={`p-3 border rounded-lg text-left transition-colors ${
                      selectedAssignee() === assignee.userId
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div class="font-medium text-sm">{assignee.name}</div>
                    <Badge variant="outline" class="mt-1 text-xs">
                      {assignee.role}
                    </Badge>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Assign button */}
          <div>
            <Button
              variant="default"
              onClick={handleAssign}
              disabled={selectedTargetIds().size === 0 || !selectedAssignee()}
            >
              Assign {selectedTargetIds().size} target{selectedTargetIds().size !== 1 ? "s" : ""} to{" "}
              {selectedAssignee()
                ? DUMMY_ASSIGNEES.find((a) => a.userId === selectedAssignee())?.name
                : "..."}
            </Button>
          </div>

          <p class="text-xs text-gray-500">
            Note: This is dummy data. Backend integration will load real teachers/volunteers from the database.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div class="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={props.onPrevious}>
          Previous
        </Button>
        <div class="flex gap-2">
          <Button variant="secondary" onClick={props.onSkip}>
            Skip (Allow Self-Assignment)
          </Button>
          <Button variant="default" onClick={handleNext}>
            Save Task
          </Button>
        </div>
      </div>
    </div>
  );
};
