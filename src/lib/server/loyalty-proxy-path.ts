/**
 * Maps same-origin storefront calls to the JWT-authenticated loyalty API.
 * Partner OAuth remains isolated under /api/loyalty/v1 in the backend.
 */
export function buildLoyaltyBackendPath(path?: string[]): string {
  if (!path || path.length === 0) {
    return "/api/loyalty/internal/v1";
  }
  return `/api/loyalty/internal/v1/${path.join("/")}`;
}
