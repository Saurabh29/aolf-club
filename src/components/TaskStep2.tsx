/**
 * Task Step 2: Select Target Users (Members/Leads)
 * 
 * Table-based selection of users to be added as task targets.
 * Shows selection status and allows multi-select.
 */

import { For, Show, createSignal, createMemo, createResource, type Component } from "solid-js";
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
import { getUsersForActiveLocation, type UserWithGroup } from "~/server/actions/users";
import type { TargetUser } from "~/lib/schemas/ui";

export interface TaskStep2Props {
  initialSelection?: TargetUser[];
  onNext: (selectedTargets: TargetUser[]) => void;
  onPrevious: () => void;
}

export const TaskStep2: Component<TaskStep2Props> = (props) => {
  // Fetch users from DB
  const [usersResource] = createResource(async () => {
    const result = await getUsersForActiveLocation();
    if (!result.success) {
      console.error("Failed to load users:", result.error);
      return [];
    }
    return result.data;
  });

  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(
    new Set((props.initialSelection ?? []).map((t) => t.userId))
  );
  const [activeTab, setActiveTab] = createSignal<"MEMBER" | "LEAD">("MEMBER");

  // Convert UserWithGroup to TargetUser
  const convertToTargetUser = (user: UserWithGroup): TargetUser => ({
    userId: user.userId,
    name: user.displayName,
    phone: user.phone,
    email: user.email,
    targetType: user.userType,
  });

  // Available users based on active tab
  const availableUsers = createMemo(() => {
    const users = usersResource() || [];
    return users
      .filter((u) => u.userType === activeTab())
      .map(convertToTargetUser);
  });

  // All users (members + leads)
  const allUsers = createMemo(() => {
    const users = usersResource() || [];
    return users.map(convertToTargetUser);
  });

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
      {/* Loading State */}
      <Show when={usersResource.loading}>
        <Card>
          <CardContent class="py-12 text-center text-gray-500">
            Loading users...
          </CardContent>
        </Card>
      </Show>

      {/* Error State */}
      <Show when={usersResource.error}>
        <Card class="border-red-200 bg-red-50">
          <CardContent class="pt-6">
            <p class="text-red-800">Failed to load users: {String(usersResource.error)}</p>
          </CardContent>
        </Card>
      </Show>

      {/* Main Content */}
      <Show when={!usersResource.loading && !usersResource.error}>
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
              Members ({(usersResource() || []).filter(u => u.userType === 'MEMBER').length})
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
              Leads ({(usersResource() || []).filter(u => u.userType === 'LEAD').length})
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
        </CardContent>
      </Card>
      </Show>

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
