/**
 * Task Step 2: Select Target Users (Members/Leads)
 * 
 * Table-based selection of users to be added as task targets.
 * Shows selection status and allows multi-select.
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
import type { TargetUser } from "~/lib/schemas/ui";

// Dummy data for demonstration
const DUMMY_MEMBERS: TargetUser[] = [
  {
    userId: "01HZXK7G2MJQK3RTWVB4MEMBER1",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    email: "rajesh@example.com",
    targetType: "MEMBER",
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4MEMBER2",
    name: "Priya Sharma",
    phone: "+91 98765 43211",
    email: "priya@example.com",
    targetType: "MEMBER",
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4MEMBER3",
    name: "Amit Patel",
    phone: "+91 98765 43212",
    targetType: "MEMBER",
  },
];

const DUMMY_LEADS: TargetUser[] = [
  {
    userId: "01HZXK7G2MJQK3RTWVB4LEAD001",
    name: "Sunita Reddy",
    phone: "+91 98765 43220",
    email: "sunita@example.com",
    targetType: "LEAD",
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4LEAD002",
    name: "Vikram Singh",
    phone: "+91 98765 43221",
    targetType: "LEAD",
  },
];

export interface TaskStep2Props {
  initialSelection?: TargetUser[];
  onNext: (selectedTargets: TargetUser[]) => void;
  onPrevious: () => void;
}

export const TaskStep2: Component<TaskStep2Props> = (props) => {
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(
    new Set((props.initialSelection ?? []).map((t) => t.userId))
  );
  const [activeTab, setActiveTab] = createSignal<"MEMBER" | "LEAD">("MEMBER");

  // Available users based on active tab
  const availableUsers = createMemo(() => {
    return activeTab() === "MEMBER" ? DUMMY_MEMBERS : DUMMY_LEADS;
  });

  // All users (members + leads)
  const allUsers = createMemo(() => [...DUMMY_MEMBERS, ...DUMMY_LEADS]);

  // Selected user objects
  const selectedTargets = createMemo(() => {
    const ids = selectedIds();
    return allUsers().filter((u) => ids.has(u.userId));
  });

  // Are all visible users selected?
  const allSelected = createMemo(() => {
    const visible = availableUsers();
    return visible.length > 0 && visible.every((u) => selectedIds().has(u.userId));
  });

  // Toggle all visible users
  const toggleAll = () => {
    const visible = availableUsers();
    const newSet = new Set(selectedIds());

    if (allSelected()) {
      // Deselect all visible
      visible.forEach((u) => newSet.delete(u.userId));
    } else {
      // Select all visible
      visible.forEach((u) => newSet.add(u.userId));
    }

    setSelectedIds(newSet);
  };

  // Toggle single user
  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedIds());
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedIds(newSet);
  };

  const handleNext = () => {
    if (selectedTargets().length === 0) {
      alert("Please select at least one target user");
      return;
    }
    props.onNext(selectedTargets());
  };

  return (
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Target Users</CardTitle>
          <p class="text-sm text-gray-600 mt-2">
            Choose members or leads who will be contacted for this task
          </p>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Selection Summary */}
          <Show when={selectedTargets().length > 0}>
            <div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span class="text-sm font-medium text-blue-900">
                {selectedTargets().length} user{selectedTargets().length !== 1 ? "s" : ""} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear All
              </Button>
            </div>
          </Show>

          {/* Tab Navigation */}
          <div class="flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("MEMBER")}
              class={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab() === "MEMBER"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Members ({DUMMY_MEMBERS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LEAD")}
              class={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab() === "LEAD"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Leads ({DUMMY_LEADS.length})
            </button>
          </div>

          {/* User Table */}
          <div class="border border-gray-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12">
                    <input
                      type="checkbox"
                      checked={allSelected()}
                      onChange={toggleAll}
                      class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Show
                  when={availableUsers().length > 0}
                  fallback={
                    <TableRow>
                      <TableCell colspan={5} class="text-center text-gray-500 py-8">
                        No users available
                      </TableCell>
                    </TableRow>
                  }
                >
                  <For each={availableUsers()}>
                    {(user) => {
                      const isSelected = () => selectedIds().has(user.userId);
                      return (
                        <TableRow
                          class="cursor-pointer"
                          classList={{ "bg-blue-50": isSelected() }}
                          onClick={() => toggleUser(user.userId)}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected()}
                              onChange={() => toggleUser(user.userId)}
                              onClick={(e) => e.stopPropagation()}
                              class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div class="font-medium text-gray-900">{user.name}</div>
                          </TableCell>
                          <TableCell>
                            <div class="text-sm text-gray-600 space-y-1">
                              {user.email && <div>{user.email}</div>}
                              {user.phone && <div>{user.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.targetType}</Badge>
                          </TableCell>
                          <TableCell>
                            {isSelected() ? (
                              <Badge variant="default">Selected</Badge>
                            ) : (
                              <span class="text-sm text-gray-500">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  </For>
                </Show>
              </TableBody>
            </Table>
          </div>

          <p class="text-xs text-gray-500">
            Note: This is dummy data. Backend integration will load real members/leads from the database.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div class="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={props.onPrevious}>
          Previous
        </Button>
        <Button variant="default" onClick={handleNext}>
          Next: Assign Volunteers
        </Button>
      </div>
    </div>
  );
};
