/**
 * Locations Page
 * 
 * Lists all locations with ability to add new ones.
 * Uses GenericCardList for responsive card grid layout.
 * 
 * TODO: Add auth check here when authentication is implemented
 */

import { createSignal, Show, onMount, Suspense, ErrorBoundary, createMemo } from "solid-js";
import { createAsync, type RouteDefinition, useAction } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { GenericCardList } from "~/components/GenericCardList";
import { AddLocationDialog } from "~/components/AddLocationDialog";
import { queryActiveLocationsQuery, deleteLocationAction } from "~/server/api/locations";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";
import type { CardAction } from "~/lib/schemas/ui/card.schema";
import { Pencil, Trash2 } from "lucide-solid";

export const route = {
  preload: () => queryActiveLocationsQuery("name", 1000),
} satisfies RouteDefinition;

export default function LocationsPage() {
  const deleteLocation = useAction(deleteLocationAction);

  // Track if we're on client side
  const [isClient, setIsClient] = createSignal(false);
  onMount(() => setIsClient(true));
  // If URL contains ?create=1 open the AddLocationDialog on client
  onMount(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "1") {
        setIsDialogOpen(true);
      }
    } catch (e) {
      // ignore on server
    }
  });

  // Fetch locations using SolidStart query + createAsync (SSR-safe and cacheable)
  const locationsResult = createAsync(() => queryActiveLocationsQuery("name", 1000), { deferStream: true });
  
  // Transform Location to LocationUi (add id field)
  const locations = createMemo(() => {
    const locs = locationsResult()?.items ?? [];
    return locs.map((loc) => ({ ...loc, id: loc.locationId })) as LocationUi[];
  });

  // Helper to refetch the query (re-runs on the server)
  const refetch = async () => {
    try {
      await queryActiveLocationsQuery("name", 1000);
    } catch (e) {
      // ignore - ErrorBoundary will surface errors
    }
  };

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [editingLocation, setEditingLocation] = createSignal<LocationUi | undefined>();

  /**
   * Handles successful location creation or update.
   * Refetches the locations list to reflect changes.
   */
  const handleLocationSaved = (_location: LocationUi) => {
    // re-run server query to refresh list
    void refetch();
    setEditingLocation(undefined);
  };

  /**
   * Opens the dialog in create mode.
   */
  const handleAddNew = () => {
    setEditingLocation(undefined);
    setIsDialogOpen(true);
  };

  /**
   * Opens the dialog in edit mode.
   */
  const handleEdit = (loc: LocationUi) => {
    setEditingLocation(loc);
    setIsDialogOpen(true);
  };

  /**
   * Handles location deletion with confirmation.
   */
  const handleDelete = async (loc: LocationUi) => {
    if (!confirm(`Are you sure you want to delete "${loc.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteLocation(loc.id);
      if (result.success) {
        await refetch();
      } else {
        alert(`Failed to delete location: ${result.error}`);
      }
    } catch (err) {
      console.error("Failed to delete location:", err);
      alert("Failed to delete location. Please try again.");
    }
  };

  // Card actions for each location - using icons for mobile-first design
  const locationActions: CardAction<LocationUi>[] = [
    {
      label: <Pencil size={16} />,
      onClick: handleEdit,
      variant: "outline",
      class: "p-2",
    },
    {
      label: <Trash2 size={16} />,
      onClick: handleDelete,
      variant: "outline",
      class: "p-2 text-red-600 hover:bg-red-50",
    },
  ];

  return (
    <main class="container mx-auto py-8 px-4">

      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Locations</h1>
            <p class="mt-1 text-gray-500">Manage your organization's locations.</p>
          </div>
          
          {/* Action Button - rendered only on client to avoid hydration mismatch */}
          <Show when={isClient()}>
            <Button onClick={handleAddNew}>
              Add Location
            </Button>
          </Show>
        </div>
      </div>

      <ErrorBoundary fallback={
        <GenericCardList<LocationUi>
          items={[]}
          title={() => "Error"}
          description={() => ""}
          renderContent={() => (
            <div class="py-6 text-center">
              <p class="text-sm text-red-700">Failed to load locations.</p>
            </div>
          )}
          emptyMessage="Failed to load locations"
          emptyAction={<Button variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button>}
        />
      }>
        <Suspense fallback={<div class="py-12 text-center text-gray-500"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4" /><p>Loading locations...</p></div>}>
          <GenericCardList<LocationUi>
            items={locations() ?? []}
          title={(loc) => loc.name}
          description={(loc) => loc.locationCode}
          renderContent={(loc) => (
            <div class="space-y-2 text-sm text-gray-600">
              <Show when={loc.formattedAddress}>
                <p class="flex items-start gap-2">
                  <span class="text-gray-400">📍</span>
                  <span class="line-clamp-2">{loc.formattedAddress}</span>
                </p>
              </Show>
              <Show when={loc.lat && loc.lng}>
                <p class="text-xs text-gray-400">
                  {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}
                </p>
              </Show>
            </div>
          )}
          actions={locationActions}
          grid={{ md: 2, lg: 3 }}
          emptyMessage="No locations found"
          emptyAction={
            <Button onClick={handleAddNew}>
              Add your first location
            </Button>
          }
        />
        </Suspense>
      </ErrorBoundary>

      {/* Add/Edit Location Dialog - client only */}
      <Show when={isClient()}>
        <AddLocationDialog
          open={isDialogOpen()}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleLocationSaved}
          editLocation={editingLocation()}
        />
      </Show>
    </main>
  );
}
