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
      const firebaseMessage = getFirebaseAuthMessage(
        firebaseAuthCode,
        error.message,
      );
      if (firebaseMessage) {
        return firebaseMessage;
      }
    }

    return error.message;
  }

  return "Ocurrió un error inesperado";
}
