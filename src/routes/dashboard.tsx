/**
 * Dashboard Page
 * 
 * Displays task reports and summaries using GenericCardList for consistency.
 * Mobile-first design with responsive grid layout.
 */

import { Show, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { GenericCardList } from "~/components/GenericCardList";
import { GenericBreakdownCard, type BreakdownItem } from "~/components/GenericBreakdownCard";
import type { TaskReportSummary } from "~/lib/schemas/ui";

// Dummy task summary data
const DUMMY_SUMMARY: TaskReportSummary = {
  totalTasks: 47,
  completedTasks: 23,
  pendingTasks: 18,
  overdueTasks: 6,
  tasksByPriority: {
    low: 12,
    medium: 18,
    high: 11,
    urgent: 6,
  },
  tasksByCategory: {
    call: 15,
    follow_up: 10,
    event: 8,
    admin: 7,
    outreach: 5,
    other: 2,
  },
  tasksByStatus: {
    pending: 18,
    in_progress: 6,
    completed: 23,
    cancelled: 0,
  },
};

// Summary stat cards for GenericCardList
interface SummaryStat {
  id: string;
  label: string;
  value: number;
  description: string;
  color: string;
}

const getSummaryStats = (summary: TaskReportSummary): SummaryStat[] => [
  {
    id: "total",
    label: "Total Tasks",
    value: summary.totalTasks,
    description: "All tasks in system",
    color: "text-gray-900",
  },
  {
    id: "completed",
    label: "Completed",
    value: summary.completedTasks,
    description: `${Math.round((summary.completedTasks / summary.totalTasks) * 100)}% completion rate`,
    color: "text-green-600",
  },
  {
    id: "pending",
    label: "Pending",
    value: summary.pendingTasks,
    description: "Awaiting action",
    color: "text-blue-600",
  },
  {
    id: "overdue",
    label: "Overdue",
    value: summary.overdueTasks,
    description: "Need immediate attention",
    color: "text-red-600",
  },
];

export default function Dashboard() {
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

  const summary = () => DUMMY_SUMMARY;
  const summaryStats = () => getSummaryStats(summary());

  // Breakdown data for GenericBreakdownCard
  const priorityBreakdown = (): BreakdownItem[] => [
    {
      id: "urgent",
      label: "Urgent",
      count: summary().tasksByPriority.urgent,
      badge: { variant: "destructive", text: "URGENT" },
    },
    {
      id: "high",
      label: "High",
      count: summary().tasksByPriority.high,
      badge: { variant: "default", text: "HIGH" },
    },
    {
      id: "medium",
      label: "Medium",
      count: summary().tasksByPriority.medium,
      badge: { variant: "secondary", text: "MEDIUM" },
    },
    {
      id: "low",
      label: "Low",
      count: summary().tasksByPriority.low,
      badge: { variant: "outline", text: "LOW" },
    },
  ];

  const categoryBreakdown = (): BreakdownItem[] =>
    Object.entries(summary().tasksByCategory).map(([category, count]) => ({
      id: category,
      label: category.replace("_", " "),
      count,
    }));

  const statusBreakdown = (): BreakdownItem[] => [
    {
      id: "pending",
      label: "Pending",
      count: summary().tasksByStatus.pending,
      color: "bg-gray-50 text-gray-900",
    },
    {
      id: "in_progress",
      label: "In Progress",
      count: summary().tasksByStatus.in_progress,
      color: "bg-blue-50 text-blue-700",
    },
    {
      id: "completed",
      label: "Completed",
      count: summary().tasksByStatus.completed,
      color: "bg-green-50 text-green-700",
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: summary().tasksByStatus.cancelled,
      color: "bg-gray-50 text-gray-900",
    },
  ];

  return (
    <Show when={!loading()}>
      <div class="p-6 space-y-8">
        <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Summary Statistics using GenericCardList */}
        <GenericCardList
          items={summaryStats()}
          title={(item) => item.label}
          renderContent={(item) => (
            <>
              <div class={`text-4xl font-bold ${item.color} mb-2`}>{item.value}</div>
              <p class="text-sm text-gray-600">{item.description}</p>
            </>
          )}
          grid={{ sm: 2, md: 2, lg: 4 }}
          emptyMessage="No stats available"
        />

        {/* Breakdown sections using GenericBreakdownCard */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GenericBreakdownCard
            title="Tasks by Priority"
            items={priorityBreakdown()}
            layout="list"
          />
          
          <GenericBreakdownCard
            title="Tasks by Category"
            items={categoryBreakdown()}
            layout="list"
          />
        </div>

        <GenericBreakdownCard
          title="Tasks by Status"
          items={statusBreakdown()}
          layout="grid"
          gridCols="4"
        />
      </div>
    </Show>
  );
}
