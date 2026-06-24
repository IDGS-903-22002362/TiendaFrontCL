import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
} from "./constants";
import {
  type CookieConsentRecord,
  parseConsentRecord,
  serializeConsentRecord,
} from "./consent-model";

function getCookieOptions(maxAge = CONSENT_MAX_AGE_SECONDS): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  return `path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function readConsentFromDocument(): CookieConsentRecord | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  const value = match.slice(CONSENT_COOKIE_NAME.length + 1);
  return parseConsentRecord(value);
}

export function writeConsentToDocument(record: CookieConsentRecord): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${CONSENT_COOKIE_NAME}=${serializeConsentRecord(record)}; ${getCookieOptions()}`;
}

export function clearConsentCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${CONSENT_COOKIE_NAME}=; ${getCookieOptions(0)}`;
}

export function readConsentFromRequestCookie(
  cookieValue: string | undefined,
): CookieConsentRecord | null {
  return parseConsentRecord(cookieValue);
}
