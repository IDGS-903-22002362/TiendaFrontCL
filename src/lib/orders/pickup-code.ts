import type { Orden } from "@/lib/types";

type PickupQrPayload = {
  type?: string;
  orderId?: string;
  code?: string;
};

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  const padded = padding ? `${base64}${"=".repeat(4 - padding)}` : base64;
  return atob(padded);
}

export function getPickupCodeFromOrder(
  order: Pick<Orden, "pickupQrPayload">,
): string | null {
  const payload = order.pickupQrPayload?.trim();
  if (!payload) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(payload);
    const parsed = JSON.parse(decoded) as PickupQrPayload;
    if (parsed.type !== "pickup_order") {
      return null;
    }
    const code = typeof parsed.code === "string" ? parsed.code.trim() : "";
    return code.length > 0 ? code : null;
  } catch {
    return null;
  }
}