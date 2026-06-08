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

export function getAplazoPaymentErrorMessage(
  error: unknown,
  context: "online" | "in_store" | "refund" = "online",
): string {
  if (!(error instanceof ApiError)) {
    return getApiErrorMessage(error);
  }

  switch (error.code) {
    case "PAYMENT_VALIDATION_ERROR":
      return getApiErrorMessage(error);
    case "PAYMENT_AMOUNT_MISMATCH":
      return "El total validado por backend cambió. Actualiza el checkout y vuelve a intentarlo.";
    case "PAYMENT_PROVIDER_ERROR":
      return context === "refund"
        ? "Aplazo no pudo procesar o consultar el reembolso en este momento. Inténtalo nuevamente."
        : context === "in_store"
        ? "Aplazo no pudo generar el enlace o QR de cobro. Revisa los datos e inténtalo de nuevo."
        : "No fue posible iniciar el pago con Aplazo. Revisa los datos e inténtalo de nuevo.";
    case "PAYMENT_PROVIDER_TIMEOUT":
      return context === "refund"
        ? "Aplazo tardó demasiado en responder al reembolso. Conserva el intento y vuelve a consultar el estado."
        : "Aplazo tardó demasiado en responder. Conserva el intento y sigue consultando el estado antes de repetir la operación.";
    case "PAYMENT_AUTH_REQUIRED":
      return "Tu sesión expiró. Inicia sesión nuevamente para continuar con Aplazo.";
    case "PAYMENT_FORBIDDEN":
      return context === "refund"
        ? "Tu usuario no tiene permisos para consultar o generar refunds Aplazo."
        : context === "in_store"
        ? "Tu usuario no tiene permisos para operar Aplazo en tienda."
        : "No tienes permiso para operar este intento de pago.";
    case "PAYMENT_ATTEMPT_NOT_FOUND":
      return context === "refund"
        ? "No se encontró el paymentAttemptId indicado para consultar el refund."
        : "No se encontró el intento de pago indicado.";
    default:
      return getApiErrorMessage(error);
  }
}

export function getAplazoAdminErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return getApiErrorMessage(error);
  }

  switch (error.code) {
    case "REFUND_REQUEST_ALREADY_OPEN":
      return "Ya hay una solicitud de devolución en revisión para este pago.";
    case "REFUND_REQUEST_NOT_APPROVABLE":
      return "Esta solicitud no puede aprobarse en su estado actual.";
    case "REFUND_REQUEST_NOT_REJECTABLE":
      return "Esta solicitud ya no puede rechazarse.";
    case "PAYMENT_NOT_PAID_USE_CANCEL":
      return "Este pago aún no está confirmado. Debe cancelarse, no reembolsarse.";
    case "REFUND_AMOUNT_INVALID":
      return "El monto del reembolso debe ser mayor a 0.";
    case "REFUND_AMOUNT_EXCEEDS_AVAILABLE":
      return "El monto excede el saldo disponible para reembolso.";
    case "REFUND_ALREADY_PROCESSING":
      return "Ya hay un reembolso en proceso para este pago.";
    case "PAYMENT_ALREADY_REFUNDED":
      return "Este pago ya fue reembolsado por completo.";
    case "APLAZO_REFUND_FAILED":
      return "Aplazo no pudo procesar el reembolso. Intenta más tarde o revisa soporte.";
    case "PAYMENT_CANCEL_NOT_ALLOWED":
      return "Este pago no puede cancelarse. Si ya está pagado, usa reembolso.";
    case "PAYMENT_REFUND_UNSUPPORTED":
      return "La consulta de reembolsos no está disponible para este intento.";
    case "PAYMENT_ATTEMPT_NOT_FOUND":
      return "No se encontró el intento de pago indicado.";
    case "PAYMENT_VALIDATION_ERROR":
      return getApiErrorMessage(error);
    case "PAYMENT_FORBIDDEN":
      return "No tienes permisos para realizar esta operación.";
    default:
      return "No fue posible completar la operación de Aplazo.";
  }
}

export function getAplazoRefundRequestErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return getApiErrorMessage(error);
  }

  switch (error.code) {
    case "REFUND_REQUEST_ALREADY_OPEN":
      return "Ya hay una solicitud de devolución en revisión para este pago.";
    case "PAYMENT_FORBIDDEN":
      return "No tienes permisos para solicitar la devolución de esta orden.";
    case "PAYMENT_ATTEMPT_NOT_FOUND":
      return "No encontramos un pago Aplazo para esta orden.";
    case "PAYMENT_NOT_PAID_USE_CANCEL":
      return "Este pago aún no está confirmado. No se puede solicitar devolución.";
    case "PAYMENT_ALREADY_REFUNDED":
      return "Este pago ya fue reembolsado por completo.";
    case "PAYMENT_REFUND_UNSUPPORTED":
      return "Los reembolsos Aplazo no están habilitados en este ambiente.";
    case "PAYMENT_VALIDATION_ERROR":
      return getApiErrorMessage(error);
    default:
      return "No fue posible completar la operación de Aplazo.";
  }
}
