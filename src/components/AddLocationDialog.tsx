import { createSignal, Show, Component } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PlacesAutocomplete } from "~/components/PlacesAutocomplete";
import { toast } from "~/components/ui/toast";
import { createLocation } from "~/server/actions/locations";
import type { PlaceSelection, AddLocationFormData } from "~/lib/schemas/ui/location.schema";

/**
 * AddLocationDialog Component
 * 
 * Dialog for creating a new location with:
 * - User-entered: name, locationCode
 * - Google Places Autocomplete: address, coordinates (REQUIRED)
 * 
 * CRITICAL: Address data MUST come from Google Places Autocomplete.
 * The form cannot be submitted without a valid place selection.
 * formattedAddress, lat, lng are read-only, populated by autocomplete.
 */

export interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddLocationDialog: Component<AddLocationDialogProps> = (props) => {
  const [name, setName] = createSignal("");
  const [locationCode, setLocationCode] = createSignal("");
  const [placeSelection, setPlaceSelection] = createSignal<PlaceSelection | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const resetForm = () => {
    setName("");
    setLocationCode("");
    setPlaceSelection(null);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    props.onOpenChange(open);
  };

  const handlePlaceSelect = (place: PlaceSelection | null) => {
    setPlaceSelection(place);
    setError(null);
  };

  const handleLocationCodeChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    // Auto-uppercase and restrict to valid characters
    const value = target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setLocationCode(value);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Validate place selection (REQUIRED from Google Places)
    const place = placeSelection();
    if (!place) {
      setError("Please select a location from the autocomplete dropdown");
      return;
    }

    if (!name().trim()) {
      setError("Name is required");
      return;
    }

    if (locationCode().length < 2) {
      setError("Location code must be at least 2 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build form data matching AddLocationFormSchema
      const formData: AddLocationFormData = {
        name: name().trim(),
        locationCode: locationCode(),
        placeId: place.placeId,
        formattedAddress: place.formattedAddress,
        lat: place.lat,
        lng: place.lng,
        addressComponents: place.addressComponents,
      };

      const result = await createLocation(formData);

      if (result.success) {
        toast({
          title: "Location created",
          description: `${formData.name} (${formData.locationCode}) has been created.`,
        });
        handleOpenChange(false);
        props.onSuccess?.();
      } else {
        setError(result.error || "Failed to create location");
        toast({
          title: "Error",
          description: result.error || "Failed to create location",
          variant: "destructive",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent class="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Create a new location. Address must be selected from Google Places.
            </DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 py-4">
            {/* Name field - user entered */}
            <div class="grid gap-2">
              <Label for="name">Name *</Label>
              <Input
                id="name"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                placeholder="e.g., Main Office"
                disabled={isSubmitting()}
              />
            </div>

            {/* Location Code field - user entered */}
            <div class="grid gap-2">
              <Label for="locationCode">Location Code *</Label>
              <Input
                id="locationCode"
                value={locationCode()}
                onInput={handleLocationCodeChange}
                placeholder="e.g., SF-001"
                maxLength={20}
                disabled={isSubmitting()}
              />
              <p class="text-xs text-gray-500">
                Uppercase letters, numbers, and hyphens only
              </p>
            </div>

            {/* Google Places Autocomplete - REQUIRED */}
            <div class="grid gap-2">
              <Label>Address *</Label>
              <PlacesAutocomplete
                onPlaceSelect={handlePlaceSelect}
                placeholder="Search for an address..."
                disabled={isSubmitting()}
              />
              <p class="text-xs text-gray-500">
                Select an address from the dropdown
              </p>
            </div>

            {/* Read-only place details (populated by autocomplete) */}
            <Show when={placeSelection()}>
              <div class="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div>
                  <span class="text-xs font-medium text-gray-500">
                    Selected Address
                  </span>
                  <p class="text-sm text-gray-900">
                    {placeSelection()?.formattedAddress}
                  </p>
                </div>
                <div class="flex gap-4">
                  <div>
                    <span class="text-xs font-medium text-gray-500">Lat</span>
                    <p class="text-sm text-gray-900">
                      {placeSelection()?.lat.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <span class="text-xs font-medium text-gray-500">Lng</span>
                    <p class="text-sm text-gray-900">
                      {placeSelection()?.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            </Show>

            {/* Error message */}
            <Show when={error()}>
              <div class="rounded-md bg-red-50 border border-red-200 p-3">
                <p class="text-sm text-red-600">{error()}</p>
              </div>
            </Show>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting()}>
              {isSubmitting() ? "Creating..." : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
