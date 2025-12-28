/**
 * User Management Page
 * 
 * Table-based user list with multi-select and bulk actions.
 * Integrated with real DynamoDB data (no dummy data).
 */

import { Show, createSignal, createResource } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { UserTable } from "~/components/UserTable";
import { Button } from "~/components/ui/button";
import { AddUserDialog } from "~/components/AddUserDialog";
import { ImportUsersDialog } from "~/components/ImportUsersDialog";
import { getUsersForActiveLocation, type UserWithGroup } from "~/server/actions/users";

export default function UserManagement() {
  const navigate = useNavigate();
  
  // Dialog state
  const [showAddUser, setShowAddUser] = createSignal(false);
  const [showImportUsers, setShowImportUsers] = createSignal(false);

  // Fetch users for active location (no dummy data)
  const [usersResource, { refetch }] = createResource(async () => {
    const result = await getUsersForActiveLocation();
    if (!result.success) {
      console.error("Failed to load users:", result.error);
      return [];
    }
    return result.data;
  });

  const handleBulkAssignToGroup = (users: UserWithGroup[]) => {
    alert(
      `Assign ${users.length} user(s) to group:\n` +
        users.map((u) => `- ${u.displayName}`).join("\n") +
        "\n\nBackend integration pending."
    );
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    console.log("Selected user IDs:", selectedIds);
  };

  return (
    <div class="container mx-auto p-4 md:p-6 max-w-7xl">
      <AddUserDialog
        open={showAddUser()}
        onOpenChange={setShowAddUser}
        onUserCreated={() => refetch()}
      />
      
      <ImportUsersDialog
        open={showImportUsers()}
        onOpenChange={setShowImportUsers}
        onUsersImported={() => refetch()}
      />
      
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
          <p class="text-gray-600 mt-2">
            Manage volunteers, teachers, members, and administrators
          </p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportUsers(true)}>
            Import Users
          </Button>
          <Button variant="default" onClick={() => setShowAddUser(true)}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </Button>
        </div>
      </div>

      <Show when={usersResource.loading}>
        <div class="text-center py-8 text-gray-500">Loading users...</div>
      </Show>

      <Show when={usersResource.error}>
        <div class="text-center py-8 text-red-600">
          Error loading users: {String(usersResource.error)}
        </div>
      </Show>

      <Show when={!usersResource.loading && usersResource()}>
        <UserTable
          users={usersResource() || []}
          onSelectionChange={handleSelectionChange}
          bulkActions={[
            {
              label: "Assign to Group",
              variant: "default",
              onClick: handleBulkAssignToGroup,
              icon: (
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              ),
            },
          ]}
        />
      </Show>
    </div>
  );
}
