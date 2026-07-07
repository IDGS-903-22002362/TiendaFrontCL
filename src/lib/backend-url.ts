export const FALLBACK_BACKEND_BASE = "http://localhost:3000/api";

export function resolveBackendBaseUrl(): string {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    FALLBACK_BACKEND_BASE
  ).replace(/\/+$/, "");
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
