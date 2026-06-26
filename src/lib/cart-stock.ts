import type { CartItem, CartItemStockStatus } from "@/lib/types";
import { ApiError } from "@/lib/api/client";

export type UnavailableCheckoutItem = {
  productId: string;
  productName: string;
  tallaId?: string;
  available: number;
  requested: number;
  reason: "out_of_stock" | "reserved_by_other" | "inactive";
};

function toUnavailableItem(input: unknown): UnavailableCheckoutItem | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const record = input as Record<string, unknown>;
  const productId = String(record.productId ?? "").trim();
  if (!productId) {
    return null;
  }
  const reason = record.reason;
  return {
    productId,
    productName: String(record.productName ?? "Producto").trim() || "Producto",
    tallaId:
      typeof record.tallaId === "string" && record.tallaId.trim()
        ? record.tallaId.trim()
        : undefined,
    available: Math.max(0, Math.floor(Number(record.available) || 0)),
    requested: Math.max(0, Math.floor(Number(record.requested) || 0)),
    reason:
      reason === "reserved_by_other" || reason === "inactive"
        ? reason
        : "out_of_stock",
  };
}

export function getUnavailableItemsFromError(
  error: unknown,
): UnavailableCheckoutItem[] {
  if (!(error instanceof ApiError) || !error.payload) {
    return [];
  }

  const details = error.payload.details;
  if (!details || typeof details !== "object") {
    return [];
  }

  const rawItems = (details as Record<string, unknown>).unavailableItems;
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map(toUnavailableItem)
    .filter((item): item is UnavailableCheckoutItem => item !== null);
}

export function getCartStockBadgeLabel(
  stockStatus?: CartItemStockStatus,
): string | null {
  switch (stockStatus) {
    case "out_of_stock":
      return "Agotado";
    case "temporarily_unavailable":
      return "Temporalmente no disponible";
    default:
      return null;
  }
}

export function cartHasUnpurchasableItems(items: CartItem[]): boolean {
  return items.some(
    (item) =>
      item.purchasable === false ||
      item.stockStatus === "out_of_stock" ||
      item.stockStatus === "temporarily_unavailable" ||
      (typeof item.disponible === "number" && item.disponible < item.quantity),
  );
}

export function formatUnavailableItemLine(
  item: UnavailableCheckoutItem,
): string {
  const talla = item.tallaId ? ` (talla ${item.tallaId})` : "";
  if (item.reason === "reserved_by_other") {
    return `${item.productName}${talla}: temporalmente reservado por otro comprador.`;
  }
  if (item.reason === "inactive") {
    return `${item.productName}${talla}: ya no está disponible.`;
  }
  return `${item.productName}${talla}: disponible ${item.available}, pediste ${item.requested}.`;
}
