import { createSignal, onMount, onCleanup, Component } from "solid-js";
import { Loader } from "@googlemaps/js-api-loader";
import { Input } from "~/components/ui/input";
import type { PlaceSelection } from "~/lib/schemas/ui/location.schema";

/**
 * Google Places Autocomplete Component
 * 
 * CRITICAL: This is the ONLY allowed source for address/geo data at creation.
 * Users cannot freeform-enter address text.
 * 
 * Requires a valid Google Places selection before form submission.
 * Provides: placeId, formattedAddress, lat, lng, addressComponents
 */

export interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceSelection | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PlacesAutocomplete: Component<PlacesAutocompleteProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;
  let autocomplete: google.maps.places.Autocomplete | null = null;

  const [isLoaded, setIsLoaded] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string | null>(null);

  onMount(async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLoadError("Google Maps API key not configured");
      return;
    }

    try {
      const loader = new Loader({
        apiKey,
        version: "weekly",
        libraries: ["places"],
      });

      await loader.load();
      setIsLoaded(true);

      if (inputRef) {
        autocomplete = new google.maps.places.Autocomplete(inputRef, {
          types: ["establishment", "geocode"],
          fields: [
            "place_id",
            "formatted_address",
            "geometry",
            "address_components",
            "name",
          ],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();

          if (!place || !place.place_id || !place.geometry?.location) {
            props.onPlaceSelect(null);
            return;
          }

          // Build address components map
          const addressComponents: Record<
            string,
            { long_name: string; short_name: string; types: string[] }
          > = {};

          if (place.address_components) {
            for (const component of place.address_components) {
              for (const type of component.types) {
                addressComponents[type] = {
                  long_name: component.long_name,
                  short_name: component.short_name,
                  types: component.types,
                };
              }
            }
          }

          const selection: PlaceSelection = {
            placeId: place.place_id,
            formattedAddress: place.formatted_address || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            addressComponents:
              Object.keys(addressComponents).length > 0
                ? addressComponents
                : undefined,
          };

          props.onPlaceSelect(selection);
        });
      }
    } catch (error) {
      console.error("Failed to load Google Maps:", error);
      setLoadError("Failed to load Google Maps");
    }
  });

  onCleanup(() => {
    if (autocomplete) {
      google.maps.event.clearInstanceListeners(autocomplete);
    }
  });

  return (
    <div class="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        placeholder={
          loadError()
            ? loadError()!
            : props.placeholder || "Search for a location..."
        }
        disabled={props.disabled || !isLoaded()}
        class="w-full"
      />
      {!isLoaded() && !loadError() && (
        <div class="absolute right-3 top-1/2 -translate-y-1/2">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        </div>
      )}
    </div>
  );
};
