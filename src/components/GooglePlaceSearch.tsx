/**
 * Google Places Autocomplete Component
 * 
 * Integrates with Google Places API using the NEW PlaceAutocompleteElement.
 * This is the recommended approach as of March 2025 (deprecates google.maps.places.Autocomplete).
 * 
 * This is the ONLY allowed source of address/geolocation data at creation time.
 * Manual address entry is NOT permitted.
 * 
 * Requires VITE_GOOGLE_MAPS_API_KEY environment variable.
 * 
 * Reference: https://developers.google.com/maps/documentation/javascript/place-autocomplete-element
 * Migration guide: https://developers.google.com/maps/documentation/javascript/places-migration-overview
 * 
 * Usage:
 * <GooglePlaceSearch
 *   onPlaceSelect={(place) => console.log(place)}
 *   placeholder="Search for a location..."
 * />
 */

import { createSignal, onMount, onCleanup, type Component, Show } from "solid-js";
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
 * Extracts structured address components from the new Place API response.
 * The new API uses different property names (longText/shortText instead of long_name/short_name).
 */
function extractAddressComponents(
  place: google.maps.places.Place
): PlaceDetails["addressComponents"] {
  const components = place.addressComponents;
  if (!components) return undefined;

  const result: PlaceDetails["addressComponents"] = {};

  for (const component of components) {
    const types = component.types;

    if (types.includes("street_number")) {
      result.streetNumber = component.longText ?? component.shortText ?? undefined;
    } else if (types.includes("route")) {
      result.route = component.longText ?? component.shortText ?? undefined;
    } else if (types.includes("locality")) {
      result.city = component.longText ?? component.shortText ?? undefined;
    } else if (types.includes("administrative_area_level_1")) {
      result.state = component.longText ?? undefined;
      result.stateCode = component.shortText ?? undefined;
    } else if (types.includes("postal_code")) {
      result.postalCode = component.longText ?? component.shortText ?? undefined;
    } else if (types.includes("country")) {
      result.country = component.longText ?? undefined;
      result.countryCode = component.shortText ?? undefined;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export const GooglePlaceSearch: Component<GooglePlaceSearchProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let autocompleteElement: google.maps.places.PlaceAutocompleteElement | null = null;

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
      // Load Google Maps script with the new Places library
      await loadGoogleMapsScript(apiKey);

      if (!containerRef) return;

      // Create the new PlaceAutocompleteElement
      // This is the recommended approach as of March 2025
      autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
        // componentRestrictions: { country: "us" }, // Uncomment to restrict to specific country
      });

      // Style the autocomplete element to match our design
      autocompleteElement.style.width = "100%";
      autocompleteElement.setAttribute("placeholder", props.placeholder ?? "Search for a location...");

      // Append to container
      containerRef.appendChild(autocompleteElement);

      // Listen for place selection using the new 'gmp-placeselect' event
      autocompleteElement.addEventListener("gmp-placeselect", async (event: any) => {
        const place: google.maps.places.Place = event.place;

        // Fetch additional place details (the element only returns basic info)
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "addressComponents"],
        });

        if (!place.id || !place.location) {
          setError("Please select a valid location from the dropdown.");
          return;
        }

        const placeDetails: PlaceDetails = {
          placeId: place.id,
          formattedAddress: place.formattedAddress || place.displayName || "",
          lat: place.location.lat(),
          lng: place.location.lng(),
          addressComponents: extractAddressComponents(place),
        };

        setSelectedPlace(placeDetails);
        setError(null);
        props.onPlaceSelect(placeDetails);
      });

      setIsLoaded(true);
    } catch (err) {
      console.error("Failed to load Google Places:", err);
      setError("Failed to load Google Places. Please check your API key and ensure the Places API (New) is enabled.");
    }
  });

  onCleanup(() => {
    if (autocompleteElement && containerRef?.contains(autocompleteElement)) {
      containerRef.removeChild(autocompleteElement);
    }
  });

  const handleClear = () => {
    setSelectedPlace(null);
    // Clear the autocomplete input
    if (autocompleteElement) {
      const input = autocompleteElement.querySelector("input");
      if (input) {
        input.value = "";
      }
    }
    props.onClear?.();
  };

  return (
    <div class={cn("relative", props.class)}>
      <div class="relative">
        {/* Container for the PlaceAutocompleteElement */}
        <div
          ref={(el) => (containerRef = el)}
          class={cn(
            "google-places-container",
            selectedPlace() && "selected",
            props.disabled && "opacity-50 pointer-events-none"
          )}
        />
        <Show when={selectedPlace()}>
          <button
            type="button"
            onClick={handleClear}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 z-10"
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
 * Loads the Google Maps JavaScript API script using the recommended async pattern.
 * Uses the new 'places' library which includes PlaceAutocompleteElement.
 * 
 * @see https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 */
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      resolve();
      return;
    }

    // Check for existing script (avoid duplicate loading)
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      // Wait for it to load
      if (window.google?.maps?.places?.PlaceAutocompleteElement) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => {
          // Give a small delay for the API to initialize
          setTimeout(() => resolve(), 100);
        });
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Google Maps"))
        );
      }
      return;
    }

    // Create and load script with async/defer for optimal performance
    const script = document.createElement("script");
    // Use the 'places' library which includes the new PlaceAutocompleteElement
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Small delay to ensure API is fully initialized
      setTimeout(() => resolve(), 100);
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));

    document.head.appendChild(script);
  });
}

export default GooglePlaceSearch;
