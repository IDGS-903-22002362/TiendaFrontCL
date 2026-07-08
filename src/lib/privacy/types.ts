export type ClientOrigin = "web" | "ios_app" | "android_app";

export interface ClientPrivacyContext {
  origin: ClientOrigin;
  isEmbeddedApp: boolean;
  trackingDisabled: boolean;
}

export const WEB_PRIVACY_CONTEXT: ClientPrivacyContext = {
  origin: "web",
  isEmbeddedApp: false,
  trackingDisabled: false,
};
