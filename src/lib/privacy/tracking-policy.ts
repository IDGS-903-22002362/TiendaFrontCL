import type { CookieCategory } from "@/lib/cookies/constants";
import type { ClientPrivacyContext } from "./types";

/**
 * App Store privacy requirement:
 * Advertising and cross-site tracking must remain disabled when the
 * storefront is embedded in the iOS or Android application.
 */
export function shouldLoadThirdPartyTracking(
  context: ClientPrivacyContext,
): boolean {
  return !context.trackingDisabled;
}

export function shouldSendAdvertisingEvent(
  context: ClientPrivacyContext,
): boolean {
  return !context.trackingDisabled;
}

export function getAllowedCookieCategories(
  context: ClientPrivacyContext,
): CookieCategory[] {
  if (context.trackingDisabled) {
    return ["necessary"];
  }

  return ["necessary", "preferences", "analytics", "marketing"];
}

export function isCookieCategoryAllowedInContext(
  context: ClientPrivacyContext,
  category: CookieCategory,
): boolean {
  return getAllowedCookieCategories(context).includes(category);
}
