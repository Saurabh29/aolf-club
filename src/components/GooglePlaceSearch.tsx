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
      result.streetNumber = component.longText;
    } else if (types.includes("route")) {
      result.route = component.longText;
    } else if (types.includes("locality")) {
      result.city = component.longText;
    } else if (types.includes("administrative_area_level_1")) {
      result.state = component.longText;
      result.stateCode = component.shortText;
    } else if (types.includes("postal_code")) {
      result.postalCode = component.longText;
    } else if (types.includes("country")) {
      result.country = component.longText;
      result.countryCode = component.shortText;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export const GooglePlaceSearch: Component<GooglePlaceSearchProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const [isLoaded, setIsLoaded] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  onMount(async () => {
    if (!apiKey) {
      setError("VITE_GOOGLE_MAPS_API_KEY is missing.");
      return;
    }

    try {
      /**
       * V2 CORRECT USAGE:
       * 1. setOptions uses 'key' instead of 'apiKey'.
       * 2. This creates the global google.maps.importLibrary function.
       */
      setOptions({
        key: apiKey,
        v: "weekly" // Correct version parameter is 'v'
      });

      // 3. Load the library. importLibrary handles waiting for the script.
      const { PlaceAutocompleteElement } = (await importLibrary(
        "places"
      )) as google.maps.PlacesLibrary;

      if (!containerRef) return;

      // 4. Create the Web Component instance
      const autocompleteInstance = new PlaceAutocompleteElement();
      autocompleteInstance.classList.add("w-full");
      
      if (props.placeholder) {
        autocompleteInstance.setAttribute("placeholder", props.placeholder);
      }

      // Event: User selects a place from suggestions
      autocompleteInstance.addEventListener("gmp-select", async (event: any) => {
        const placePrediction = event.placePrediction;
        if (!placePrediction) return;

        const place = placePrediction.toPlace();
        
        // Fetch only specific fields to keep costs down
        await place.fetchFields({
          fields: ["id", "location", "formattedAddress", "addressComponents", "displayName"],
        });

        if (place.id && place.location) {
          const details: PlaceDetails = {
            placeId: place.id,
            formattedAddress: place.formattedAddress || place.displayName || "",
            lat: place.location.lat(),
            lng: place.location.lng(),
            addressComponents: extractAddressComponents(place),
          };
          props.onPlaceSelect(details);
          setError(null);
        }
      });

      containerRef.appendChild(autocompleteInstance as unknown as Node);

      // Handle the internal input for pre-population or clearing
      const internalInput = autocompleteInstance.querySelector("input") as HTMLInputElement;
      if (internalInput) {
        if (props.initialValue) internalInput.value = props.initialValue;
        
        internalInput.addEventListener("input", () => {
          if (internalInput.value === "") props.onClear?.();
        });
      }

      setIsLoaded(true);
    } catch (err) {
      console.error("Google Places API Error:", err);
      setError("Failed to load search service.");
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