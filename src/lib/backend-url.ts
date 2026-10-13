export const PRODUCTION_BACKEND_BASE =
  "https://us-central1-e-comerce-leon.cloudfunctions.net/api";

export const LOCAL_BACKEND_BASE = "http://localhost:3000/api";

export const FALLBACK_BACKEND_BASE =
  process.env.NODE_ENV === "production"
    ? PRODUCTION_BACKEND_BASE
    : LOCAL_BACKEND_BASE;

function isLocalDevelopmentBase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export function resolveBackendBaseUrl(): string {
  const configured = (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  ).replace(/\/+$/, "");

  if (
    process.env.NODE_ENV === "production" &&
    (!configured || isLocalDevelopmentBase(configured))
  ) {
    return PRODUCTION_BACKEND_BASE;
  }

  return (configured || FALLBACK_BACKEND_BASE).replace(/\/+$/, "");
}

/**
 * Joins a backend base URL with an API path without duplicating `/api`.
 * Local emulators expose routes at `/api/*`, while production Cloud Functions
 * also accept `/api/api/*`; normalizing keeps both environments working.
 */
export function joinBackendApiUrl(base: string, path: string): string {
  const sanitizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (
    sanitizedBase.endsWith("/api") &&
    (normalizedPath === "/api" || normalizedPath.startsWith("/api/"))
  ) {
    return `${sanitizedBase}${normalizedPath.slice(4)}`;
  }

  return `${sanitizedBase}${normalizedPath}`;
}
