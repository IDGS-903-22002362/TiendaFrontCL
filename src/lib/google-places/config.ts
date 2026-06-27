const DEFAULT_STORE_REFERER = "https://tiendalaguarida.com/";

function normalizeReferer(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return `${url.origin}/`;
  } catch {
    return null;
  }
}

export function getGoogleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  return key || null;
}

export function resolveGooglePlacesReferer(request?: Request): string {
  const fromRequest =
    normalizeReferer(request?.headers.get("referer")) ||
    normalizeReferer(request?.headers.get("origin"));

  if (fromRequest) {
    return fromRequest;
  }

  const configuredStoreUrl = normalizeReferer(
    process.env.GOOGLE_MAPS_API_REFERER?.trim() ||
      process.env.STORE_PUBLIC_BASE_URL?.trim(),
  );

  return configuredStoreUrl || DEFAULT_STORE_REFERER;
}

export function buildGooglePlacesHeaders(
  apiKey: string,
  request?: Request,
  fieldMask?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    Referer: resolveGooglePlacesReferer(request),
  };

  if (fieldMask) {
    headers["X-Goog-FieldMask"] = fieldMask;
  }

  return headers;
}

export function mapGooglePlacesUpstreamError(status: number, body: string): {
  status: number;
  error: string;
  code?: string;
} {
  if (status === 403 && body.includes("API_KEY_HTTP_REFERRER_BLOCKED")) {
    return {
      status: 502,
      code: "GOOGLE_MAPS_REFERRER_BLOCKED",
      error:
        "Google Maps rechazo la key por restricciones de dominio. En Google Cloud Console agrega http://localhost:9002/*, http://localhost:3001/*, https://tiendalaguarida.com/* y https://www.tiendalaguarida.com/* a la API key.",
    };
  }

  if (status === 403) {
    return {
      status: 502,
      code: "GOOGLE_MAPS_FORBIDDEN",
      error:
        "Google Maps rechazo la solicitud. Verifica que Places API (New) este habilitada y que la API key tenga acceso.",
    };
  }

  return {
    status: 502,
    error: "No se pudo completar la busqueda de direccion.",
  };
}

export const GOOGLE_PLACES_MX_BIAS = {
  circle: {
    center: { latitude: 21.1214, longitude: -101.68 },
    radius: 50_000,
  },
} as const;
