/**
 * Locations Table Component
 * 
 * Displays a table of locations using solid-ui Table components.
 * Wrapped in the reusable Card wrapper for consistent layout.
 * 
 * Columns:
 * - Location Code
 * - Name
 * - Address
 * - Coordinates (lat, lng)
 * - Status
 * - Created At
 */

import { For, Show, type Component } from "solid-js";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";

export interface LocationsTableProps {
  /** Array of locations to display */
  locations: LocationUi[];
  /** Optional callback when a location row is clicked */
  onRowClick?: (location: LocationUi) => void;
}

/**
 * Formats an ISO datetime string to a human-readable format.
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Truncates a string to a maximum length.
 */
function truncate(str: string | undefined, maxLength: number): string {
  if (!str) return "—";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export const LocationsTable: Component<LocationsTableProps> = (props) => {
  return (
    <Show
      when={props.locations.length > 0}
      fallback={
        <div class="py-8 text-center text-gray-500">
          <p>No locations found.</p>
          <p class="text-sm mt-1">Add your first location to get started.</p>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Coordinates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={props.locations}>
            {(location) => (
              <TableRow
                class={props.onRowClick ? "cursor-pointer" : undefined}
                onClick={() => props.onRowClick?.(location)}
              >
                <TableCell class="font-mono text-sm">
                  {location.locationCode}
                </TableCell>
                <TableCell class="font-medium">
                  {location.name}
                </TableCell>
                <TableCell class="max-w-xs">
                  <span title={location.formattedAddress}>
                    {truncate(location.formattedAddress, 40)}
                  </span>
                </TableCell>
                <TableCell class="font-mono text-xs text-gray-600">
                  <Show
                    when={location.lat !== undefined && location.lng !== undefined}
                    fallback="—"
                  >
                    {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
                  </Show>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={location.status === "active" ? "success" : "secondary"}
                  >
                    {location.status}
                  </Badge>
                </TableCell>
                <TableCell class="text-sm text-gray-600">
                  {formatDate(location.createdAt)}
                </TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </Show>
  );
};

export default LocationsTable;
