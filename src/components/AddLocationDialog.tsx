/**
 * Add Location Dialog
 * 
 * Modal dialog for creating new locations.
 * Uses Google Places Autocomplete as the ONLY source of address/geo data.
 * Manual address entry is NOT allowed.
 * 
 * Required fields:
 * - name: User-provided display name
 * - locationCode: User-provided unique code (sanitized to lowercase alphanumeric with hyphens)
 * - Place selection: Must select a place from Google Autocomplete (provides placeId, address, coords)
 */

import { createSignal, type Component, Show } from "solid-js";
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
import { GooglePlaceSearch, type PlaceDetails } from "~/components/GooglePlaceSearch";
import { createLocation } from "~/server/actions/locations";
import { sanitizeLocationCode } from "~/lib/schemas/ui/location.schema";
import type { AddLocationForm } from "~/lib/schemas/ui/location.schema";
import type { LocationUi } from "~/lib/schemas/ui/location.schema";
import { cn } from "~/lib/utils";

export interface AddLocationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to change the open state */
  onOpenChange: (open: boolean) => void;
  /** Callback when a location is successfully created */
  onSuccess?: (location: LocationUi) => void;
  /** When editing an existing location, prevent editing the locationCode */
  readOnlyLocationCode?: boolean;
}

export const AddLocationDialog: Component<AddLocationDialogProps> = (props) => {
  // Form state
  const [name, setName] = createSignal("");
  const [locationCode, setLocationCode] = createSignal("");
  const [placeDetails, setPlaceDetails] = createSignal<PlaceDetails | null>(null);

  // UI state
  const [isSaving, setIsSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [codeError, setCodeError] = createSignal<string | null>(null);

  /**
   * Handles location code input with sanitization.
   * Converts to lowercase, replaces invalid chars with hyphens.
   */
  const handleLocationCodeChange = (value: string) => {
    const sanitized = sanitizeLocationCode(value);
    setLocationCode(sanitized);

    // Validate length
    if (sanitized.length > 0 && sanitized.length < 6) {
      setCodeError("Location code must be at least 6 characters");
    } else if (sanitized.length > 50) {
      setCodeError("Location code must be at most 50 characters");
    } else {
      setCodeError(null);
    }
  };

  /**
   * Validates the form before submission.
   */
  const validateForm = (): boolean => {
    if (!name().trim()) {
      setError("Name is required");
      return false;
    }

    if (!locationCode() || locationCode().length < 6) {
      setError("Location code must be at least 6 characters");
      return false;
    }

    if (!/^[a-z0-9-]{6,50}$/.test(locationCode())) {
      setError("Location code must be lowercase alphanumeric with hyphens (6-50 chars)");
      return false;
    }

    if (!placeDetails()) {
      setError("Please select a location from the autocomplete. Manual address entry is not allowed.");
      return false;
    }

    return true;
  };

  /**
   * Validate the form without setting UI error messages (used for button enablement)
   */
  const isFormValid = (): boolean => {
    if (!name().trim()) return false;
    if (!locationCode() || locationCode().length < 6) return false;
    if (!/^[a-z0-9-]{6,50}$/.test(locationCode())) return false;
    if (!placeDetails()) return false;
    return true;
  };

  /**
   * Resets the form to initial state.
   */
  const resetForm = () => {
    setName("");
    setLocationCode("");
    setPlaceDetails(null);
    setError(null);
    setCodeError(null);
    setIsSaving(false);
  };

  /**
   * Handles form submission.
   */
  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const place = placeDetails()!;

      const formData: AddLocationForm = {
        name: name().trim(),
        locationCode: locationCode(),
        placeId: place.placeId,
        formattedAddress: place.formattedAddress,
        lat: place.lat,
        lng: place.lng,
        addressComponents: place.addressComponents,
        status: "active",
      };

      const result = await createLocation(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Success!
      props.onSuccess?.(result.data);
      resetForm();
      props.onOpenChange(false);
    } catch (err) {
      console.error("Failed to create location:", err);
      setError(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles dialog close - reset form when closing.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    props.onOpenChange(open);
  };

  const handleClose = () => handleOpenChange(false);

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent class="max-w-md" onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Search for a location using Google Places. Manual address entry is not allowed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} class="space-y-4 mt-4">
          {/* Name Field */}
          <div class="space-y-2">
            <Label for="location-name">Name *</Label>
            <Input
              id="location-name"
              type="text"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="e.g., Austin Main Center"
              disabled={isSaving()}
              required
            />
          </div>

          {/* Location Code Field */}
          <div class="space-y-2">
            <Label for="location-code">Location Code *</Label>
            <Input
              id="location-code"
              type="text"
              value={locationCode()}
              onInput={(e) => handleLocationCodeChange(e.currentTarget.value)}
              placeholder="e.g., austin-main-01"
              disabled={isSaving() || props.readOnlyLocationCode}
              class={cn(
                props.readOnlyLocationCode && "bg-gray-100 cursor-not-allowed",
                codeError() && "border-red-500"
              )}
              required
            />
            <Show when={codeError()}>
              <p class="text-sm text-red-600">{codeError()}</p>
            </Show>
            <p class="text-xs text-gray-500">
              Lowercase letters, numbers, and hyphens only (6-50 characters)
            </p>
          </div>

          {/* Google Places Search */}
          <div class="space-y-2">
            <Label>Location Address *</Label>
            <div class="border border-gray-200 rounded-md p-2">
              <GooglePlaceSearch
                onPlaceSelect={(p) => setPlaceDetails(p)}
                onClear={() => setPlaceDetails(null)}
                placeholder="Search for an address..."
                disabled={isSaving()}
                class="w-full"
              />
            </div>
            {/* Readonly textbox showing selected place (useful for edit flows) */}
            <input
              type="text"
              readonly
              value={placeDetails()?.formattedAddress ?? ""}
              class="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              placeholder="Selected location will appear here after choosing from the dropdown"
            />
            <p class="text-xs text-gray-500">
              You must select a location from the autocomplete dropdown.
            </p>
          </div>

          {/* Error Message */}
          <Show when={error()}>
            <div class="rounded-md bg-red-50 p-3">
              <p class="text-sm text-red-700">{error()}</p>
            </div>
          </Show>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving() || !isFormValid()}
            >
              {isSaving() ? "Creating..." : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLocationDialog;
