import { NextResponse } from "next/server";
import {
  buildGooglePlacesHeaders,
  getGoogleMapsApiKey,
  mapGooglePlacesUpstreamError,
} from "@/lib/google-places/config";
import { parseGooglePlaceDetails } from "@/lib/google-places/parse-address";

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
    placeId?: unknown;
    sessionToken?: unknown;
  };

  const rawPlaceId =
    typeof payload.placeId === "string" ? payload.placeId.trim() : "";
  const sessionToken =
    typeof payload.sessionToken === "string"
      ? payload.sessionToken.trim().slice(0, 64)
      : "";

  if (!rawPlaceId) {
    return NextResponse.json({ error: "placeId requerido." }, { status: 400 });
  }

  const placeResource = rawPlaceId.startsWith("places/")
    ? rawPlaceId
    : `places/${rawPlaceId}`;

  const detailsUrl = new URL(`https://places.googleapis.com/v1/${placeResource}`);
  if (sessionToken) {
    detailsUrl.searchParams.set("sessionToken", sessionToken);
  }

  try {
    const response = await fetch(detailsUrl.toString(), {
      headers: buildGooglePlacesHeaders(
        apiKey,
        request,
        "id,formattedAddress,addressComponents,location",
      ),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env.NODE_ENV === "development") {
        console.error("Places details upstream error:", response.status, errorText);
      }

      const mapped = mapGooglePlacesUpstreamError(response.status, errorText);
      return NextResponse.json(
        { error: mapped.error, code: mapped.code },
        { status: mapped.status },
      );
    }

    const place = await response.json();
    return NextResponse.json({
      address: parseGooglePlaceDetails(place),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Places details request failed:", error);
    }

    return NextResponse.json(
      { error: "No se pudo obtener la direccion." },
      { status: 502 },
    );
  }
}
