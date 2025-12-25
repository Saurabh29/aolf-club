/**
 * Google Places Autocomplete Component
 * * Optimized for @googlemaps/js-api-loader v2.0.2
 * Uses the functional API: setOptions() and importLibrary()
 */

import { createSignal, onMount, type Component, Show } from "solid-js";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { cn } from "~/lib/utils";

// Types remain consistent with your existing schema
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
  onPlaceSelect: (place: PlaceDetails) => void;
  onClear?: () => void;
  placeholder?: string;
  class?: string;
  disabled?: boolean;
  initialValue?: string;
}

/**
 * Extracts structured address data from the Google Place object.
 * This version uses reduce for a more compact implementation.
 */
function extractAddressComponents(
  place: google.maps.places.Place
): PlaceDetails["addressComponents"] {
  const components = place.addressComponents;
  if (!components) return undefined;

  const componentMap = new Map(
    components.flatMap((c) => c.types.map((t) => [t, c]))
  );

  const get = (key: string) => componentMap.get(key)?.longText ?? undefined;
  const getShort = (key: string) => componentMap.get(key)?.shortText ?? undefined;

  const result: PlaceDetails["addressComponents"] = {
    streetNumber: get("street_number"),
    route: get("route"),
    city: get("locality"),
    state: get("administrative_area_level_1"),
    stateCode: getShort("administrative_area_level_1"),
    postalCode: get("postal_code"),
    country: get("country"),
    countryCode: getShort("country"),
  };

  // Return undefined if no fields were extracted to avoid sending an empty object
  return Object.values(result).some((v) => v !== undefined)
    ? result
    : undefined;
}

export const GooglePlaceSearch: Component<GooglePlaceSearchProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("VITE_GOOGLE_MAPS_API_KEY is missing.");
      return;
    }

    try {
      // Use a single config object for the loader
      setOptions({ key: apiKey, v: "weekly" });

      // Destructure to get the web component class
      const { PlaceAutocompleteElement } = (await importLibrary(
        "places"
      )) as google.maps.PlacesLibrary;

      if (!containerRef || !PlaceAutocompleteElement) {
        throw new Error("Places Library or container failed to load.");
      }

      // Create and configure the web component instance
      const autocompleteInstance = new PlaceAutocompleteElement();
      autocompleteInstance.classList.add("w-full");
      if (props.placeholder) autocompleteInstance.placeholder = props.placeholder;
      if (props.initialValue) autocompleteInstance.value = props.initialValue;

      // Event: User selects a place
      autocompleteInstance.addEventListener("gmp-select", async (event: any) => {
        const place = event.detail?.place ?? event.placePrediction?.toPlace();

        if (!place) {
          console.error("[gmp-select] Could not find place data in the event object.");
          return;
        }
        
        // The place object needs to have its fields fetched.
        await place.fetchFields({
          fields: ["id", "location", "formattedAddress", "addressComponents", "displayName"],
        });

        if (place.id && place.location) {
          props.onPlaceSelect({
            placeId: place.id,
            formattedAddress: place.formattedAddress || place.displayName || "",
            lat: place.location.lat(),
            lng: place.location.lng(),
            addressComponents: extractAddressComponents(place),
          });
          setError(null);
        } else {
          console.warn("[gmp-select] Place is missing ID or location after fetching fields.");
        }
      });

      // Append the instance to the container
      containerRef.appendChild(autocompleteInstance);

      // Handle the internal input for the clear event.
      const internalInput = autocompleteInstance.querySelector("input");
      internalInput?.addEventListener("input", () => {
        if (internalInput.value === "") {
          props.onClear?.();
        }
      });

      setIsLoaded(true);
    } catch (err) {
      console.error("Google Places API Error:", err);
      setError("Failed to load Google Places service.");
    }
  });

  return (
    <div class={cn("relative w-full", props.class)}>
      <div
        ref={containerRef}
        class={cn(props.disabled && "opacity-50 pointer-events-none")}
      />

      <Show when={error()}>
        <p class="mt-1 text-xs text-red-500">{error()}</p>
      </Show>

      {/* Loading Placeholder */}
      <Show when={!isLoaded() && !error()}>
        <div class="h-10 w-full animate-pulse bg-gray-100 rounded-md border border-gray-200" />
      </Show>
    </div>
  );
};

export default GooglePlaceSearch;