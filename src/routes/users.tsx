/**
 * User Management Page
 * 
 * Table-based user list with multi-select and bulk actions.
 * Integrated with real DynamoDB data (no dummy data).
 */

import { Show, createSignal, createMemo, Suspense, ErrorBoundary } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { UserTable } from "~/components/UserTable";
import { Button } from "~/components/ui/button";
import { AddUserDialog } from "~/components/AddUserDialog";
import { ImportUsersDialog } from "~/components/ImportUsersDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { query, createAsync, type RouteDefinition } from "@solidjs/router";
import { getUsersForActiveLocation, assignUsersToGroup, type UserWithGroup } from "~/server/actions/users";
import type { GroupType } from "~/lib/schemas/db/types";

const getUsersForActiveLocationQuery = query(async () => {
  "use server";
  const result = await getUsersForActiveLocation();
  if (!result.success) throw new Error(result.error ?? "Failed to fetch users");
  return result.data;
}, "users-for-active-location");

export const route = {
  preload: () => getUsersForActiveLocationQuery(),
} satisfies RouteDefinition;

export default function UserManagement() {
  const navigate = useNavigate();
  
  // Dialog state
  const [showAddUser, setShowAddUser] = createSignal(false);
  const [showImportUsers, setShowImportUsers] = createSignal(false);

  // Fetch users using SolidStart query + createAsync
  const usersResource = createAsync(() => getUsersForActiveLocationQuery(), { deferStream: true });

  const refetch = async () => {
    try {
      await getUsersForActiveLocationQuery();
    } catch (e) {
      // ignore, ErrorBoundary will surface
    }
  };

  const handleAssignToGroup = async (users: UserWithGroup[], groupType: GroupType) => {
    const userIds = users.map((u) => u.userId);
    const result = await assignUsersToGroup(userIds, groupType);
    
    if (result.success) {
      const { assigned, failed, errors } = result.data;
      if (failed === 0) {
        alert(`Successfully assigned ${assigned} user(s) to ${groupType} group.`);
      } else {
        alert(
          `Assigned ${assigned} user(s) to ${groupType} group.\n` +
          `Failed: ${failed}\n\n` +
          errors.slice(0, 5).join("\n") +
          (errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : "")
        );
      }
      await refetch();
    } else {
      alert(`Failed to assign users: ${result.error}`);
    }
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

      <ErrorBoundary fallback={<div class="text-center py-8 text-red-600">Error loading users. <Button onClick={() => void refetch()}>Retry</Button></div>}>
        <Suspense fallback={<div class="text-center py-8 text-gray-500">Loading users...</div>}>
          <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <UserTable users={members()} onSelectionChange={handleSelectionChange} onAssignToGroup={handleAssignToGroup} />
          </TabsContent>

          <TabsContent value="leads">
            <UserTable users={leads()} onSelectionChange={handleSelectionChange} onAssignToGroup={handleAssignToGroup} />
          </TabsContent>
          </Tabs>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
