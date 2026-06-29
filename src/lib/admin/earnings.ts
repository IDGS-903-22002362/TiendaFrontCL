import { isOrderPaid } from "@/lib/orders/status";
import type { Orden } from "@/lib/types";

type MexicoDateParts = {
  year: string;
  month: string;
  day: string;
};

function getMexicoDateParts(date: Date = new Date()): MexicoDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function toMexicoIso(
  year: string,
  month: string,
  day: string,
  endOfDay = false,
): string {
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  // Backend valida ISO 8601 con sufijo Z (z.string().datetime() sin offset).
  const mexicoLocal = `${year}-${month}-${day}T${time}-06:00`;
  return new Date(mexicoLocal).toISOString();
}

export function getMexicoDayRange(): { fechaDesde: string; fechaHasta: string } {
  const { year, month, day } = getMexicoDateParts();
  return {
    fechaDesde: toMexicoIso(year, month, day, false),
    fechaHasta: toMexicoIso(year, month, day, true),
  };
}

export function getMexicoMonthRange(): { fechaDesde: string; fechaHasta: string } {
  const { year, month, day } = getMexicoDateParts();
  return {
    fechaDesde: toMexicoIso(year, month, "01", false),
    fechaHasta: toMexicoIso(year, month, day, true),
  };
}

export function isSameMexicoDay(isoDate: string | undefined, reference = new Date()) {
  if (!isoDate) return false;

  const orderDate = new Date(isoDate);
  if (Number.isNaN(orderDate.getTime())) return false;

  const orderParts = getMexicoDateParts(orderDate);
  const referenceParts = getMexicoDateParts(reference);

  return (
    orderParts.year === referenceParts.year &&
    orderParts.month === referenceParts.month &&
    orderParts.day === referenceParts.day
  );
}

export function isCountablePaidOrder(order: Orden): boolean {
  if (!isOrderPaid(order)) return false;
  if (order.estado === "CANCELADA") return false;

  const paymentStatus = String(order.paymentStatus || "").toUpperCase();
  if (paymentStatus === "REEMBOLSADO") return false;

  return true;
}

export function sumPaidOrderTotals(orders: Orden[]): number {
  return orders
    .filter(isCountablePaidOrder)
    .reduce((sum, order) => sum + (order.total ?? 0), 0);
}

export type EarningsSummary = {
  dailyTotal: number;
  monthlyTotal: number;
  dailyOrdersCount: number;
  monthlyOrdersCount: number;
};

export function calculateEarningsSummary(orders: Orden[]): EarningsSummary {
  const paidOrders = orders.filter(isCountablePaidOrder);

  const dailyOrders = paidOrders.filter((order) =>
    isSameMexicoDay(order.createdAt),
  );

  return {
    dailyTotal: sumPaidOrderTotals(dailyOrders),
    monthlyTotal: sumPaidOrderTotals(paidOrders),
    dailyOrdersCount: dailyOrders.length,
    monthlyOrdersCount: paidOrders.length,
  };
}