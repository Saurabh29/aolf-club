import { Component, For, Show } from "solid-js";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { LocationListItem } from "~/lib/schemas/ui/location.schema";

/**
 * LocationsTable Component
 * 
 * Displays locations in a table format using solid-ui Table components.
 * Shows: locationCode, name, formattedAddress, lat, lng, status, createdAt
 * 
 * Light-mode only styling.
 */

export interface LocationsTableProps {
  locations: LocationListItem[];
  isLoading?: boolean;
}

export const LocationsTable: Component<LocationsTableProps> = (props) => {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCoordinate = (value: number) => {
    return value.toFixed(4);
  };

  return (
    <div class="rounded-md border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]">Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead class="hidden md:table-cell">Address</TableHead>
            <TableHead class="hidden lg:table-cell w-[100px]">Lat</TableHead>
            <TableHead class="hidden lg:table-cell w-[100px]">Lng</TableHead>
            <TableHead class="w-[80px]">Status</TableHead>
            <TableHead class="hidden sm:table-cell w-[120px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Loading state */}
          <Show when={props.isLoading}>
            <TableRow>
              <TableCell colSpan={7} class="h-24 text-center">
                <div class="flex items-center justify-center">
                  <div class="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  <span class="ml-2 text-gray-500">Loading locations...</span>
                </div>
              </TableCell>
            </TableRow>
          </Show>

          {/* Empty state */}
          <Show when={!props.isLoading && props.locations.length === 0}>
            <TableRow>
              <TableCell colSpan={7} class="h-24 text-center">
                <p class="text-gray-500">No locations found.</p>
                <p class="text-sm text-gray-400 mt-1">
                  Click "Add Location" to create your first location.
                </p>
              </TableCell>
            </TableRow>
          </Show>

          {/* Data rows */}
          <Show when={!props.isLoading && props.locations.length > 0}>
            <For each={props.locations}>
              {(location) => (
                <TableRow>
                  <TableCell class="font-mono font-medium">
                    {location.locationCode}
                  </TableCell>
                  <TableCell class="font-medium">{location.name}</TableCell>
                  <TableCell class="hidden md:table-cell text-gray-600 max-w-[300px] truncate">
                    {location.formattedAddress}
                  </TableCell>
                  <TableCell class="hidden lg:table-cell font-mono text-xs">
                    {formatCoordinate(location.lat)}
                  </TableCell>
                  <TableCell class="hidden lg:table-cell font-mono text-xs">
                    {formatCoordinate(location.lng)}
                  </TableCell>
                  <TableCell>
                    <span
                      class={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                        location.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {location.status}
                    </span>
                  </TableCell>
                  <TableCell class="hidden sm:table-cell text-gray-600 text-sm">
                    {formatDate(location.createdAt)}
                  </TableCell>
                </TableRow>
              )}
            </For>
          </Show>
        </TableBody>
      </Table>
    </div>
  );
};
