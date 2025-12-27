/**
 * Demo: Self-Assignment Flow
 * 
 * Simulates the volunteer self-assignment experience without backend.
 * Navigate to: /tasks/demo-self-assign
 * 
 * Features Demonstrated:
 * - Unassigned target count
 * - Self-assign N users button
 * - Atomic assignment simulation
 * - Transition to "My Assigned Users" section
 */

import { Show, createSignal, For } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type DemoUser = {
  id: string;
  name: string;
  phone: string;
  targetType: "MEMBER" | "LEAD";
};

// Simulated pool of unassigned users
const MOCK_UNASSIGNED_POOL: DemoUser[] = [
  { id: "01JHHX001", name: "Amit Kumar", phone: "555-0101", targetType: "MEMBER" },
  { id: "01JHHX002", name: "Priya Sharma", phone: "555-0102", targetType: "MEMBER" },
  { id: "01JHHX003", name: "Raj Patel", phone: "555-0103", targetType: "LEAD" },
  { id: "01JHHX004", name: "Neha Singh", phone: "555-0104", targetType: "MEMBER" },
  { id: "01JHHX005", name: "Vikram Reddy", phone: "555-0105", targetType: "MEMBER" },
  { id: "01JHHX006", name: "Anjali Iyer", phone: "555-0106", targetType: "LEAD" },
  { id: "01JHHX007", name: "Karthik Menon", phone: "555-0107", targetType: "MEMBER" },
  { id: "01JHHX008", name: "Divya Nair", phone: "555-0108", targetType: "MEMBER" },
  { id: "01JHHX009", name: "Arjun Das", phone: "555-0109", targetType: "LEAD" },
  { id: "01JHHX010", name: "Meera Joshi", phone: "555-0110", targetType: "MEMBER" },
  { id: "01JHHX011", name: "Rohan Gupta", phone: "555-0111", targetType: "MEMBER" },
  { id: "01JHHX012", name: "Sneha Desai", phone: "555-0112", targetType: "LEAD" },
  { id: "01JHHX013", name: "Aditya Kapoor", phone: "555-0113", targetType: "MEMBER" },
  { id: "01JHHX014", name: "Pooja Bhat", phone: "555-0114", targetType: "MEMBER" },
  { id: "01JHHX015", name: "Sanjay Varma", phone: "555-0115", targetType: "MEMBER" },
];

export default function DemoSelfAssign() {
  const [unassignedUsers, setUnassignedUsers] = createSignal<DemoUser[]>([...MOCK_UNASSIGNED_POOL]);
  const [myAssignedUsers, setMyAssignedUsers] = createSignal<DemoUser[]>([]);
  const [assignCount, setAssignCount] = createSignal(5);
  const [isAssigning, setIsAssigning] = createSignal(false);
  const [message, setMessage] = createSignal<{ type: "success" | "info" | "error"; text: string } | null>(null);

  const handleSelfAssign = async () => {
    setIsAssigning(true);
    setMessage(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const available = unassignedUsers();
    const requestedCount = assignCount();
    const actualCount = Math.min(requestedCount, available.length);

    if (actualCount === 0) {
      setMessage({ type: "error", text: "No unassigned users available" });
      setIsAssigning(false);
      return;
    }

    // Simulate atomic assignment: take first N users from pool
    const assigned = available.slice(0, actualCount);
    const remaining = available.slice(actualCount);

    setMyAssignedUsers([...myAssignedUsers(), ...assigned]);
    setUnassignedUsers(remaining);

    if (actualCount < requestedCount) {
      setMessage({
        type: "info",
        text: `Assigned ${actualCount} users (${requestedCount - actualCount} were already claimed by others)`
      });
    } else {
      setMessage({
        type: "success",
        text: `Successfully assigned ${actualCount} users to you!`
      });
    }

    setIsAssigning(false);

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const simulateConcurrentClaim = () => {
    // Simulate another volunteer claiming users
    const available = unassignedUsers();
    const claimCount = Math.min(3, available.length);
    const remaining = available.slice(claimCount);
    setUnassignedUsers(remaining);
    
    setMessage({
      type: "info",
      text: `⚡ Another volunteer just claimed ${claimCount} users (simulated concurrent assignment)`
    });

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div class="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Demo: Self-Assignment Flow</h1>
          <p class="text-gray-600 mt-1">
            Volunteer view — claim unassigned users and start outreach
          </p>
        </div>
        <A href="/tasks" class="text-blue-600 hover:underline">← Back to Tasks</A>
      </div>

      {/* Info Banner */}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex gap-3">
          <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          <div>
            <h3 class="font-semibold text-yellow-900">Testing Without Backend</h3>
            <p class="text-sm text-yellow-800 mt-1">
              This demo simulates the self-assignment flow using mock data. In production, this would:
            </p>
            <ul class="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
              <li>Fetch real task data from DynamoDB</li>
              <li>Use atomic conditional writes to prevent double-assignment</li>
              <li>Create TaskAssignment and User Index items</li>
              <li>Handle race conditions with proper error messages</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Task Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Task: December Outreach Campaign (Demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex gap-6">
            <div>
              <div class="text-sm text-gray-600">Location</div>
              <div class="font-medium">Chennai Center</div>
            </div>
            <div>
              <div class="text-sm text-gray-600">Allowed Actions</div>
              <div class="flex gap-2">
                <Badge>Call</Badge>
                <Badge>Message</Badge>
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-600">Status</div>
              <Badge variant="outline">IN_PROGRESS</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Toast */}
      <Show when={message()}>
        <div 
          class="p-4 rounded-lg border"
          classList={{
            "bg-green-50 border-green-200 text-green-800": message()?.type === "success",
            "bg-blue-50 border-blue-200 text-blue-800": message()?.type === "info",
            "bg-red-50 border-red-200 text-red-800": message()?.type === "error"
          }}
        >
          {message()?.text}
        </div>
      </Show>

      {/* Self-Assignment Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Self-Assign Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span class="font-semibold text-blue-900">
                    {unassignedUsers().length} unassigned users available
                  </span>
                </div>
                <p class="text-sm text-blue-700 mt-1">
                  Click below to claim users and start outreach
                </p>
              </div>
            </div>

            <div class="flex items-center gap-4 flex-wrap">
              <div class="flex items-center gap-2">
                <Label>Assign</Label>
                <Input
                  type="number"
                  value={assignCount()}
                  onInput={(e) => setAssignCount(Math.max(1, parseInt(e.currentTarget.value) || 1))}
                  class="w-20"
                  min="1"
                  max={unassignedUsers().length}
                />
                <span class="text-sm text-gray-600">users to me</span>
              </div>
              
              <Button 
                variant="default" 
                onClick={handleSelfAssign} 
                disabled={isAssigning() || unassignedUsers().length === 0}
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                {isAssigning() ? "Assigning..." : "Assign Me"}
              </Button>

              <Button 
                variant="outline" 
                onClick={simulateConcurrentClaim}
                disabled={unassignedUsers().length === 0}
              >
                ⚡ Simulate Concurrent Claim
              </Button>
            </div>

            <div class="text-xs text-gray-500">
              <strong>Tip:</strong> Users are assigned atomically. If another volunteer claims the same users simultaneously,
              you'll be assigned from the remaining pool. Click "Simulate Concurrent Claim" to see this behavior.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Assigned Users Section */}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">
            My Assigned Users ({myAssignedUsers().length})
          </h2>
        </div>

        <Show 
          when={myAssignedUsers().length > 0}
          fallback={
            <Card>
              <CardContent class="text-center py-12 text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p class="font-medium">No users assigned yet</p>
                <p class="text-sm mt-1">Click "Assign Me" above to claim users and start outreach</p>
              </CardContent>
            </Card>
          }
        >
          <div class="grid gap-4">
            <For each={myAssignedUsers()}>
              {(user) => (
                <Card>
                  <CardHeader>
                    <div class="flex items-start justify-between">
                      <div>
                        <CardTitle class="text-lg">
                          {user.name}
                          <Badge variant="outline" class="ml-2">
                            {user.targetType}
                          </Badge>
                        </CardTitle>
                        <div class="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {user.phone}
                        </div>
                      </div>
                      <Badge>Just Assigned</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div class="text-sm text-gray-600">
                      <p>📞 Ready for outreach</p>
                      <p class="mt-1">
                        In production, you would see call/message buttons, notes field, rating, and follow-up scheduling here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Implementation Notes */}
      <Card class="bg-gray-50">
        <CardHeader>
          <CardTitle>Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <div>
            <strong class="text-gray-900">Schema Changes for Self-Assignment:</strong>
            <ul class="list-disc list-inside mt-1 text-gray-700 space-y-1">
              <li>Targets can be created with <code class="bg-gray-200 px-1 rounded">assigneeUserId: null</code> (unassigned)</li>
              <li>TaskForm Step 3 allows selecting "Unassigned" from the combobox</li>
              <li>Unassigned targets are available in the pool for self-assignment</li>
            </ul>
          </div>
          
          <div>
            <strong class="text-gray-900">Backend Self-Assignment Logic (AP8):</strong>
            <ul class="list-disc list-inside mt-1 text-gray-700 space-y-1">
              <li>Query unassigned targets: <code class="bg-gray-200 px-1 rounded">PK=TASK#taskId, SK begins_with TARGET#</code></li>
              <li>Filter to those without assignments</li>
              <li>Take first N users</li>
              <li>Create TaskAssignment items with conditional writes (prevent duplicates)</li>
              <li>On conflict, retry with remaining users</li>
            </ul>
          </div>

          <div>
            <strong class="text-gray-900">Files to Review:</strong>
            <ul class="list-disc list-inside mt-1 text-gray-700 space-y-1">
              <li><code class="bg-gray-200 px-1 rounded">src/routes/tasks/[taskId].tsx</code> — Production self-assignment UI</li>
              <li><code class="bg-gray-200 px-1 rounded">src/components/TaskStep3.tsx</code> — Table-based assignment with "Unassigned" option</li>
              <li><code class="bg-gray-200 px-1 rounded">docs/TASK_OUTREACH_DESIGN.md</code> — AP8: Atomic Self-Assignment pattern</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
