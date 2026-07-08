import type { ClientOrigin } from "./types";

/**
 * App Store privacy requirement:
 * Advertising and cross-site tracking must remain disabled when the
 * storefront is embedded in the iOS or Android application.
 */
export const CL_APP_CONTEXT_COOKIE = "cl_app_context";

export const CL_APP_CONTEXT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const APP_SOURCE_QUERY_PARAM = "app_source";
export const TRACKING_QUERY_PARAM = "tracking";
export const TRACKING_DISABLED_VALUE = "disabled";

export const LEGACY_MOBILE_QUERY_PARAMS = {
  from: "mobile-app",
  mobile: "1",
  source: "clubleon-app",
} as const;

export const CLUBLEON_MOBILE_UA_MARKERS = {
  ios: "ClubLeonMobile/1.0 iOS",
  android: "ClubLeonMobile/1.0 Android",
} as const;

export const CLIENT_ORIGIN_HEADER = "X-Client-Origin";

export const APP_CLIENT_ORIGINS: ClientOrigin[] = ["ios_app", "android_app"];

export function isAppClientOrigin(
  origin: string | null | undefined,
): origin is Exclude<ClientOrigin, "web"> {
  return origin === "ios_app" || origin === "android_app";
}
