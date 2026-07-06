import type { ParsedGoogleCheckoutAddress } from "@/components/checkout/GooglePlaceAutocompleteElement";

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function getComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
  mode: "long" | "short" = "long",
): string {
  const component = components?.find((item) => item.types?.includes(type));
  if (!component) {
    return "";
  }

  return mode === "short"
    ? component.shortText ?? ""
    : component.longText ?? "";
}

export function parseGooglePlaceDetails(
  place: {
    formattedAddress?: string;
    addressComponents?: GoogleAddressComponent[];
    location?: { latitude?: number; longitude?: number };
  },
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
    lat: place.location?.latitude,
    lng: place.location?.longitude,
  };
}
