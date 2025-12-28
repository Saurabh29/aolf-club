import { For, Show, createSignal, createMemo } from "solid-js";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Combobox,
  ComboboxControl,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxItem,
  ComboboxItemLabel,
  ComboboxItemIndicator,
} from "~/components/ui/combobox";
import type { AssignmentState } from "~/lib/schemas/ui/task-creation.schema";

// Types
type TargetUser = {
  id: string;
  name: string;
  phone: string;
  type: "Teacher" | "Volunteer";
};

type Assignee = {
  id: string;
  name: string;
  role: "Teacher" | "Volunteer";
};

type AssigneeOption = {
  value: string; // "unassigned" or user.id
  label: string;
  assignee: Assignee | null;
};

type TaskStep3Props = {
  targets: TargetUser[];
  volunteers: Assignee[];
  teachers: Assignee[];
  initialAssignments?: AssignmentState;
  onNext: (assignments: AssignmentState) => void;
};

// Dummy data for testing
const DUMMY_ASSIGNEES: Assignee[] = [
  { id: "01JHHX3A1BEXAMPLE001", name: "John Smith", role: "Teacher" },
  { id: "01JHHX3A1BEXAMPLE002", name: "Sarah Johnson", role: "Teacher" },
  { id: "01JHHX3A1BEXAMPLE003", name: "Mike Davis", role: "Volunteer" },
  { id: "01JHHX3A1BEXAMPLE004", name: "Emily Brown", role: "Volunteer" },
  { id: "01JHHX3A1BEXAMPLE005", name: "David Wilson", role: "Volunteer" },
  { id: "01JHHX3A1BEXAMPLE006", name: "Lisa Anderson", role: "Teacher" },
];

export default function TaskStep3(props: TaskStep3Props) {
  // State
  const [assignments, setAssignments] = createSignal<AssignmentState>(
    props.initialAssignments || {}
  );
  const [selectedRows, setSelectedRows] = createSignal<Set<string>>(new Set());
  const [bulkAssigneeId, setBulkAssigneeId] = createSignal<string | null>(null);
  
  // Sorting state: "status" (default), "name", "phone", "type"
  const [sortBy, setSortBy] = createSignal<"status" | "name" | "phone" | "type">("status");
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("asc");

  // Combine all assignees (teachers + volunteers) with "Unassigned" option
  const allAssignees = createMemo(() => {
    // Use dummy data for now
    return DUMMY_ASSIGNEES;
  });

  const assigneeOptions = createMemo((): AssigneeOption[] => {
    const options: AssigneeOption[] = [
      { value: "unassigned", label: "Unassigned", assignee: null },
    ];
    
    allAssignees().forEach((assignee) => {
      options.push({
        value: assignee.id,
        label: `${assignee.name} (${assignee.role})`,
        assignee,
      });
    });
    
    return options;
  });

  // Sorted targets based on current sort settings
  const sortedTargets = createMemo(() => {
    const targets = [...props.targets];
    const assignmentsMap = assignments();
    const dir = sortDirection();
    
    targets.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy() === "status") {
        // Unassigned first
        const aAssigned = !!assignmentsMap[a.id];
        const bAssigned = !!assignmentsMap[b.id];
        if (!aAssigned && bAssigned) comparison = -1;
        else if (aAssigned && !bAssigned) comparison = 1;
        else comparison = a.name.localeCompare(b.name);
      } else if (sortBy() === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy() === "phone") {
        comparison = (a.phone || "").localeCompare(b.phone || "");
      } else if (sortBy() === "type") {
        comparison = a.type.localeCompare(b.type);
      }
      
      return dir === "asc" ? comparison : -comparison;
    });
    
    return targets;
  });

  const toggleSort = (column: "status" | "name" | "phone" | "type") => {
    if (sortBy() === column) {
      setSortDirection(sortDirection() === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  // Statistics
  const assignedCount = createMemo(() => {
    return Object.values(assignments()).filter((a) => a !== null).length;
  });

  const unassignedCount = createMemo(() => {
    return props.targets.length - assignedCount();
  });

  // Helper functions
  const getAssignee = (assigneeId: string | null | undefined): Assignee | null => {
    if (!assigneeId) return null;
    return allAssignees().find((a) => a.id === assigneeId) || null;
  };

  const getAssignmentOption = (targetId: string): AssigneeOption => {
    const assigneeId = assignments()[targetId];
    if (!assigneeId) {
      return { value: "unassigned", label: "Unassigned", assignee: null };
    }
    const assignee = getAssignee(assigneeId);
    if (!assignee) {
      return { value: "unassigned", label: "Unassigned", assignee: null };
    }
    return {
      value: assignee.id,
      label: `${assignee.name} (${assignee.role})`,
      assignee,
    };
  };

  const updateAssignment = (targetId: string, option: AssigneeOption) => {
    setAssignments((prev) => ({
      ...prev,
      [targetId]: option.value === "unassigned" ? null : option.value,
    }));
  };

  // Row selection
  const toggleRow = (targetId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(props.targets.map((t) => t.id)));
    } else {
      setSelectedRows(new Set<string>());
    }
  };

  const isRowSelected = (targetId: string) => selectedRows().has(targetId);

  // Bulk assignment
  const applyBulkAssignment = () => {
    const assigneeId = bulkAssigneeId();
    if (assigneeId === null) return;

    setAssignments((prev) => {
      const newAssignments = { ...prev };
      selectedRows().forEach((targetId) => {
        newAssignments[targetId] = assigneeId === "unassigned" ? null : assigneeId;
      });
      return newAssignments;
    });

    // Clear selection after bulk assignment
    setSelectedRows(new Set<string>());
    setBulkAssigneeId(null);
  };

  const handleNext = () => {
    props.onNext(assignments());
  };

  const getBulkAssigneeOption = (): AssigneeOption | undefined => {
    const id = bulkAssigneeId();
    if (!id) return undefined;
    return assigneeOptions().find((opt) => opt.value === id);
  };

  return (
    <div class="space-y-6">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-3xl font-bold">{props.targets.length}</div>
              <div class="text-sm text-muted-foreground">Total Targets</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-600">{assignedCount()}</div>
              <div class="text-sm text-muted-foreground">Assigned</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-orange-600">{unassignedCount()}</div>
              <div class="text-sm text-muted-foreground">Unassigned</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Assignment Toolbar */}
      <Show when={selectedRows().size > 0}>
        <Card class="border-blue-200 bg-blue-50">
          <CardContent class="pt-6">
            <div class="flex items-center gap-4">
              <span class="font-medium">
                {selectedRows().size} target{selectedRows().size !== 1 ? "s" : ""} selected
              </span>
              <div class="flex-1 max-w-xs">
                <Combobox<AssigneeOption>
                  options={assigneeOptions()}
                  value={getBulkAssigneeOption()}
                  onChange={(option) => setBulkAssigneeId(option?.value || null)}
                  optionValue="value"
                  optionTextValue="label"
                  placeholder="Select assignee..."
                  itemComponent={(itemProps) => (
                    <ComboboxItem item={itemProps.item}>
                      <ComboboxItemLabel>
                        {itemProps.item.rawValue.label}
                      </ComboboxItemLabel>
                      <ComboboxItemIndicator />
                    </ComboboxItem>
                  )}
                >
                  <ComboboxControl>
                    <ComboboxInput />
                    <ComboboxTrigger />
                  </ComboboxControl>
                  <ComboboxContent />
                </Combobox>
              </div>
              <Button
                onClick={applyBulkAssignment}
                disabled={bulkAssigneeId() === null}
              >
                Assign Selected
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedRows(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </Show>

      {/* Assignment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Target Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedRows().size > 0 &&
                      selectedRows().size === props.targets.length
                    }
                    onChange={(e) => selectAll(e.currentTarget.checked)}
                    class="cursor-pointer"
                  />
                </TableHead>
                <TableHead 
                  class="cursor-pointer hover:bg-gray-50" 
                  onClick={() => toggleSort("name")}
                >
                  <div class="flex items-center gap-1">
                    Target Name
                    {sortBy() === "name" && (
                      <span class="text-xs">{sortDirection() === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  class="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSort("phone")}
                >
                  <div class="flex items-center gap-1">
                    Phone
                    {sortBy() === "phone" && (
                      <span class="text-xs">{sortDirection() === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  class="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSort("type")}
                >
                  <div class="flex items-center gap-1">
                    Type
                    {sortBy() === "type" && (
                      <span class="text-xs">{sortDirection() === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  class="w-64 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSort("status")}
                >
                  <div class="flex items-center gap-1">
                    Assigned To
                    {sortBy() === "status" && (
                      <span class="text-xs">{sortDirection() === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={sortedTargets()}>
                {(target) => (
                  <TableRow>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isRowSelected(target.id)}
                        onChange={() => toggleRow(target.id)}
                        class="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell class="font-medium">{target.name}</TableCell>
                    <TableCell>{target.phone}</TableCell>
                    <TableCell>
                      <Badge variant={target.type === "Teacher" ? "default" : "secondary"}>
                        {target.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Combobox<AssigneeOption>
                        options={assigneeOptions()}
                        value={getAssignmentOption(target.id)}
                        onChange={(option) => {
                          if (option) {
                            updateAssignment(target.id, option);
                          }
                        }}
                        optionValue="value"
                        optionTextValue="label"
                        placeholder="Select assignee..."
                        itemComponent={(itemProps) => (
                          <ComboboxItem item={itemProps.item}>
                            <ComboboxItemLabel>
                              {itemProps.item.rawValue.label}
                            </ComboboxItemLabel>
                            <ComboboxItemIndicator />
                          </ComboboxItem>
                        )}
                      >
                        <ComboboxControl>
                          <ComboboxInput />
                          <ComboboxTrigger />
                        </ComboboxControl>
                        <ComboboxContent />
                      </Combobox>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div class="flex justify-end gap-4">
        <Button onClick={handleNext}>Next</Button>
      </div>
    </div>
  );
}
