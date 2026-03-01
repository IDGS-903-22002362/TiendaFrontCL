import { ApiError } from "./client";

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

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado";
}
