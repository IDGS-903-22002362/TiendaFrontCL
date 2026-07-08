import type { AuthUsuario } from "@/lib/api/auth";
import { COOKIE_SESSION_TOKEN } from "@/lib/cookies/constants";
import { resolveClientPrivacyContextFromBrowser } from "@/lib/privacy/client-privacy-browser";

export function isEmbeddedMobileApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return resolveClientPrivacyContextFromBrowser().isEmbeddedApp;
}

type MobileAppAuthPayload = {
  token?: string | null;
  firebaseIdToken?: string | null;
  uid?: string | null;
  user?: Partial<AuthUsuario> | null;
};

let lastNotifiedAuthFingerprint = "";

function getMobileAuthBridge() {
  if (typeof window === "undefined" || !isEmbeddedMobileApp()) {
    return null;
  }

  return window.ClubLeonBridge?.postMessage ? window.ClubLeonBridge : null;
}

export function resetMobileAppAuthNotification() {
  lastNotifiedAuthFingerprint = "";
}

export function notifyMobileAppLogout(): boolean {
  const bridge = getMobileAuthBridge();
  if (!bridge) {
    return false;
  }

  bridge.postMessage(
    JSON.stringify({
      type: "CLUBLEON_LOGOUT",
    }),
  );

  resetMobileAppAuthNotification();
  return true;
}

export function notifyMobileAppAuth(payload: MobileAppAuthPayload): boolean {
  const bridge = getMobileAuthBridge();
  if (!bridge) {
    return false;
  }

  const backendToken = payload.token?.trim();
  const firebaseIdToken = payload.firebaseIdToken?.trim();
  const resolvedToken =
    backendToken && backendToken !== COOKIE_SESSION_TOKEN
      ? backendToken
      : firebaseIdToken;

  const uid =
    payload.uid?.trim() ||
    payload.user?.uid?.trim() ||
    payload.user?.id?.trim() ||
    "";

  if (!resolvedToken && !uid) {
    return false;
  }

  const fingerprint = `${resolvedToken ?? ""}|${uid}`;
  if (fingerprint === lastNotifiedAuthFingerprint) {
    return true;
  }

  bridge.postMessage(
    JSON.stringify({
      type: "CLUBLEON_AUTH_SUCCESS",
      token: resolvedToken ?? "",
      uid,
      webAuthenticated: true,
    }),
  );

  lastNotifiedAuthFingerprint = fingerprint;
  return true;
}
