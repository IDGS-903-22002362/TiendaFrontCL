import type { AuthUsuario } from "@/lib/api/auth";
import { COOKIE_SESSION_TOKEN } from "@/lib/cookies/constants";
import { resolveClientPrivacyContextFromBrowser } from "@/lib/privacy/client-privacy-browser";

type MobileAppAuthPayload = {
  token?: string | null;
  firebaseIdToken?: string | null;
  uid?: string | null;
  user?: Partial<AuthUsuario> | null;
};

type MobileAppBridge = {
  postMessage: (message: string) => void;
};

let lastNotifiedAuthFingerprint = "";

function hasNativeMobileBridge(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    window.ClubLeonBridge?.postMessage ||
      window.ReactNativeWebView?.postMessage ||
      window.webkit?.messageHandlers?.ClubLeonBridge?.postMessage,
  );
}

function postToNativeBridge(message: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const bridges: Array<MobileAppBridge | undefined> = [
    window.ClubLeonBridge,
    window.ReactNativeWebView,
    window.webkit?.messageHandlers?.ClubLeonBridge,
  ];

  for (const bridge of bridges) {
    if (!bridge?.postMessage) {
      continue;
    }

    try {
      bridge.postMessage(message);
      return true;
    } catch {
      // Try the next bridge shape; native WebViews differ by platform.
    }
  }

  return false;
}

function canNotifyMobileApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return isEmbeddedMobileApp() || hasNativeMobileBridge();
}

function postMobileAppMessage(payload: unknown): boolean {
  if (!canNotifyMobileApp()) {
    return false;
  }

  return postToNativeBridge(JSON.stringify(payload));
}

export function isEmbeddedMobileApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    resolveClientPrivacyContextFromBrowser().isEmbeddedApp ||
    hasNativeMobileBridge()
  );
}

export function resetMobileAppAuthNotification() {
  lastNotifiedAuthFingerprint = "";
}

export function notifyMobileAppLogout(): boolean {
  const notified = postMobileAppMessage({
    type: "CLUBLEON_LOGOUT",
  });

  if (!notified) {
    return false;
  }

  resetMobileAppAuthNotification();
  return true;
}

export function notifyMobileAppAuth(payload: MobileAppAuthPayload): boolean {
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

  const notified = postMobileAppMessage({
    type: "CLUBLEON_AUTH_SUCCESS",
    token: resolvedToken ?? "",
    uid,
    webAuthenticated: true,
    user: payload.user
      ? {
          uid: payload.user.uid ?? payload.user.id,
          email: payload.user.email,
          nombre: payload.user.nombre,
          perfilCompleto: payload.user.perfilCompleto,
          rol: payload.user.rol,
        }
      : null,
  });

  if (!notified) {
    return false;
  }

  lastNotifiedAuthFingerprint = fingerprint;
  return true;
}
