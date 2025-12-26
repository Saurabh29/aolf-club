/**
 * Serve Hub Page
 * 
 * Displays task cards with call actions.
 * Mobile-first design using GenericCardList and solid-ui components.
 */

import { Show, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { GenericCardList } from "~/components/GenericCardList";
import { Badge } from "~/components/ui/badge";
import type { TaskCardViewModel } from "~/lib/schemas/ui";

// Dummy task data
const DUMMY_TASKS: (TaskCardViewModel & { id: string })[] = [
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQC1",
    taskId: "01HZXK7G2MJQK3RTWVB4XNPQC1",
    title: "Call new leads from volunteer event",
    description: "Follow up with 5 people who expressed interest at Sunday meditation",
    category: "call",
    priority: "high",
    status: "pending",
    assignedTo: "Rajesh Kumar",
    dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isOverdue: false,
    isToday: true,
    relativeTimeText: "Due in 2 hours",
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQC2",
    taskId: "01HZXK7G2MJQK3RTWVB4XNPQC2",
    title: "Schedule yoga class at new center",
    description: "Coordinate with instructor and send invitations to members",
    category: "event",
    priority: "medium",
    status: "in_progress",
    assignedTo: "Priya Sharma",
    dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isOverdue: false,
    isToday: false,
    relativeTimeText: "Due in 3 days",
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQC3",
    taskId: "01HZXK7G2MJQK3RTWVB4XNPQC3",
    title: "Follow up: Weekend retreat registrations",
    description: "Contact interested participants and confirm attendance",
    category: "follow_up",
    priority: "urgent",
    status: "pending",
    assignedTo: "Amit Patel",
    dueAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isOverdue: true,
    isToday: false,
    relativeTimeText: "Overdue by 1 hour",
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQC4",
    taskId: "01HZXK7G2MJQK3RTWVB4XNPQC4",
    title: "Prepare volunteer orientation materials",
    description: "Update presentation and print handouts for new volunteers",
    category: "admin",
    priority: "low",
    status: "pending",
    assignedTo: "Sunita Reddy",
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isOverdue: false,
    isToday: false,
    relativeTimeText: "Due in 1 week",
  },
  {
    id: "01HZXK7G2MJQK3RTWVB4XNPQC5",
    taskId: "01HZXK7G2MJQK3RTWVB4XNPQC5",
    title: "Community outreach: Local schools",
    description: "Present meditation benefits to high school wellness programs",
    category: "outreach",
    priority: "medium",
    status: "pending",
    assignedTo: "Vikram Singh",
    dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isOverdue: false,
    isToday: false,
    relativeTimeText: "Due in 5 days",
  },
];

export default function ServeHub() {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const navigate = useNavigate();

  // Simple auth check - only verify if user is authenticated
  onMount(async () => {
    try {
      const resp = await fetch("/api/auth/session");
      if (!resp.ok) {
        setIsAuthenticated(false);
        navigate("/", { replace: true });
        return;
      }
      const data = await resp.json();
      setIsAuthenticated(!!data);
      if (!data) {
        navigate("/", { replace: true });
      }
    } catch (e) {
      console.error("Auth check failed:", e);
      setIsAuthenticated(false);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  });

  // Priority badge variant mapping
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  // Status badge variant mapping
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in_progress": return "default";
      case "pending": return "secondary";
      case "cancelled": return "outline";
      default: return "secondary";
    }
  };

  return (
    <Show when={!loading() && isAuthenticated()}>
      <div class="container mx-auto p-4 md:p-6 max-w-7xl">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Serve Hub</h1>
          <p class="text-gray-600 mt-2">Manage and track your service tasks</p>
        </div>
        
        <GenericCardList
          items={DUMMY_TASKS}
          title={(task) => task.title}
          description={(task) => task.description}
          renderContent={(task) => (
            <div class="space-y-3">
              {/* Priority and Status badges */}
              <div class="flex flex-wrap gap-2">
                <Badge variant={getPriorityVariant(task.priority)}>
                  {task.priority.toUpperCase()}
                </Badge>
                <Badge variant={getStatusVariant(task.status)}>
                  {task.status.replace("_", " ").toUpperCase()}
                </Badge>
                {task.isOverdue && (
                  <Badge variant="destructive">OVERDUE</Badge>
                )}
                {task.isToday && !task.isOverdue && (
                  <Badge variant="default">DUE TODAY</Badge>
                )}
              </div>

              {/* Task details */}
              <div class="text-sm text-gray-600 space-y-1">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Assigned to: <strong>{task.assignedTo || "Unassigned"}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{task.relativeTimeText}</span>
                </div>
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Category: {task.category.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          )}
          actions={[
            {
              label: "Call",
              variant: "default",
              onClick: (task) => alert(`Starting call for task: ${task.title}`),
              icon: (
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              ),
              hidden: (task) => task.category !== "call" && task.category !== "follow_up",
            },
            {
              label: "View Details",
              variant: "outline",
              onClick: (task) => alert(`Viewing task: ${task.title}`),
            },
            {
              label: "Complete",
              variant: "secondary",
              onClick: (task) => alert(`Marking complete: ${task.title}`),
              disabled: (task) => task.status === "completed",
            },
          ]}
          grid={{ md: 2, lg: 2 }}
          emptyMessage="No tasks available"
        />
      </div>
    </Show>
  );
}
