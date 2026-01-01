/**
 * User Management Page
 * 
 * Displays basic user list using GenericCardList.
 * No permissions logic - simple user display only.
 */

import { Show } from "solid-js";
import { GenericCardList } from "~/components/GenericCardList";
import { Badge } from "~/components/ui/badge";
import type { UserListViewModel } from "~/lib/schemas/ui";

// Dummy user data
const DUMMY_USERS: (UserListViewModel & { id: string })[] = [
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQA1",
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA1",
    displayName: "Rajesh Kumar",
    userType: "MEMBER",
    isAdmin: false,
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQA2",
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA2",
    displayName: "Priya Sharma",
    userType: "LEAD",
    isAdmin: true,
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQA3",
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA3",
    displayName: "Amit Patel",
    userType: "MEMBER",
    isAdmin: false,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQA4",
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA4",
    displayName: "Sunita Reddy",
    userType: "MEMBER",
    isAdmin: false,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQA5",
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA5",
    displayName: "Vikram Singh",
    userType: "MEMBER",
    isAdmin: false,
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQA6",
    userId: "01HZXK7G2MJQK3RTWVB4XNPQA6",
    displayName: "Kavita Desai",
    userType: "LEAD",
    isAdmin: true,
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function UserManagement() {

  // Format date for display
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
      <div class="container mx-auto p-4 md:p-6 max-w-7xl">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
          <p class="text-gray-600 mt-2">Manage volunteers and administrators</p>
        </div>
        
        <GenericCardList
          items={DUMMY_USERS}
          title={(user) => user.displayName}
          description={(user) => `User ID: ${user.userId.slice(-8)}`}
          renderContent={(user) => (
            <div class="space-y-3">
              {/* User role badges */}
              <div class="flex flex-wrap gap-2">
                <Badge variant={user.isAdmin ? "default" : "secondary"}>
                  {user.isAdmin ? "ADMIN" : "VOLUNTEER"}
                </Badge>
                <Badge variant="outline">
                  {user.userType.toUpperCase()}
                </Badge>
              </div>

              {/* User details */}
              <div class="text-sm text-gray-600 space-y-1">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Joined: {formatDate(user.createdAt)}</span>
                </div>
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Last active: {formatDate(user.updatedAt)}</span>
                </div>
              </div>
            </div>
          )}
          actions={[
            {
              label: "View Profile",
              variant: "outline",
              onClick: (user) => alert(`Viewing profile for: ${user.displayName}`),
              icon: (
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
            },
            {
              label: "Send Message",
              variant: "secondary",
              onClick: (user) => alert(`Sending message to: ${user.displayName}`),
              icon: (
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
            },
          ]}
          grid={{ md: 2, lg: 3 }}
          emptyMessage="No users found"
        />
      </div>
  );
}
