import { getClientOriginForRequests } from "@/lib/privacy/client-origin-store";
import { shouldSendAdvertisingEvent } from "@/lib/privacy/tracking-policy";
import { WEB_PRIVACY_CONTEXT } from "@/lib/privacy/types";

type TrackEventInput = {
  name: string;
  properties?: Record<string, unknown>;
};

function getPrivacyContextForTracking() {
  if (typeof window === "undefined") {
    return WEB_PRIVACY_CONTEXT;
  }

  return {
    ...WEB_PRIVACY_CONTEXT,
    origin: getClientOriginForRequests(),
    isEmbeddedApp:
      getClientOriginForRequests() === "ios_app" ||
      getClientOriginForRequests() === "android_app",
    trackingDisabled:
      getClientOriginForRequests() === "ios_app" ||
      getClientOriginForRequests() === "android_app",
  };
}

/**
 * App Store privacy requirement:
 * Advertising and cross-site tracking must remain disabled when the
 * storefront is embedded in the iOS or Android application.
 */
export function trackEvent(_input: TrackEventInput): void {
  const context = getPrivacyContextForTracking();

  if (!shouldSendAdvertisingEvent(context)) {
    return;
  }

  // No third-party analytics SDKs are wired here today.
}
