import { createSignal, createResource, Suspense, Show } from "solid-js";
import { getLocations } from "~/server/actions/locations";
import { LocationsTable } from "~/components/LocationsTable";
import { AddLocationDialog } from "~/components/AddLocationDialog";
import { Button } from "~/components/ui/button";
import { Toaster } from "~/components/ui/toast";
import type { LocationListItem } from "~/lib/schemas/ui/location.schema";

/**
 * Locations Page
 * 
 * Lists all locations with ability to add new ones.
 * Uses SolidStart createResource for data fetching.
 * 
 * Route: /(protected)/locations
 * 
 * TODO: Add authentication check when auth is implemented
 * TODO: Add role-based access control for admin features
 */

async function fetchLocations(): Promise<LocationListItem[]> {
  const result = await getLocations();
  if (result.success && result.data) {
    return result.data;
  }
  throw new Error(result.error || "Failed to fetch locations");
}

export default function LocationsPage() {
  const [locations, { refetch }] = createResource(fetchLocations);
  const [isAddDialogOpen, setIsAddDialogOpen] = createSignal(false);

  const handleLocationCreated = () => {
    // Refetch the locations list after a new location is created
    refetch();
  };

  return (
    <main class="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <Toaster />

      <div class="container mx-auto px-4 py-8">
        {/* Page header */}
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Locations</h1>
            <p class="text-gray-600 mt-1">
              Manage your organization's locations
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4 mr-2"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add Location
          </Button>
        </div>

        {/* Error state */}
        <Show when={locations.error}>
          <div class="rounded-md bg-red-50 border border-red-200 p-4 mb-6">
            <div class="flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5 text-red-400"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  Error loading locations
                </h3>
                <p class="text-sm text-red-700 mt-1">
                  {locations.error instanceof Error
                    ? locations.error.message
                    : "An unexpected error occurred"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  class="mt-3"
                  onClick={() => refetch()}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </Show>

        {/* Locations table */}
        <Suspense
          fallback={
            <LocationsTable locations={[]} isLoading={true} />
          }
        >
          <Show when={!locations.error}>
            <LocationsTable
              locations={locations() || []}
              isLoading={locations.loading}
            />
          </Show>
        </Suspense>

        {/* Summary */}
        <Show when={locations() && locations()!.length > 0}>
          <div class="mt-4 text-sm text-gray-500">
            Showing {locations()!.length} location
            {locations()!.length !== 1 ? "s" : ""}
          </div>
        </Show>
      </div>

      {/* Add Location Dialog */}
      <AddLocationDialog
        open={isAddDialogOpen()}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleLocationCreated}
      />
    </main>
  );
}
