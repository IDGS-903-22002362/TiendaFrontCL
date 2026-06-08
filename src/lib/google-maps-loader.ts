import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;
let placesPromise: Promise<google.maps.PlacesLibrary> | null = null;

export async function loadGooglePlacesLibrary() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  }

  if (!configured) {
    setOptions({
      key: apiKey,
      v: "weekly",
      language: "es-MX",
      region: "MX",
      authReferrerPolicy: "origin",
    });

    configured = true;
  }

  if (!placesPromise) {
    placesPromise = importLibrary(
      "places",
    ) as Promise<google.maps.PlacesLibrary>;
  }

  return placesPromise;
}
