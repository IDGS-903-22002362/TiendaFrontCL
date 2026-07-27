import { ApiError } from "@/lib/api/client";

/** Intentos permitidos por código, alineado con el backend. */
export const OTP_TOTAL_ATTEMPTS = 3;

/**
 * El backend responde 401 cuando el código es incorrecto, por lo que apiFetch lanza
 * ApiError y los intentos restantes solo viajan dentro del payload del error.
 */
export function getRemainingOtpAttempts(error: unknown): number | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }

  const remaining = error.payload?.remainingAttempts;
  return typeof remaining === "number" && Number.isFinite(remaining)
    ? remaining
    : undefined;
}

/**
 * true cuando el código pendiente ya no admite reintentos y el usuario debe pedir
 * uno nuevo. Los errores sin `remainingAttempts` (red, 429, 500) no cierran el
 * flujo: el usuario sigue en la pantalla del código.
 */
export function requiresNewOtpCode(error: unknown): boolean {
  const remaining = getRemainingOtpAttempts(error);
  return remaining !== undefined && remaining <= 0;
}
