import type { AuthUsuario } from "@/lib/api/auth";
import { COOKIE_SESSION_TOKEN } from "@/lib/cookies/constants";

type MobileAppAuthPayload = {
  token?: string | null;
  firebaseIdToken?: string | null;
  uid?: string | null;
  user?: Partial<AuthUsuario> | null;
};

let lastNotifiedAuthFingerprint = "";

export function resetMobileAppAuthNotification() {
  lastNotifiedAuthFingerprint = "";
}

export function notifyMobileAppAuth(payload: MobileAppAuthPayload): boolean {
  if (typeof window === "undefined" || !window.ClubLeonBridge?.postMessage) {
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

  window.ClubLeonBridge.postMessage(
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
