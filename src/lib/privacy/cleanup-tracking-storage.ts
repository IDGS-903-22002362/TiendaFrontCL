import { BLOCKED_TRACKING_COOKIE_PREFIXES } from "./cookie-allowlist";

const APP_MODE_BLOCKED_LOCAL_STORAGE = [
  "tiendafront_wishlist_ids",
  "tiendafront_personalization",
];

function deleteCookie(name: string, domain?: string) {
  if (typeof document === "undefined") {
    return;
  }

  const base = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = base;
  if (domain) {
    document.cookie = `${base}; domain=${domain}`;
  }
}

function clearLocalStorageKeys(keys: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignorar
    }
  });
}

/**
 * App Store privacy requirement:
 * Advertising and cross-site tracking must remain disabled when the
 * storefront is embedded in the iOS or Android application.
 */
export function cleanupTrackingStorage(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie.split(";").forEach((part) => {
    const name = part.split("=")[0]?.trim();
    if (!name) {
      return;
    }

    if (
      BLOCKED_TRACKING_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))
    ) {
      deleteCookie(name);
      deleteCookie(name, window.location.hostname);
      const parts = window.location.hostname.split(".");
      if (parts.length > 1) {
        deleteCookie(name, `.${parts.slice(-2).join(".")}`);
      }
    }
  });

  deleteCookie("sidebar_state");
  clearLocalStorageKeys(APP_MODE_BLOCKED_LOCAL_STORAGE);
}
