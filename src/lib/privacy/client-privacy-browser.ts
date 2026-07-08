import { CL_APP_CONTEXT_COOKIE } from "./constants";
import {
  resolveClientPrivacyContext,
  type ResolvePrivacyInput,
} from "./resolve-client-privacy-context";
import type { ClientPrivacyContext } from "./types";
import { WEB_PRIVACY_CONTEXT } from "./types";

export function readClAppContextCookieFromDocument(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CL_APP_CONTEXT_COOKIE}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(CL_APP_CONTEXT_COOKIE.length + 1));
}

export function resolveClientPrivacyContextFromBrowser(
  input: Omit<ResolvePrivacyInput, "cookieValue"> = {},
): ClientPrivacyContext {
  if (typeof window === "undefined") {
    return WEB_PRIVACY_CONTEXT;
  }

  return resolveClientPrivacyContext({
    ...input,
    cookieValue: readClAppContextCookieFromDocument(),
    userAgent: window.navigator.userAgent,
  });
}
