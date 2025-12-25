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
  let checkInputCleared: (() => void) | undefined;

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
      // Load the Google Maps bootstrap script (typed and safe)
      await loadGoogleMapsScript(apiKey);

      // Dynamically import the 'places' library using importLibrary if available.
      // Type definitions for the new API may be missing, so cast to any.
      const placesLib = (google.maps as any).importLibrary
        ? await (google.maps as any).importLibrary("places")
        : (google.maps as any).places;
      const PlaceAutocompleteElement = placesLib?.PlaceAutocompleteElement as any;

      if (!containerRef) return;

      autocompleteElement = new PlaceAutocompleteElement({
        // componentRestrictions: { country: "us" }, 
      });

      if (!autocompleteElement) {
        setError("Failed to create PlaceAutocompleteElement.");
        return;
      }

      autocompleteElement.style.width = "100%";
      autocompleteElement.setAttribute("placeholder", props.placeholder ?? "Search for a location...");

      containerRef.appendChild(autocompleteElement as unknown as Node);

      // Listen for the 'gmp-select' event, which fires when a user selects a place.
      autocompleteElement.addEventListener("gmp-select", async (event: Event) => {
        // The event currently provides `placePrediction` directly on the event object.
        const placePrediction = (event as unknown as { placePrediction?: any }).placePrediction;

        if (!placePrediction) {
          setError("Please select a valid location from the list.");
          return;
        }

        const place = placePrediction.toPlace();

        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "addressComponents", "id"],
        });

        if (!place.id || !place.location) {
          setError("Selected location is missing required details.");
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

      const input = autocompleteElement.querySelector("input");
      if (input) {
        checkInputCleared = () => {
          if (input.value === "" && selectedPlace()) {
            setSelectedPlace(null);
            props.onClear?.();
          }
        };
        input.addEventListener("input", checkInputCleared as EventListener);
      }

      setIsLoaded(true);
    } catch (err) {
      console.error("Failed to initialize Google Places:", err);
      setError("Failed to load Google Places. Check API key and network.");
    }
  });

  onCleanup(() => {
    if (autocompleteElement) {
      const input = autocompleteElement.querySelector("input");
      if (input && checkInputCleared) {
        input.removeEventListener("input", checkInputCleared);
      }
      // The bootstrap loader and SolidJS handle script and element cleanup.
    }
  });

  return (
    <div class={cn("relative", props.class)}>
      <div
        ref={(el) => (containerRef = el)}
        class={cn(
          "google-places-container",
          props.disabled && "opacity-50 pointer-events-none"
        )}
      />

      <Show when={error()}>
        <p class="mt-1 text-sm text-red-600">{error()}</p>
      </Show>

      <Show when={!isLoaded() && !error()}>
        <p class="mt-1 text-sm text-gray-500">Loading Google Places...</p>
      </Show>
    </div>
  );
};

// The bootstrap loader handles script loading, so the old function is no longer needed.
/**
 * Typed loader for Google Maps bootstrap script. Ensures `google.maps.importLibrary`
 * is available before resolving. Uses `v=beta` to ensure PlaceAutocompleteElement
 * is available in environments where it's in beta.
 */
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.importLibrary) {
      resolve();
      return;
    }

    const scriptId = "google-maps-bootstrap";
    if (document.getElementById(scriptId)) {
      // Wait for existing script to initialize the API
      const existing = document.getElementById(scriptId) as HTMLScriptElement;
      existing.addEventListener("load", () => {
        // small delay to let the API attach
        setTimeout(() => resolve(), 50);
      });
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setTimeout(() => resolve(), 50);
    };
    script.onerror = (e) => reject(new Error("Failed to load Google Maps script"));

    document.head.appendChild(script);
  });
}

export default GooglePlaceSearch;
