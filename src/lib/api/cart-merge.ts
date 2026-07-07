import type { CartItem } from "@/lib/types";

const CART_MERGE_MARKER_KEY = "tiendafront_cart_merge_marker";

export function shouldSkipCartMerge(guestItems: CartItem[]): boolean {
  return guestItems.length === 0;
}

export function getCartMergeMarker(sessionId: string, userId: string): string {
  return `${sessionId}::${userId}`;
}

export function readCartMergeMarker(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(CART_MERGE_MARKER_KEY);
}

export function writeCartMergeMarker(sessionId: string, userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    CART_MERGE_MARKER_KEY,
    getCartMergeMarker(sessionId, userId),
  );
}

export function clearCartMergeMarker(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(CART_MERGE_MARKER_KEY);
}

export function hasCompletedCartMerge(
  sessionId: string,
  userId: string,
  marker: string | null = readCartMergeMarker(),
): boolean {
  if (!sessionId || !userId || !marker) {
    return false;
  }

  return marker === getCartMergeMarker(sessionId, userId);
}
