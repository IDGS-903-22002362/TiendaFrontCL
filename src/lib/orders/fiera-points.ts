import type { Orden, PaymentComposition } from "@/lib/types";

export function getOrderPaymentComposition(
  order: Pick<Orden, "paymentComposition">,
): PaymentComposition | undefined {
  const composition = order.paymentComposition;
  if (!composition || composition.pointsUsed <= 0) {
    return undefined;
  }
  return composition;
}

export function hasFieraPointsRedemption(
  order: Pick<Orden, "paymentComposition">,
): boolean {
  return Boolean(getOrderPaymentComposition(order));
}

export function getOrderCashPaidAmount(order: Pick<Orden, "total" | "paymentComposition">): number {
  const composition = getOrderPaymentComposition(order);
  if (composition) {
    return composition.providerAmountMinor / 100;
  }
  return order.total;
}

export function getOrderMerchandiseTotal(
  order: Pick<Orden, "total" | "grossTotal" | "subtotal" | "paymentComposition">,
): number {
  const composition = getOrderPaymentComposition(order);
  if (composition) {
    return composition.grossTotalMinor / 100;
  }
  return order.grossTotal ?? order.total;
}

export function getOrderDisplayTotal(
  order: Pick<Orden, "total" | "grossTotal" | "paymentComposition">,
): number {
  return getOrderMerchandiseTotal(order);
}

export function getOrderPaymentMethodLabel(
  order: Pick<Orden, "metodoPago" | "total" | "paymentComposition">,
): string {
  const composition = getOrderPaymentComposition(order);
  if (!composition) {
    if (order.metodoPago === "FIERA_PUNTOS") {
      return "FieraPuntos";
    }
    return "Tarjeta";
  }
  if (composition.providerAmountMinor <= 0) {
    return "FieraPuntos (cubrió el total)";
  }
  return "Tarjeta + FieraPuntos";
}

export function getFieraPointsRedemptionDetail(
  order: Pick<Orden, "paymentComposition">,
): string | null {
  const composition = getOrderPaymentComposition(order);
  if (!composition) {
    return null;
  }
  const points = composition.pointsUsed.toLocaleString("es-MX");
  const discount = composition.pointsDiscountMinor / 100;
  const pointValue = composition.pointValueMinor / 100;
  const cash = composition.providerAmountMinor / 100;
  if (cash <= 0) {
    return `${points} pts canjeados ($${discount.toFixed(2)} MXN, $${pointValue.toFixed(2)} c/u). Cubrió el total; no se cobró con tarjeta.`;
  }
  return `${points} pts canjeados ($${discount.toFixed(2)} MXN, $${pointValue.toFixed(2)} c/u). El restante $${cash.toFixed(2)} se pagó con tarjeta.`;
}

export function getFieraPointsEarnNote(
  order: Pick<Orden, "total" | "paymentComposition">,
): string | null {
  const composition = getOrderPaymentComposition(order);
  if (!composition) {
    return null;
  }
  const cash = getOrderCashPaidAmount(order);
  if (cash <= 0) {
    return "Esta compra no genera FieraPuntos adicionales porque se pagó por completo con puntos.";
  }
  return `Los FieraPuntos se acumulan solo sobre lo pagado con tarjeta ($${cash.toFixed(2)}).`;
}
