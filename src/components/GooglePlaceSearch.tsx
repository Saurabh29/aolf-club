/**
 * Google Places Autocomplete Component
 * 
 * Integrates with Google Places API (New) for location search.
 * This is the ONLY allowed source of address/geolocation data at creation time.
 * Manual address entry is NOT permitted.
 * 
 * Requires VITE_GOOGLE_MAPS_API_KEY environment variable.
 * 
 * Reference: https://developers.google.com/maps/documentation/javascript/place-autocomplete-new
 * 
 * Usage:
 * <GooglePlaceSearch
 *   onPlaceSelect={(place) => console.log(place)}
 *   placeholder="Search for a location..."
 * />
 */

import { createSignal, onMount, onCleanup, type Component, Show } from "solid-js";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

/**
 * PlaceDetails - The data structure emitted when a place is selected.
 * Contains all the required fields from Google Places API.
 */
export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  addressComponents?: {
    streetNumber?: string;
    route?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  };
}

export interface GooglePlaceSearchProps {
  /** Callback when a place is selected from autocomplete */
  onPlaceSelect: (place: PlaceDetails) => void;
  /** Optional callback when the selection is cleared */
  onClear?: () => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS classes */
  class?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Extracts structured address components from Google Places API response.
 */
function extractAddressComponents(
  components: google.maps.places.AddressComponent[] | undefined
): PlaceDetails["addressComponents"] {
  if (!components) return undefined;

  const result: PlaceDetails["addressComponents"] = {};

  for (const component of components) {
    const types = component.types;

    if (types.includes("street_number")) {
      result.streetNumber = (component as any).long_name ?? (component as any).longText ?? undefined;
    } else if (types.includes("route")) {
      result.route = (component as any).long_name ?? (component as any).longText ?? undefined;
    } else if (types.includes("locality")) {
      result.city = (component as any).long_name ?? (component as any).longText ?? undefined;
    } else if (types.includes("administrative_area_level_1")) {
      result.state = (component as any).long_name ?? (component as any).longText ?? undefined;
      result.stateCode = (component as any).short_name ?? (component as any).shortText ?? undefined;
    } else if (types.includes("postal_code")) {
      result.postalCode = (component as any).long_name ?? (component as any).longText ?? undefined;
    } else if (types.includes("country")) {
      result.country = (component as any).long_name ?? (component as any).longText ?? undefined;
      result.countryCode = (component as any).short_name ?? (component as any).shortText ?? undefined;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export const GooglePlaceSearch: Component<GooglePlaceSearchProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;
  let autocomplete: google.maps.places.Autocomplete | null = null;

  const [isLoaded, setIsLoaded] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedPlace, setSelectedPlace] = createSignal<PlaceDetails | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  onMount(async () => {
    if (!apiKey) {
      setError("Google Maps API key is not configured. Set VITE_GOOGLE_MAPS_API_KEY.");
      return;
    }

    try {
      // Load Google Maps script if not already loaded
      if (!window.google?.maps?.places) {
        await loadGoogleMapsScript(apiKey);
      }

      if (!inputRef) return;

      // Initialize autocomplete
      autocomplete = new google.maps.places.Autocomplete(inputRef, {
        fields: ["place_id", "formatted_address", "geometry", "address_components"],
        types: ["establishment", "geocode"],
      });

      // Listen for place selection
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete?.getPlace();

        if (!place?.place_id || !place?.geometry?.location) {
          setError("Please select a valid location from the dropdown.");
          return;
        }

        const placeDetails: PlaceDetails = {
          placeId: place.place_id,
          formattedAddress: place.formatted_address || "",
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          addressComponents: extractAddressComponents(
            place.address_components as unknown as google.maps.places.AddressComponent[]
          ),
        };

        setSelectedPlace(placeDetails);
        setError(null);
        props.onPlaceSelect(placeDetails);
      });

      setIsLoaded(true);
    } catch (err) {
      console.error("Failed to load Google Places:", err);
      setError("Failed to load Google Places. Please check your API key.");
    }
  });

  onCleanup(() => {
    if (autocomplete) {
      google.maps.event.clearInstanceListeners(autocomplete);
    }
  });

  const handleClear = () => {
    setSelectedPlace(null);
    if (inputRef) {
      inputRef.value = "";
    }
    props.onClear?.();
  };

  return (
    <div class={cn("relative", props.class)}>
      <div class="relative">
        <Input
          ref={(el) => (inputRef = el)}
          type="text"
          placeholder={props.placeholder ?? "Search for a location..."}
          disabled={props.disabled || !isLoaded()}
          class={cn(
            "pr-10",
            selectedPlace() && "border-green-500 bg-green-50"
          )}
        />
        <Show when={selectedPlace()}>
          <button
            type="button"
            onClick={handleClear}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label="Clear selection"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </Show>
      </div>

      <Show when={error()}>
        <p class="mt-1 text-sm text-red-600">{error()}</p>
      </Show>

      <Show when={!isLoaded() && !error()}>
        <p class="mt-1 text-sm text-gray-500">Loading Google Places...</p>
      </Show>

      <Show when={selectedPlace()}>
        <div class="mt-2 rounded-md bg-gray-50 p-3 text-sm">
          <p class="font-medium text-gray-900">{selectedPlace()?.formattedAddress}</p>
          <p class="text-gray-600">
            Coordinates: {selectedPlace()?.lat.toFixed(6)}, {selectedPlace()?.lng.toFixed(6)}
          </p>
        </div>
      </Show>
    </div>
  );
};

/**
 * Loads the Google Maps JavaScript API script.
 */
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[src^="https://maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));

    document.head.appendChild(script);
  });
}

export default GooglePlaceSearch;
