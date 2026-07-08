import type { Orden } from "@/lib/types";

export function formatOrderDisplayId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return "-";
  return `#${trimmed.slice(0, 8).toUpperCase()}`;
}

function readPickupContactName(
  contact: Orden["pickupContact"] | Record<string, unknown> | undefined,
): string | null {
  if (!contact || typeof contact !== "object") return null;

  const record = contact as Record<string, unknown>;
  const name =
    (typeof record.name === "string" ? record.name.trim() : "") ||
    (typeof record.nombre === "string" ? record.nombre.trim() : "");

  return name || null;
}

export function isPickupOrder(order: Orden): boolean {
  if (order.fulfillmentMethod === "PICKUP") return true;
  const shipping = order.shipping as { method?: string; shippingMethod?: string } | undefined;
  const shippingMethod =
    shipping?.method?.trim().toUpperCase() ||
    shipping?.shippingMethod?.trim().toUpperCase();
  return shippingMethod === "PICKUP";
}

export function getOrderContactName(order: Orden): string | null {
  if (isPickupOrder(order)) {
    return readPickupContactName(order.pickupContact);
  }
  return (
    order.direccionEnvio?.nombre?.trim() ||
    order.direccionEnvio?.nombreCompleto?.trim() ||
    null
  );
}

export function getOrderContactLabel(order: Orden): string {
  return isPickupOrder(order) ? "Recoge" : "Cliente";
}

export function matchesOrderSearch(order: Orden, rawTerm: string): boolean {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return true;

  const id = order.id.toLowerCase();
  const displayId = formatOrderDisplayId(order.id).toLowerCase();
  const name = (getOrderContactName(order) ?? "").toLowerCase();
  const usuarioId = (order.usuarioId ?? "").toLowerCase();
  const termWithoutHash = term.replace("#", "");

  return (
    id.includes(term) ||
    displayId.includes(term) ||
    displayId.replace("#", "").includes(termWithoutHash) ||
    usuarioId.includes(term) ||
    name.includes(term)
  );
}
