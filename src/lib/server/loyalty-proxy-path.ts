/**
 * Maps Next.js catch-all segments under /api/loyalty/* to the backend loyalty v1 path.
 */
export function buildLoyaltyBackendPath(path?: string[]): string {
  if (!path || path.length === 0) {
    return "/api/loyalty/v1";
  }
  return `/api/loyalty/v1/${path.join("/")}`;
}
