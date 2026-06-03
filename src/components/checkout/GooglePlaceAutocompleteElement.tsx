"use client";

import { useEffect, useRef, useState } from "react";
import { loadGooglePlacesLibrary } from "@/lib/google-maps-loader";

export type ParsedGoogleCheckoutAddress = {
  formattedAddress?: string;
  street1?: string;
  street2?: string;
  city?: string;
  stateLabel?: string;
  stateShort?: string;
  postalCode?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
};

type Props = {
  onAddressSelected: (address: ParsedGoogleCheckoutAddress) => void;
  disabled?: boolean;
  defaultValue?: string;
  onReady?: () => void;
  onError?: (message: string) => void;
};

function getComponent(
  components: google.maps.places.AddressComponent[] | undefined,
  type: string,
  mode: "long" | "short" = "long",
): string {
  const component = components?.find((item) => item.types.includes(type));
  if (!component) {
    return "";
  }

  return mode === "short"
    ? component.shortText ?? ""
    : component.longText ?? "";
}

function parsePlaceToCheckoutAddress(
  place: google.maps.places.Place,
): ParsedGoogleCheckoutAddress {
  const components = place.addressComponents;
  const streetNumber = getComponent(components, "street_number");
  const route = getComponent(components, "route");
  const neighborhood =
    getComponent(components, "sublocality_level_1") ||
    getComponent(components, "sublocality") ||
    getComponent(components, "neighborhood");
  const city =
    getComponent(components, "locality") ||
    getComponent(components, "postal_town") ||
    getComponent(components, "administrative_area_level_2");
  const stateLabel = getComponent(
    components,
    "administrative_area_level_1",
    "long",
  );
  const stateShort = getComponent(
    components,
    "administrative_area_level_1",
    "short",
  );
  const postalCode = getComponent(components, "postal_code");
  const countryCode = getComponent(components, "country", "short");
  const street1 = [route, streetNumber].filter(Boolean).join(" ").trim();

  return {
    formattedAddress: place.formattedAddress ?? "",
    street1,
    street2: neighborhood,
    city,
    stateLabel,
    stateShort,
    postalCode,
    countryCode,
    lat: place.location?.lat(),
    lng: place.location?.lng(),
  };
}

export function GooglePlaceAutocompleteElement({
  onAddressSelected,
  disabled = false,
  defaultValue,
  onReady,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(
    null,
  );
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onAddressSelectedRef = useRef(onAddressSelected);
  const hasReportedWidgetErrorRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onAddressSelectedRef.current = onAddressSelected;
  }, [onAddressSelected]);

  useEffect(() => {
    let cancelled = false;
    let autocompleteElement: google.maps.places.PlaceAutocompleteElement | null =
      null;

    async function init() {
      try {
        if (!containerRef.current) {
          return;
        }

        const placesLibrary = await loadGooglePlacesLibrary();
        const PlaceAutocompleteElementCtor =
          placesLibrary.PlaceAutocompleteElement;

        console.log("Places library loaded:", Boolean(placesLibrary));
        console.log(
          "PlaceAutocompleteElement available:",
          Boolean(PlaceAutocompleteElementCtor),
        );

        if (!PlaceAutocompleteElementCtor) {
          throw new Error("PlaceAutocompleteElement is not available");
        }

        if (cancelled || !containerRef.current) {
          return;
        }

        const nextAutocompleteElement = new PlaceAutocompleteElementCtor({});
        autocompleteElement = nextAutocompleteElement;
        elementRef.current = nextAutocompleteElement;

        nextAutocompleteElement.includedRegionCodes = ["mx"];
        nextAutocompleteElement.locationBias = {
          center: { lat: 21.1214, lng: -101.68 },
          radius: 50000,
        };
        nextAutocompleteElement.placeholder =
          defaultValue || "Busca tu direccion en Mexico";
        nextAutocompleteElement.style.colorScheme = "light";
        nextAutocompleteElement.style.backgroundColor = "#ffffff";
        nextAutocompleteElement.style.color = "#171815";
        nextAutocompleteElement.style.setProperty(
          "--gmp-mat-color-surface",
          "#ffffff",
        );
        nextAutocompleteElement.style.setProperty(
          "--gmp-mat-color-on-surface",
          "#171815",
        );
        nextAutocompleteElement.style.setProperty(
          "--gmp-mat-color-on-surface-variant",
          "#5f5a52",
        );
        nextAutocompleteElement.style.setProperty(
          "--gmp-mat-color-outline-decorative",
          "#d6d1c7",
        );
        nextAutocompleteElement.className =
          "block min-h-12 w-full rounded-[1rem] border border-input bg-card/92 px-4 py-3 text-base text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.82)] placeholder:text-text-muted focus:border-primary/65 focus:outline-none focus:ring-4 focus:ring-primary/10 md:text-sm";

        if (disabled) {
          nextAutocompleteElement.setAttribute("disabled", "true");
        }

        nextAutocompleteElement.addEventListener("gmp-error", (event: Event) => {
          if (hasReportedWidgetErrorRef.current) {
            return;
          }

          hasReportedWidgetErrorRef.current = true;
          console.error("Google Places gmp-error:", event);
          const message =
            "Google Places rechazo la busqueda. Revisa API key, Places API (New), billing o restricciones de dominio.";
          setLoadError(message);
          onErrorRef.current?.(message);
        });

        nextAutocompleteElement.addEventListener(
          "gmp-select",
          async (event: Event) => {
            const typedEvent =
              event as google.maps.places.PlacePredictionSelectEvent;
            const placePrediction = typedEvent.placePrediction;

            if (!placePrediction) {
              return;
            }

            const place = placePrediction.toPlace();

            await place.fetchFields({
              fields: [
                "formattedAddress",
                "addressComponents",
                "location",
                "displayName",
              ],
            });

            hasReportedWidgetErrorRef.current = false;
            setLoadError(null);
            onAddressSelectedRef.current(parsePlaceToCheckoutAddress(place));
          },
        );

        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(nextAutocompleteElement);
        onReadyRef.current?.();
      } catch (error) {
        console.error("Google Places load error real:", error);
        const message =
          "Google Places no esta disponible. Puedes capturar tu direccion manualmente.";
        setLoadError(message);
        onErrorRef.current?.(message);
      }
    }

    void init();

    return () => {
      cancelled = true;

      if (autocompleteElement?.parentNode) {
        autocompleteElement.parentNode.removeChild(autocompleteElement);
      }

      if (elementRef.current === autocompleteElement) {
        elementRef.current = null;
      }
    };
  }, [defaultValue, disabled]);

  useEffect(() => {
    const autocompleteElement = elementRef.current;
    if (!autocompleteElement) {
      return;
    }

    autocompleteElement.placeholder =
      defaultValue || "Busca tu direccion en Mexico";
  }, [defaultValue]);

  useEffect(() => {
    const autocompleteElement = elementRef.current;
    if (!autocompleteElement) {
      return;
    }

    if (disabled) {
      autocompleteElement.setAttribute("disabled", "true");
      return;
    }

    autocompleteElement.removeAttribute("disabled");
  }, [disabled]);

  return (
    <div style={{ colorScheme: "light" }}>
      <div ref={containerRef} style={{ colorScheme: "light" }} />
      {loadError ? (
        <p className="mt-2 text-sm text-destructive">{loadError}</p>
      ) : null}
    </div>
  );
}
