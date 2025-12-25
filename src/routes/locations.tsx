/**
 * Locations Page
 * 
 * Lists all locations with ability to add new ones.
 * Uses the reusable Card wrapper for consistent layout.
 * 
 * TODO: Add auth check here when authentication is implemented
 */

import { createSignal, createResource, Show, onMount } from "solid-js";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/button";
import { LocationsTable } from "~/components/LocationsTable";
import { AddLocationDialog } from "~/components/AddLocationDialog";
import { getLocations } from "~/server/actions/locations";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";

export default function LocationsPage() {
  // Track if we're on client side
  const [isClient, setIsClient] = createSignal(false);
  onMount(() => setIsClient(true));

  // Fetch locations using SolidJS createResource
  const [locations, { refetch }] = createResource(async () => {
    const result = await getLocations();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  });

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);

  /**
   * Handles successful location creation.
   * Refetches the locations list to include the new location.
   */
  const handleLocationCreated = (_location: LocationUi) => {
    // Refetch locations to include the new one
    refetch();
  };

  return (
    <main class="container mx-auto py-8 px-4">
      <Card
        title="Locations"
        description="Manage your organization's locations."
      >
        {/* Action Button - rendered only on client to avoid hydration mismatch */}
        <Show when={isClient()}>
          <div class="flex justify-end mb-4">
            <Button onClick={() => setIsDialogOpen(true)}>
              Add Location
            </Button>
          </div>
        </Show>

        {/* Loading State */}
        <Show when={locations.loading}>
          <div class="py-8 text-center text-gray-500">
            <p>Loading locations...</p>
          </div>
        </Show>

        {/* Error State */}
        <Show when={locations.error}>
          <div class="rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-700">
              Failed to load locations: {locations.error?.message}
            </p>
            <Button
              variant="outline"
              size="sm"
              class="mt-2"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        </Show>

        {/* Data State */}
        <Show when={!locations.loading && !locations.error && locations()}>
          <LocationsTable locations={locations()!} />
        </Show>
      </Card>

      {/* Add Location Dialog - client only */}
      <Show when={isClient()}>
        <AddLocationDialog
          open={isDialogOpen()}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleLocationCreated}
        />
      </Show>
    </main>
  );
}
