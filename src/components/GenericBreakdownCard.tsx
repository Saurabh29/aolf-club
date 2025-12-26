/**
 * GenericBreakdownCard Component
 * 
 * Reusable card component for displaying data breakdowns (counts by category).
 * Supports two layouts: list and grid.
 * Used for dashboard metrics like "Tasks by Priority", "Tasks by Category", etc.
 */

import { Component, For } from "solid-js";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Badge } from "~/components/ui/badge";

export interface BreakdownItem {
  id: string;
  label: string;
  count: number;
  badge?: {
    variant?: "default" | "secondary" | "success" | "destructive" | "outline";
    text: string;
  };
  color?: string; // For grid layout background colors
}

export interface GenericBreakdownCardProps {
  title: string;
  items: BreakdownItem[];
  layout?: "list" | "grid"; // list = vertical list with badges, grid = stat boxes
  gridCols?: "2" | "3" | "4"; // For grid layout
}

export const GenericBreakdownCard: Component<GenericBreakdownCardProps> = (props) => {
  const layout = () => props.layout ?? "list";
  const gridCols = () => props.gridCols ?? "4";

  const gridClasses = () => {
    const cols = {
      "2": "grid-cols-2",
      "3": "grid-cols-3",
      "4": "grid-cols-2 md:grid-cols-4",
    };
    return `grid ${cols[gridCols()]} gap-4`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* List Layout - for badges with counts */}
        {layout() === "list" && (
          <div class="space-y-3">
            <For each={props.items}>
              {(item) => (
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    {item.badge ? (
                      <Badge variant={item.badge.variant ?? "secondary"}>
                        {item.badge.text}
                      </Badge>
                    ) : (
                      <span class="text-sm font-medium text-gray-700 capitalize">
                        {item.label}
                      </span>
                    )}
                  </div>
                  <span class="text-lg font-semibold text-gray-900">{item.count}</span>
                </div>
              )}
            </For>
          </div>
        )}

        {/* Grid Layout - for stat boxes */}
        {layout() === "grid" && (
          <div class={gridClasses()}>
            <For each={props.items}>
              {(item) => (
                <div class={`text-center p-4 rounded-lg ${item.color || "bg-gray-50"}`}>
                  <div class={`text-2xl font-bold ${item.color?.includes("bg-gray") ? "text-gray-900" : item.color?.includes("bg-blue") ? "text-blue-700" : item.color?.includes("bg-green") ? "text-green-700" : "text-gray-900"}`}>
                    {item.count}
                  </div>
                  <div class="text-sm text-gray-600 mt-1">{item.label}</div>
                </div>
              )}
            </For>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
