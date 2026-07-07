import type { AuthUsuario } from "@/lib/api/auth";
import { COOKIE_SESSION_TOKEN } from "@/lib/cookies/constants";

type MobileAppAuthPayload = {
  token?: string | null;
  firebaseIdToken?: string | null;
  uid?: string | null;
  user?: Partial<AuthUsuario> | null;
};

export function notifyMobileAppAuth(payload: MobileAppAuthPayload) {
  if (typeof window === "undefined" || !window.ClubLeonBridge?.postMessage) {
    return;
  }

  const backendToken = payload.token?.trim();
  const firebaseIdToken = payload.firebaseIdToken?.trim();
  const resolvedToken =
    backendToken && backendToken !== COOKIE_SESSION_TOKEN
      ? backendToken
      : firebaseIdToken;

  if (!resolvedToken) {
    return;
  }

  const uid =
    payload.uid?.trim() ||
    payload.user?.uid?.trim() ||
    payload.user?.id?.trim() ||
    "";

  window.ClubLeonBridge.postMessage(
    JSON.stringify({
      type: "CLUBLEON_AUTH_SUCCESS",
      token: resolvedToken,
      uid,
    }),
  );
}
