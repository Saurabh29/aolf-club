/**
 * User Table Component
 * 
 * Table-based user list with multi-select capabilities.
 * Replaces card-based user list.
 * 
 * Features:
 * - Row selection with checkboxes
 * - Select all header checkbox
 * - Bulk actions when rows are selected
 * - Extensible action handlers
 */

import { For, Show, createSignal, createMemo, type Component } from "solid-js";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import type { User } from "~/lib/schemas/db";

export interface UserTableProps {
  users: User[];
  onSelectionChange?: (selectedUserIds: string[]) => void;
  bulkActions?: Array<{
    label: string;
    icon?: any;
    variant?: "default" | "outline" | "secondary" | "destructive";
    onClick: (selectedUsers: User[]) => void;
  }>;
  onAssignToGroup?: (selectedUsers: User[], groupType: "ADMIN" | "TEACHER" | "VOLUNTEER") => void;
}

export const UserTable: Component<UserTableProps> = (props) => {
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

  // Computed: Are all users selected?
  const allSelected = createMemo(() => {
    return props.users.length > 0 && selectedIds().size === props.users.length;
  });

  // (someSelected was unused and removed)

  // Computed: Get selected user objects
  const selectedUsers = createMemo(() => {
    const ids = selectedIds();
    return props.users.filter((u) => ids.has(u.userId));
  });

  // Toggle all rows
  const toggleAll = () => {
    if (allSelected()) {
      setSelectedIds(new Set<string>());
      props.onSelectionChange?.([]);
    } else {
      const allIds = new Set(props.users.map((u) => u.userId));
      setSelectedIds(allIds);
      props.onSelectionChange?.(Array.from(allIds));
    }
  };

  // Toggle single row
  const toggleRow = (userId: string) => {
    const newSet = new Set(selectedIds());
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedIds(newSet);
    props.onSelectionChange?.(Array.from(newSet));
  };

  // Format date
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div class="space-y-4">
      {/* Bulk Actions Toolbar */}
      <Show when={selectedIds().size > 0}>
        <div class="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span class="text-sm font-medium text-blue-900">
            {selectedIds().size} user{selectedIds().size !== 1 ? "s" : ""} selected
          </span>
          <div class="flex gap-2 ml-auto">
            <Show when={props.onAssignToGroup}>
              <DropdownMenu>
                <DropdownMenuTrigger as={Button<"button">} variant="default" size="sm">
                  Assign to Group
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => props.onAssignToGroup?.(selectedUsers(), "ADMIN")}>
                    Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => props.onAssignToGroup?.(selectedUsers(), "TEACHER")}>
                    Teacher
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => props.onAssignToGroup?.(selectedUsers(), "VOLUNTEER")}>
                    Volunteer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Show>
            <For each={props.bulkActions}>
              {(action) => (
                <Button
                  variant={action.variant ?? "default"}
                  size="sm"
                  onClick={() => action.onClick(selectedUsers())}
                >
                  {action.icon}
                  {action.label}
                </Button>
              )}
            </For>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set<string>());
                props.onSelectionChange?.([]);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Show>

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
              <TableHead>Role</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Show
              when={props.users.length > 0}
              fallback={
                <TableRow>
                  <TableCell colspan={6} class="text-center text-gray-500 py-8">
                    No users found
                  </TableCell>
                </TableRow>
              }
            >
              <For each={props.users}>
                {(user) => (
                  <TableRow
                    class="cursor-pointer"
                    classList={{ "bg-blue-50": selectedIds().has(user.userId) }}
                    onClick={() => toggleRow(user.userId)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds().has(user.userId)}
                        onChange={() => toggleRow(user.userId)}
                        onClick={(e) => e.stopPropagation()}
                        class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell>
                      <div class="font-medium text-gray-900">{user.displayName}</div>
                    </TableCell>
                    <TableCell>
                      <div class="text-sm text-gray-600 space-y-1">
                        {user.email && <div>{user.email}</div>}
                        {user.phone && <div>{user.phone}</div>}
                        {!user.email && !user.phone && <span class="text-gray-400">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div class="flex flex-wrap gap-1">
                        <Show when={user.isAdmin}>
                          <Badge variant="default">ADMIN</Badge>
                        </Show>
                        <Badge variant="outline">{user.userType}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span class="text-sm text-gray-600">
                        {user.locationId?.slice(-8) ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span class="text-sm text-gray-600">{formatDate(user.createdAt)}</span>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </Show>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
