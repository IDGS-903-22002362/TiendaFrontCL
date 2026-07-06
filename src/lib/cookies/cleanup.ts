import type { ConsentCategories } from "./constants";

const NON_ESSENTIAL_COOKIES = ["sidebar_state"];

const NON_ESSENTIAL_LOCAL_STORAGE = [
  "tiendafront_wishlist_ids",
  "tiendafront_personalization",
];

/** Cookies de terceros conocidas que pueden quedar tras retirar consentimiento. */
const THIRD_PARTY_COOKIE_PREFIXES = [
  "_ga",
  "_gid",
  "_gat",
  "_fbp",
  "_fbc",
  "_gcl",
  "_tt",
  "tt_",
  "_hj",
  "_clck",
  "_clsk",
  "CLID",
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

export function cleanupNonEssentialStorage(categories: ConsentCategories): void {
  if (!categories.preferences) {
    deleteCookie("sidebar_state");
    clearLocalStorageKeys(NON_ESSENTIAL_LOCAL_STORAGE);
  }

  if (!categories.analytics && !categories.marketing) {
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((part) => {
        const name = part.split("=")[0]?.trim();
        if (!name) {
          return;
        }
        if (THIRD_PARTY_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
          deleteCookie(name);
          deleteCookie(name, window.location.hostname);
          const parts = window.location.hostname.split(".");
          if (parts.length > 1) {
            deleteCookie(name, `.${parts.slice(-2).join(".")}`);
          }
        }
      });
    }
  }

  if (!categories.preferences) {
    NON_ESSENTIAL_COOKIES.forEach((name) => deleteCookie(name));
  }
}

export function markScriptsUnloaded(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.__tiendafront_consent_scripts_loaded = {
    analytics: false,
    marketing: false,
    preferences: false,
  };
}

declare global {
  interface Window {
    __tiendafront_consent_scripts_loaded?: Partial<
      Record<"analytics" | "marketing" | "preferences", boolean>
    >;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}
