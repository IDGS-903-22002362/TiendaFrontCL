import type { CartItem } from "@/lib/types";

export const PERSONALIZATION_FEE_MXN = 300;

export type CartPersonalizationDisplay = {
  name: string;
  number: string;
  mode: "player" | "custom";
  feePerUnit: number;
  note: string;
};

export function resolveCartPersonalizationFee(
  item: Pick<CartItem, "personalizationFee" | "personalizacion">,
): number {
  if (typeof item.personalizationFee === "number" && item.personalizationFee >= 0) {
    return item.personalizationFee;
  }

  if (item.personalizacion) {
    return PERSONALIZATION_FEE_MXN;
  }

  return 0;
}

export function getCartPersonalizationDisplay(
  item: Pick<CartItem, "personalizacion" | "personalizationFee">,
): CartPersonalizationDisplay | null {
  if (!item.personalizacion) {
    return null;
  }

  return {
    name: item.personalizacion.nombre,
    number: item.personalizacion.numero,
    mode: item.personalizacion.mode,
    feePerUnit: resolveCartPersonalizationFee(item),
    note: "Producto personalizado. No aplica para devoluciones.",
  };
}

export function getCartPersonalizationTotal(
  items: Pick<CartItem, "personalizacion" | "personalizationFee" | "quantity">[],
): number {
  return items.reduce((total, item) => {
    const fee = resolveCartPersonalizationFee(item);
    if (fee <= 0) {
      return total;
    }

    return total + fee * Math.max(item.quantity, 1);
  }, 0);
}