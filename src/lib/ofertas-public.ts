import type { CartItem, Product } from "@/lib/types";
import { apiFetch, unwrapData } from "@/lib/api/client";

export type ProductOfferPricing = {
  productoId: string;
  precioOriginal: number;
  precioFinal: number;
  subtotalOriginal?: number;
  subtotalFinal?: number;
  ahorroTotal?: number;
  ofertaAplicadaId?: string | null;
  ofertaTitulo?: string | null;
};

export type CalcularOfertaItem = {
  productoId: string;
  cantidad: number;
  tallaId?: string;
};

export type CartItemOfferLine = {
  pricingOferta?: ProductOfferPricing;
  tieneOferta: boolean;
  precioOriginalUnitario: number;
  precioUnitario: number;
  subtotalOriginal: number;
  totalItem: number;
  offerLabel: string;
};

function getOfferPricingList(payload: unknown): ProductOfferPricing[] {
  const data = unwrapData<unknown>(payload);
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const candidates = [
    record.items,
    record.productos,
    record.resultados,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as ProductOfferPricing[];
    }
  }

  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    const nested =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : undefined;

    const nestedCandidates = nested
      ? [nested.items, nested.productos, nested.resultados]
      : [root.items, root.productos, root.resultados];

    for (const candidate of nestedCandidates) {
      if (Array.isArray(candidate)) {
        return candidate as ProductOfferPricing[];
      }
    }
  }

  return [];
}

const resolvedProductPricing = new Map<string, ProductOfferPricing>();
const inflightProductPricingBatches = new Map<
  string,
  Promise<Record<string, ProductOfferPricing>>
>();

function buildCatalogOfferPricingItems(
  products: Pick<Product, "id">[],
): CalcularOfertaItem[] {
  return products.map((product) => ({
    productoId: product.id,
    cantidad: 1,
  }));
}

function buildPricingBatchKey(items: CalcularOfertaItem[]): string {
  return [...items]
    .map(
      (item) =>
        `${item.productoId}:${item.cantidad}:${item.tallaId ?? ""}`,
    )
    .sort()
    .join("|");
}

function pickPricingFromCache(
  items: CalcularOfertaItem[],
): Record<string, ProductOfferPricing> {
  return items.reduce<Record<string, ProductOfferPricing>>((acc, item) => {
    const cached = resolvedProductPricing.get(item.productoId);

    if (cached) {
      acc[item.productoId] = cached;
    }

    return acc;
  }, {});
}

async function requestOfferPricingBatch(
  items: CalcularOfertaItem[],
): Promise<Record<string, ProductOfferPricing>> {
  if (!items.length) {
    return {};
  }

  try {
    const payload = await apiFetch<unknown>(
      "/api/ofertas/calcular-precios",
      {
        method: "POST",
        body: JSON.stringify({ items }),
      },
      typeof window !== "undefined" ? { local: true } : undefined,
    );

    const lista = getOfferPricingList(payload);

    return lista.reduce<Record<string, ProductOfferPricing>>((acc, item) => {
      if (item.productoId) {
        resolvedProductPricing.set(item.productoId, item);
        acc[item.productoId] = item;
      }

      return acc;
    }, {});
  } catch (error) {
    console.warn("Error calculando ofertas públicas", error);
    return {};
  }
}

export async function calcularPreciosOfertasPublicas(
  items: CalcularOfertaItem[],
): Promise<Record<string, ProductOfferPricing>> {
  if (!items.length) return {};

  const cached = pickPricingFromCache(items);
  const missingItems = items.filter(
    (item) => !resolvedProductPricing.has(item.productoId),
  );

  if (missingItems.length === 0) {
    return cached;
  }

  const batchKey = buildPricingBatchKey(missingItems);
  let inflight = inflightProductPricingBatches.get(batchKey);

  if (!inflight) {
    inflight = requestOfferPricingBatch(missingItems).finally(() => {
      inflightProductPricingBatches.delete(batchKey);
    });
    inflightProductPricingBatches.set(batchKey, inflight);
  }

  const fetched = await inflight;

  return {
    ...cached,
    ...fetched,
  };
}

export function applyCatalogOfferPricingToProduct(
  product: Product,
  offerPrice?: ProductOfferPricing,
): Product {
  if (!offerPrice) {
    return product;
  }

  const originalPrice = Number(offerPrice.precioOriginal || product.price || 0);
  const finalPrice = Number(offerPrice.precioFinal || 0);

  const hasOffer =
    Boolean(offerPrice.ofertaAplicadaId || offerPrice.ofertaTitulo) &&
    originalPrice > 0 &&
    finalPrice > 0 &&
    finalPrice < originalPrice;

  if (!hasOffer) {
    return product;
  }

  return {
    ...product,
    price: originalPrice,
    salePrice: finalPrice,
  };
}

export function applyCatalogOfferPricingToProducts(
  products: Product[],
  offerPrices: Record<string, ProductOfferPricing>,
): Product[] {
  return products.map((product) =>
    applyCatalogOfferPricingToProduct(product, offerPrices[product.id]),
  );
}

export async function fetchCatalogOfferPricingForProducts(
  products: Product[],
): Promise<{
  products: Product[];
  pricing: Record<string, ProductOfferPricing>;
}> {
  if (products.length === 0) {
    return { products, pricing: {} };
  }

  const pricing = await calcularPreciosOfertasPublicas(
    buildCatalogOfferPricingItems(products),
  );

  return {
    products: applyCatalogOfferPricingToProducts(products, pricing),
    pricing,
  };
}

export function buildCartOfferPricingItems(
  items: Pick<CartItem, "id" | "quantity" | "tallaId" | "size">[],
): CalcularOfertaItem[] {
  return items.map((item) => {
    const tallaId = item.tallaId ?? item.size;

    return {
      productoId: item.id,
      cantidad: item.quantity,
      ...(tallaId ? { tallaId } : {}),
    };
  });
}

export function getCartItemOfferLine(
  item: Pick<CartItem, "id" | "price" | "quantity">,
  pricingOfertas: Record<string, ProductOfferPricing>,
): CartItemOfferLine {
  const pricingOferta = pricingOfertas[item.id];
  const quantity = Math.max(Number(item.quantity || 1), 1);

  const precioOriginalUnitario = Number(
    pricingOferta?.precioOriginal ?? item.price ?? 0,
  );
  const precioFinalUnitario = Number(pricingOferta?.precioFinal ?? 0);

  const subtotalOriginal = Number(
    pricingOferta?.subtotalOriginal ?? precioOriginalUnitario * quantity,
  );
  const subtotalFinal = Number(
    pricingOferta?.subtotalFinal ?? precioFinalUnitario * quantity,
  );

  const tieneOferta =
    subtotalFinal > 0 &&
    subtotalFinal < subtotalOriginal &&
    Boolean(
      pricingOferta?.ofertaAplicadaId ||
        pricingOferta?.ofertaTitulo ||
        (precioFinalUnitario > 0 && precioFinalUnitario < precioOriginalUnitario),
    );

  const totalItem = tieneOferta ? subtotalFinal : item.price * quantity;
  const precioUnitario = totalItem / quantity;

  return {
    pricingOferta,
    tieneOferta,
    precioOriginalUnitario,
    precioUnitario,
    subtotalOriginal,
    totalItem,
    offerLabel: pricingOferta?.ofertaTitulo || "Oferta aplicada",
  };
}

export function hasValidSalePrice(
  product: Pick<Product, "price" | "salePrice">,
): boolean {
  return (
    typeof product.salePrice === "number" &&
    product.salePrice > 0 &&
    product.salePrice < product.price
  );
}

export function mergeProductPricing(current: Product, incoming: Product): Product {
  const currentHasSale = hasValidSalePrice(current);
  const incomingHasSale = hasValidSalePrice(incoming);

  if (currentHasSale && !incomingHasSale) {
    return {
      ...incoming,
      price: current.price,
      salePrice: current.salePrice,
      tags: incoming.tags.includes("sale")
        ? incoming.tags
        : current.tags.includes("sale")
          ? current.tags
          : incoming.tags,
    };
  }

  return incoming;
}

export function hasActiveOfferFromPricing(
  product: Pick<Product, "price">,
  pricing?: ProductOfferPricing | null,
): boolean {
  if (!pricing) {
    return false;
  }

  const precioOriginal = Number(pricing.precioOriginal || product.price || 0);
  const precioFinal = Number(pricing.precioFinal || 0);

  return (
    Boolean(pricing.ofertaAplicadaId || pricing.ofertaTitulo) &&
    precioFinal > 0 &&
    precioFinal < precioOriginal
  );
}

export function getOfferDiscountPercent(
  product: Pick<Product, "price" | "salePrice">,
  pricing?: ProductOfferPricing | null,
): number | null {
  if (hasActiveOfferFromPricing(product, pricing)) {
    const precioOriginal = Number(pricing!.precioOriginal || product.price || 0);
    const precioFinal = Number(pricing!.precioFinal || 0);

    if (precioOriginal > 0 && precioFinal > 0 && precioFinal < precioOriginal) {
      return Math.round(((precioOriginal - precioFinal) / precioOriginal) * 100);
    }
  }

  const originalPrice = Number(product.price || 0);
  const salePrice = Number(product.salePrice || 0);

  if (originalPrice > 0 && salePrice > 0 && salePrice < originalPrice) {
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  }

  return null;
}

export function applyOfferPricingToProduct(
  product: Product,
  pricing?: ProductOfferPricing | null,
): Product {
  if (!hasActiveOfferFromPricing(product, pricing)) {
    return product;
  }

  const precioOriginal = Number(pricing!.precioOriginal || product.price || 0);
  const precioFinal = Number(pricing!.precioFinal || 0);
  const tags = product.tags.includes("sale")
    ? product.tags
    : ([...product.tags, "sale"] as Product["tags"]);

  return {
    ...product,
    price: precioOriginal,
    salePrice: precioFinal,
    tags,
  };
}

export async function enrichProductWithOfferPricing(
  product: Product,
  tallaId?: string,
): Promise<Product> {
  if (!product.id) {
    return product;
  }

  const precios = await calcularPreciosOfertasPublicas([
    {
      productoId: product.id,
      cantidad: 1,
      ...(tallaId ? { tallaId } : {}),
    },
  ]);

  return applyOfferPricingToProduct(product, precios[product.id]);
}

export async function enrichProductsWithOfferPricing(
  products: Product[],
): Promise<Product[]> {
  if (products.length === 0) {
    return products;
  }

  const precios = await calcularPreciosOfertasPublicas(
    products.map((product) => ({
      productoId: product.id,
      cantidad: 1,
    })),
  );

  return products.map((product) =>
    applyOfferPricingToProduct(product, precios[product.id]),
  );
}
