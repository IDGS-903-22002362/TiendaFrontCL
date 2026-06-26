import { ApiError } from "./client";

type FirebaseLikeError = Error & { code?: string };

const DEFAULT_FALLBACK =
  "Ocurrió un error inesperado. Intenta nuevamente en unos momentos.";

const TECHNICAL_MESSAGE_PATTERNS: RegExp[] = [
  /\bauth\/[a-z0-9-]+\b/i,
  /\bstripe\b/i,
  /\baplazo\b/i,
  /\bfirestore\b/i,
  /\bfirebase\b/i,
  /\bECONNREFUSED\b/,
  /\bETIMEDOUT\b/,
  /\bENOTFOUND\b/,
  /\bstack trace\b/i,
  /\bat\s+\S+\s+\(/i,
  /requires an index/i,
  /permission[- ]denied/i,
  /No se pudo conectar con la API \(/i,
  /sk_(live|test)_/i,
  /process\.env/i,
  /HTTP Error \d+/i,
  /Error HTTP \d+/i,
];

export function isTechnicalUserMessage(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) {
    return true;
  }

  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function sanitizeUserFacingMessage(
  message: string | null | undefined,
  fallback = DEFAULT_FALLBACK,
): string {
  if (!message || !message.trim()) {
    return fallback;
  }

  if (isTechnicalUserMessage(message)) {
    return fallback;
  }

  return message.trim();
}

function getFirebaseAuthCode(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const codeFromProperty = (error as FirebaseLikeError).code;
  if (codeFromProperty?.startsWith("auth/")) {
    return codeFromProperty;
  }

  const codeFromMessage = error.message.match(/auth\/[a-z-]+/)?.[0];
  return codeFromMessage ?? null;
}

function getFirebaseAuthMessage(
  code: string,
  rawMessage?: string,
): string | null {
  const normalizedMessage = (rawMessage || "").toLowerCase();

  if (
    code === "auth/operation-not-allowed" &&
    normalizedMessage.includes("code flow is not enabled for apple")
  ) {
    return "Apple Sign-In está habilitado, pero falta activar Code Flow en la configuración del proveedor Apple en Firebase/Identity Platform.";
  }

  switch (code) {
    case "auth/invalid-email":
      return "Correo electrónico inválido.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada. Contacta soporte.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/email-already-in-use":
    case "auth/email-already-exists":
      return "No fue posible completar el registro con este correo.";
    case "auth/weak-password":
    case "auth/invalid-password":
      return "La contraseña no cumple los requisitos mínimos.";
    case "auth/operation-not-allowed":
      return "El proveedor de inicio de sesión no está habilitado en Firebase. Activa Google/Apple en Authentication > Sign-in method y verifica el dominio autorizado.";
    case "auth/popup-closed-by-user":
      return "Se cerró la ventana de inicio de sesión antes de completar el acceso.";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana emergente de inicio de sesión. Permite popups e inténtalo de nuevo.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase Auth. Agrégalo en Authentication > Settings > Authorized domains.";
    case "auth/account-exists-with-different-credential":
      return "Ya existe una cuenta con ese correo usando otro método de acceso. Inicia sesión con el proveedor original y después vincula Apple.";
    case "auth/network-request-failed":
      return "No se pudo conectar con Firebase. Revisa tu conexión e inténtalo nuevamente.";
    case "auth/invalid-verification-code":
      return "El código de verificación no es válido.";
    case "auth/code-expired":
      return "El código de verificación expiró. Solicita uno nuevo.";
    default:
      return null;
  }
}

function getApiPayloadMessage(error: ApiError): string | null {
  const errors = error.payload?.errors;

  if (Array.isArray(errors) && errors.length > 0) {
    return errors
      .map(
        (item) => `${item.campo ?? "campo"}: ${item.mensaje ?? "inválido"}`,
      )
      .join(" | ");
  }

  if (
    error.payload?.error &&
    typeof error.payload.error === "object" &&
    typeof error.payload.error.message === "string"
  ) {
    return error.payload.error.message;
  }

  if (typeof error.payload?.message === "string" && error.payload.message) {
    return error.payload.message;
  }

  return error.message || null;
}

export function getCartQuantityUpdateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return getApiErrorMessage(error);
  }

  return getApiErrorMessage(error);
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const payloadMessage = getApiPayloadMessage(error);
    return sanitizeUserFacingMessage(payloadMessage, DEFAULT_FALLBACK);
  }

  if (error instanceof Error) {
    const firebaseAuthCode = getFirebaseAuthCode(error);
    if (firebaseAuthCode) {
      const firebaseMessage = getFirebaseAuthMessage(
        firebaseAuthCode,
        error.message,
      );
      if (firebaseMessage) {
        return firebaseMessage;
      }

      return DEFAULT_FALLBACK;
    }

    return sanitizeUserFacingMessage(error.message, DEFAULT_FALLBACK);
  }

  return DEFAULT_FALLBACK;
}
