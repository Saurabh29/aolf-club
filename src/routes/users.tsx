/**
 * User Management Page
 * 
 * Table-based user list with multi-select and bulk actions.
 * Replaces card-based list.
 */

import { Show, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { UserTable } from "~/components/UserTable";
import { Button } from "~/components/ui/button";
import type { UserListViewModel } from "~/lib/schemas/ui";

// Dummy user data
const DUMMY_USERS: UserListViewModel[] = [
  {
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA1",
    displayName: "Rajesh Kumar",
    userType: "MEMBER",
    isAdmin: false,
    email: "rajesh@example.com",
    phone: "+91 98765 43210",
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA2",
    displayName: "Priya Sharma",
    userType: "LEAD",
    isAdmin: true,
    email: "priya@example.com",
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA3",
    displayName: "Amit Patel",
    userType: "MEMBER",
    isAdmin: false,
    phone: "+91 98765 43212",
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA4",
    displayName: "Sunita Reddy",
    userType: "MEMBER",
    isAdmin: false,
    email: "sunita@example.com",
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA5",
    displayName: "Vikram Singh",
    userType: "MEMBER",
    isAdmin: false,
    email: "vikram@example.com",
    phone: "+91 98765 43214",
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA6",
    displayName: "Kavita Desai",
    userType: "LEAD",
    isAdmin: true,
    email: "kavita@example.com",
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function UserManagement() {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  // Session check disabled for preview
  onMount(() => {
    setIsAuthenticated(false);
    setLoading(false);
  });

  const handleBulkAssignToGroup = (users: UserListViewModel[]) => {
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
    <Show when={!loading()}>
      <div class="container mx-auto p-4 md:p-6 max-w-7xl">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
            <p class="text-gray-600 mt-2">
              Manage volunteers, teachers, members, and administrators
            </p>
          </div>
          <Button variant="default" onClick={() => alert("Add new user - Backend pending")}>
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </Button>
        </div>

        <UserTable
          users={DUMMY_USERS}
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

        <div class="mt-4 text-sm text-gray-500">
          Note: This is dummy data. Backend integration will load real users from DynamoDB.
        </div>
      </div>
    </Show>
  );
}
