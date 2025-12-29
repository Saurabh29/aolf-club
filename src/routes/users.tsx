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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { createMemo } from "solid-js";
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

  const leads = createMemo(() => (usersResource() || []).filter((u) => u.userType === "LEAD"));
  const members = createMemo(() => (usersResource() || []).filter((u) => u.userType === "MEMBER"));

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
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <UserTable users={members()} onSelectionChange={handleSelectionChange} bulkActions={[{ label: "Assign to Group", variant: "default", onClick: handleBulkAssignToGroup }]} />
          </TabsContent>

          <TabsContent value="leads">
            <UserTable users={leads()} onSelectionChange={handleSelectionChange} bulkActions={[{ label: "Assign to Group", variant: "default", onClick: handleBulkAssignToGroup }]} />
          </TabsContent>
        </Tabs>
      </Show>
    </div>
  );
}
