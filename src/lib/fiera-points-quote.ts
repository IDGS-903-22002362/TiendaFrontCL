import type { FieraPointsQuote, FieraPointsRequest } from "@/lib/types";

export function getCheckoutPayableTotal(
  grossTotal: number,
  quote: FieraPointsQuote | null | undefined,
  request: FieraPointsRequest,
): number {
  if (request.mode === "NONE" || !quote?.canRedeem) {
    return grossTotal;
  }
  return quote.providerAmount;
}

export function canSelectFieraPoints(
  quote: FieraPointsQuote | null | undefined,
  availablePoints: number,
): boolean {
  if (availablePoints <= 0) {
    return false;
  }
  if (!quote) {
    return availablePoints > 0;
  }
  if (quote.reason === "DISABLED" || quote.reason === "INVALID_CONFIG") {
    return false;
  }
  if (
    quote.minimumRedemptionPoints > 0 &&
    availablePoints < quote.minimumRedemptionPoints
  ) {
    return false;
  }
  return true;
}

export function getFieraPointsQuoteMessage(
  quote: FieraPointsQuote | null | undefined,
): string | null {
  if (!quote) {
    return null;
  }
  switch (quote.reason) {
    case "MIN_NOT_MET":
      return `El canje mínimo es de ${quote.minimumRedemptionPoints.toLocaleString("es-MX")} FieraPuntos.`;
    case "INSUFFICIENT":
      return "No tienes FieraPuntos suficientes para esa cantidad.";
    case "EXCEEDS_TOTAL":
      return "La cantidad de FieraPuntos excede el total de la compra.";
    case "DISABLED":
      return "El canje de FieraPuntos no está disponible en este momento.";
    case "INVALID_CONFIG":
      return "El canje de FieraPuntos no está configurado correctamente.";
    case "INVALID_AMOUNT":
      return "Indica una cantidad válida de FieraPuntos.";
    default:
      return null;
  }
}
