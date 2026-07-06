import { NextResponse } from "next/server";
import {
  buildGooglePlacesHeaders,
  getGoogleMapsApiKey,
  GOOGLE_PLACES_MX_BIAS,
  mapGooglePlacesUpstreamError,
} from "@/lib/google-places/config";

export async function POST(request: Request) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Places no esta configurado." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const payload = (body && typeof body === "object" ? body : {}) as {
    input?: unknown;
    sessionToken?: unknown;
  };

  const input =
    typeof payload.input === "string" ? payload.input.trim().slice(0, 200) : "";
  const sessionToken =
    typeof payload.sessionToken === "string"
      ? payload.sessionToken.trim().slice(0, 64)
      : "";

  if (input.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: buildGooglePlacesHeaders(
          apiKey,
          request,
          "suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
        ),
        body: JSON.stringify({
          input,
          sessionToken: sessionToken || undefined,
          includedRegionCodes: ["mx"],
          languageCode: "es-MX",
          regionCode: "mx",
          locationBias: GOOGLE_PLACES_MX_BIAS,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV === "development") {
        console.error(
          "Places autocomplete upstream error:",
          response.status,
          errorText,
        );
      }

      const mapped = mapGooglePlacesUpstreamError(response.status, errorText);
      return NextResponse.json(
        { error: mapped.error, code: mapped.code },
        { status: mapped.status },
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Places autocomplete request failed:", error);
    }

    return NextResponse.json(
      { error: "No se pudo buscar la direccion." },
      { status: 502 },
    );
  }
}
