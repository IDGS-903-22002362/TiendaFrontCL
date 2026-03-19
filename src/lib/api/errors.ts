import { ApiError } from "./client";

type FirebaseLikeError = Error & { code?: string };

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

function getFirebaseAuthMessage(code: string): string | null {
  switch (code) {
    case "auth/operation-not-allowed":
      return "Login con Google no habilitado en Firebase. Activa Google en Authentication > Sign-in method y verifica el dominio autorizado.";
    case "auth/popup-closed-by-user":
      return "Se cerró la ventana de Google antes de completar el inicio de sesión.";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana emergente de Google. Permite popups e inténtalo de nuevo.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase Auth. Agrégalo en Authentication > Settings > Authorized domains.";
    case "auth/network-request-failed":
      return "No se pudo conectar con Firebase. Revisa tu conexión e inténtalo nuevamente.";
    default:
      return null;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
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

    return error.message;
  }

  if (error instanceof Error) {
    const firebaseAuthCode = getFirebaseAuthCode(error);
    if (firebaseAuthCode) {
      const firebaseMessage = getFirebaseAuthMessage(firebaseAuthCode);
      if (firebaseMessage) {
        return firebaseMessage;
      }
    }

    return error.message;
  }

  return "Ocurrió un error inesperado";
}
