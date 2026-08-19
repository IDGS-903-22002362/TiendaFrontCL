import type { Product } from "@/lib/types";

/** Normaliza SKU/clave para comparar escaneos de pistola (case-insensitive). */
export function normalizePosSku(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Elige el producto exacto por SKU (`clave`) o id.
 * No auto-agrega coincidencias parciales: evita sumar el producto equivocado.
 */
export function pickProductBySku(
  products: readonly Product[],
  rawSku: string,
): Product | null {
  const sku = normalizePosSku(rawSku);
  if (!sku) return null;

  const byClave = products.find(
    (product) =>
      product.activo !== false &&
      normalizePosSku(product.clave ?? "") === sku,
  );
  if (byClave) return byClave;

  const byId = products.find(
    (product) =>
      product.activo !== false && normalizePosSku(product.id) === sku,
  );
  return byId ?? null;
}

/**
 * Heurística de pistola USB (keyboard wedge): ráfaga rápida de teclas + Enter.
 * Umbral típico: < 50 ms entre caracteres; Enter cierra el código.
 */
export const POS_SCANNER_INTER_KEY_MS = 50;
export const POS_SCANNER_MIN_LENGTH = 3;
