import type {
  CatalogQuery,
  CatalogResponse,
  CatalogProductCard,
  CatalogSort,
  Category,
  Product,
  ProductExtraDetail,
  ProductFedexShipping,
  ProductRatingEligibility,
  ProductRatingSummary,
  ProductSizeStock,
  ProductStockSnapshot,
  ProductUserRating,
} from "@/lib/types";
import { apiFetch, unwrapData } from "./client";
import { enrichProductWithOfferPricing } from "@/lib/ofertas-public";

type UnknownRecord = Record<string, unknown>;

function getProductReadOptions() {
  return typeof window !== "undefined" ? { local: true as const } : undefined;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return [value].filter(Boolean);
  }

  return [];
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeProductsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const unwrapped = unwrapData<unknown>(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (unwrapped && typeof unwrapped === "object") {
    const candidate = unwrapped as UnknownRecord;
    const listKeys = [
      "productos",
      "products",
      "items",
      "resultados",
      "results",
      "rows",
    ];

    for (const key of listKeys) {
      if (Array.isArray(candidate[key])) {
        return candidate[key] as unknown[];
      }
    }
  }

  return [];
}

function normalizeCategoriesArray(payload: unknown): unknown[] {
  return normalizeProductsArray(payload);
}

function getTimestampMillis(value: unknown): number | null {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return value > 9999999999 ? value : value * 1000;
  }

  if (typeof value === "string") {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }

    const parsedNumber = Number(value);
    if (Number.isFinite(parsedNumber)) {
      return parsedNumber > 9999999999 ? parsedNumber : parsedNumber * 1000;
    }
  }

  if (typeof value === "object") {
    const record = value as UnknownRecord;
    const seconds = Number(record._seconds ?? record.seconds);
    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }
  }

  return null;
}

function mapProductTagList(
  product: UnknownRecord,
  price: number,
  salePrice?: number,
) {
  const rawTags = toStringArray(product.tags ?? product.etiquetas)
    .map((tag) => tag.toLowerCase())
    .filter((tag): tag is "new" | "sale" => tag === "new" || tag === "sale");

  if (
    salePrice !== undefined &&
    salePrice > 0 &&
    salePrice < price &&
    !rawTags.includes("sale")
  ) {
    rawTags.push("sale");
  }

  const createdAtMs = getTimestampMillis(product.createdAt);
  const isRecentProduct =
    createdAtMs !== null &&
    Date.now() - createdAtMs <= 1000 * 60 * 60 * 24 * 120;

  const isExplicitNew = Boolean(product.nuevo ?? product.isNew);

  if ((isExplicitNew || isRecentProduct) && !rawTags.includes("new")) {
    rawTags.push("new");
  }

  return Array.from(new Set(rawTags));
}

function mapSizeInventory(input: unknown): ProductSizeStock[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      const item = (
        entry && typeof entry === "object" ? entry : {}
      ) as UnknownRecord;
      const tallaId = toStringValue(item.tallaId ?? item.id ?? item.codigo);
      return {
        tallaId,
        cantidad: toNumber(item.cantidad),
      };
    })
    .filter((entry) => Boolean(entry.tallaId));
}

function mapRatingSummary(input: unknown): ProductRatingSummary | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const summary = input as UnknownRecord;
  return {
    average: toNumber(summary.average),
    count: toNumber(summary.count),
    updatedAt: toStringValue(summary.updatedAt) || undefined,
  };
}

function mapRatingEligibility(
  input: unknown,
): ProductRatingEligibility | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const eligibility = input as UnknownRecord;
  const reason = toStringValue(
    eligibility.reason,
  ) as ProductRatingEligibility["reason"];

  if (
    reason !== "eligible" &&
    reason !== "purchase_required" &&
    reason !== "not_delivered"
  ) {
    return undefined;
  }

  return {
    canRate: Boolean(eligibility.canRate),
    reason,
  };
}

function mapUserRating(input: unknown): ProductUserRating | null | undefined {
  if (input === null) {
    return null;
  }

  if (!input || typeof input !== "object") {
    return undefined;
  }

  const rating = input as UnknownRecord;
  const score = toNumber(rating.score, 0);
  const updatedAt = toStringValue(rating.updatedAt);

  if (score <= 0 || !updatedAt) {
    return undefined;
  }

  return {
    score,
    updatedAt,
  };
}

function mapFedexShipping(input: unknown): ProductFedexShipping | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  return input as ProductFedexShipping;
}

function mapProduct(input: unknown): Product {
  const product = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  const id = toStringValue(
    product.id ?? product._id ?? product.productoId ?? product.uid,
  );
  const clave = toStringValue(product.clave ?? product.sku) || undefined;
  const name = toStringValue(
    product.nombre ??
      product.name ??
      product.titulo ??
      product.descripcion ??
      product.clave,
    "Producto",
  );
  const description = toStringValue(
    product.description ??
      product.detalle ??
      product.descripcion ??
      product.clave,
    "Sin descripción disponible.",
  );
  const price = toNumber(
    product.precioPublico ??
      product.precio ??
      product.price ??
      product.precioBase,
  );
  const salePriceRaw = toNumber(
    product.precioOferta ?? product.salePrice ?? product.precioDescuento,
    0,
  );
  const salePrice = salePriceRaw > 0 ? salePriceRaw : undefined;
  const categoryId = toStringValue(
    product.categoriaId ??
      (product.categoria as UnknownRecord | undefined)?.id ??
      (product.categoria as UnknownRecord | undefined)?.slug,
  );
  const categoryName = toStringValue(
    (product.categoria as UnknownRecord | undefined)?.nombre ??
      product.categoriaNombre ??
      (categoryId || product.category),
    "General",
  );
  const lineId = toStringValue(
    (product.linea as UnknownRecord | undefined)?.id ??
      product.lineaId ??
      product.idLinea,
  );
  const lineName = toStringValue(
    (product.linea as UnknownRecord | undefined)?.nombre ??
      product.lineaNombre ??
      product.line,
  );

  const primaryImages = uniqueStrings(toStringArray(product.imagenes));
  const fallbackImages = uniqueStrings(
    [
      product.images,
      product.fotos,
      product.image,
      product.imagen,
      (product.categoria as UnknownRecord | undefined)?.imagen,
    ]
      .flatMap((candidate) => toStringArray(candidate))
      .filter(Boolean),
  );
  const images = primaryImages.length > 0 ? primaryImages : fallbackImages;

  const tallaIds = toStringArray(product.tallaIds ?? product.tallasIds);
  const hasSizeInventory = tallaIds.length > 0;
  const mappedInventoryBySize = mapSizeInventory(
    product.inventarioPorTalla ?? product.stockPorTalla ?? product.tallasStock,
  );
  const normalizedInventoryBySize = hasSizeInventory
    ? tallaIds.map((tallaId) => {
        const matched = mappedInventoryBySize.find(
          (entry) => entry.tallaId === tallaId,
        );
        return {
          tallaId,
          cantidad: matched?.cantidad ?? 0,
        };
      })
    : [];
  const stockTotalFromBackend = toNumber(
    product.existencias ??
      product.stock ??
      product.inventario ??
      product.existencia,
    0,
  );
  const stockTotal = hasSizeInventory
    ? normalizedInventoryBySize.reduce(
        (total, item) => total + item.cantidad,
        0,
      )
    : stockTotalFromBackend;
  const visibleSizes = toStringArray(
    product.tallas ?? product.sizes ?? product.tallaIds ?? tallaIds,
  );

  return {
    id,
    clave,
    name,
    description,
    price,
    salePrice,
    images:
      images.length > 0
        ? images
        : [`https://picsum.photos/seed/${id || "product"}/600/600`],
    category: categoryName,
    categoryId: categoryId || undefined,
    lineId: lineId || undefined,
    lineName: lineName || undefined,
    tags: mapProductTagList(product, price, salePrice),
    sizes: visibleSizes.length > 0 ? visibleSizes : tallaIds,
    colors: toStringArray(product.colores ?? product.colors),
    stock: stockTotal,
    stockTotal,
    tallaIds,
    inventarioPorTalla: normalizedInventoryBySize,
    hasSizeInventory,
    detailIds: toStringArray(product.detalleIds ?? product.detailIds),
    activo:
      typeof product.activo === "boolean"
        ? product.activo
        : typeof product.active === "boolean"
          ? product.active
          : undefined,
    ratingSummary: mapRatingSummary(product.ratingSummary),
    fedexShipping: mapFedexShipping(product.fedexShipping),
    isFavorito:
      typeof product.isFavorito === "boolean"
        ? product.isFavorito
        : typeof product.esFavorito === "boolean"
          ? product.esFavorito
          : undefined,
    ratingEligibility: mapRatingEligibility(product.ratingEligibility),
    myRating: mapUserRating(product.myRating),
  };
}

function mapCategory(input: unknown): Category {
  const category = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;
  const name = toStringValue(category.nombre ?? category.name, "General");
  const slug = toStringValue(category.slug, slugify(name));

  return {
    id: toStringValue(
      category.id ?? category._id ?? category.categoriaId ?? slug,
    ),
    name,
    slug,
    imagenPrincipal: category.imagenPrincipal ? toStringValue(category.imagenPrincipal) : null,
    lineaId: category.lineaId ? toStringValue(category.lineaId) : null,
    orden: typeof category.orden === "number" ? category.orden : null,
  };
}

async function fetchProductsFromEndpoint(path: string): Promise<Product[]> {
  try {
    const payload = await apiFetch<unknown>(
      path,
      { method: "GET", cache: "no-store" },
      getProductReadOptions(),
    );
    return normalizeProductsArray(payload)
      .map(mapProduct)
      .filter((product) => Boolean(product.id));
  } catch (error) {
    console.error(`fetchProductsFromEndpoint failed for ${path}`, error);
    return [];
  }
}

export async function fetchProducts(): Promise<Product[]> {
  return fetchProductsFromEndpoint("/api/productos");
}

export async function searchProducts(term: string): Promise<Product[]> {
  if (!term.trim()) {
    return fetchProducts();
  }

  return fetchProductsFromEndpoint(
    `/api/productos/buscar/${encodeURIComponent(term.trim())}`,
  );
}

export async function fetchProductsByCategory(
  categoriaId: string,
): Promise<Product[]> {
  if (!categoriaId.trim()) {
    return [];
  }

  return fetchProductsFromEndpoint(
    `/api/productos/categoria/${encodeURIComponent(categoriaId.trim())}`,
  );
}

export async function fetchProductsByLine(lineaId: string): Promise<Product[]> {
  if (!lineaId.trim()) {
    return [];
  }

  return fetchProductsFromEndpoint(
    `/api/productos/linea/${encodeURIComponent(lineaId.trim())}`,
  );
}

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const [productPayload, stockPayload] = await Promise.all([
      apiFetch<unknown>(
        `/api/productos/${id}`,
        {
          method: "GET",
          cache: "no-store",
        },
        getProductReadOptions(),
      ),
      apiFetch<{ success?: boolean; data?: ProductStockSnapshot }>(
        `/api/productos/${id}/stock`,
        {
          method: "GET",
          cache: "no-store",
        },
        getProductReadOptions(),
      ).catch(() => null),
    ]);

    const data = unwrapData<unknown>(productPayload);

    if (!data || typeof data !== "object") {
      return null;
    }

    const product = mapProduct(data);

    if (!product.id) {
      return null;
    }

    const stockData = stockPayload?.data;
    if (!stockData) {
      return enrichProductWithOfferPricing(product);
    }

    const normalizedInventory = mapSizeInventory(stockData.inventarioPorTalla);
    const tallaIds = toStringArray(stockData.tallaIds);
    const hasSizeInventory = tallaIds.length > 0;
    const stockTotal = toNumber(
      stockData.existencias,
      product.stockTotal ?? product.stock,
    );

    return enrichProductWithOfferPricing({
      ...product,
      stock: stockTotal,
      stockTotal,
      tallaIds,
      sizes: hasSizeInventory ? tallaIds : product.sizes,
      inventarioPorTalla: normalizedInventory,
      hasSizeInventory,
    });
  } catch (error) {
    console.error("fetchProductById failed", error);
    return null;
  }
}

export async function fetchProductDetail(
  id: string,
  token?: string,
): Promise<Product | null> {
  try {
    const payload = await apiFetch<unknown>(
      `/api/productos/${id}`,
      {
        method: "GET",
        cache: "no-store",
      },
      { ...getProductReadOptions(), ...(token ? { token } : {}) },
    );

    const data = unwrapData<unknown>(payload);

    if (!data || typeof data !== "object") {
      return null;
    }

    const product = mapProduct(data);
    if (!product.id) {
      return null;
    }

    return enrichProductWithOfferPricing(product);
  } catch (error) {
    console.error("fetchProductDetail failed", error);
    return null;
  }
}

export async function fetchProductExtraDetails(
  productId: string,
): Promise<ProductExtraDetail[]> {
  try {
    const payload = await apiFetch<{
      success?: boolean;
      data?: unknown[];
    }>(
      `/api/productos/${productId}/detalles`,
      {
        method: "GET",
        cache: "no-store",
      },
      getProductReadOptions(),
    );

    const payloadRecord =
      payload && typeof payload === "object"
        ? (payload as UnknownRecord)
        : undefined;
    const nestedData =
      payloadRecord &&
      payloadRecord.data &&
      typeof payloadRecord.data === "object" &&
      !Array.isArray(payloadRecord.data)
        ? (payloadRecord.data as UnknownRecord).data
        : undefined;
    const data = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(nestedData)
        ? nestedData
        : [];
    const details: ProductExtraDetail[] = [];

    data.forEach((item) => {
      const detail = (
        item && typeof item === "object" ? item : {}
      ) as UnknownRecord;

      const id = toStringValue(detail.id);
      const descripcion = toStringValue(detail.descripcion);
      const productoIdValue = toStringValue(detail.productoId ?? productId);

      if (!id || !descripcion) {
        return;
      }

      details.push({
        id,
        descripcion,
        productoId: productoIdValue,
        createdAt: toStringValue(detail.createdAt) || undefined,
        updatedAt: toStringValue(detail.updatedAt) || undefined,
      });
    });

    return details;
  } catch (error) {
    console.error("fetchProductExtraDetails failed", error);
    return [];
  }
}

export async function rateProduct(productId: string, score: 1 | 2 | 3 | 4 | 5) {
  return apiFetch<{
    success: boolean;
    message: string;
    data: {
      id: string;
      productId: string;
      userId: string;
      score: number;
      eligibleOrderId: string;
      eligibleDeliveredAt: string;
      createdAt: string;
      updatedAt: string;
    };
  }>(
    `/api/productos/${encodeURIComponent(productId)}/calificacion`,
    {
      method: "POST",
      body: JSON.stringify({ score }),
    },
    { local: true },
  );
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const payload = await apiFetch<unknown>("/api/categorias", {
      method: "GET",
      cache: "no-store",
    });
    return normalizeCategoriesArray(payload)
      .map(mapCategory)
      .filter((category) => Boolean(category.id));
  } catch (error) {
    console.error("fetchCategories failed", error);
    return [];
  }
}


export function mapCatalogProductToProductCardViewModel(
  catalogProduct: CatalogProductCard,
): Product {
  const tags: Product["tags"] = [];
  if (catalogProduct.tieneOferta) tags.push("sale");
  if (catalogProduct.destacado) tags.push("new"); // map destacado to new for badge display if needed, or customize
  const price = catalogProduct.precioOriginal;
  const salePrice =
    catalogProduct.tieneOferta && catalogProduct.precioFinal < price
      ? catalogProduct.precioFinal
      : undefined;
  const stock = catalogProduct.stockTotal;
  const stockFisico = catalogProduct.stockFisico ?? stock;

  const images = catalogProduct.imagenes?.length
    ? catalogProduct.imagenes
    : catalogProduct.imagenPrincipal
      ? [catalogProduct.imagenPrincipal]
      : [];

  return {
    id: catalogProduct.id,
    name: catalogProduct.nombre,
    description: "", // Public catalog card doesn't need full description
    price,
    salePrice,
    images,
    category: catalogProduct.categoriaLabel || catalogProduct.categoria,
    lineName: catalogProduct.lineaLabel || catalogProduct.linea,
    tags,
    stock,
    stockTotal: stock,
    stockFisico,
    activo: true,
  };
}

function mapProductToCatalogCard(product: Product): CatalogProductCard {
  const finalPrice = product.salePrice ?? product.price;
  const isAvailable = (product.stockTotal ?? product.stock) > 0;

  return {
    id: product.id,
    slug: product.id,
    nombre: product.name,
    categoria: product.category,
    categoriaLabel: product.category,
    linea: product.lineId ?? product.lineName ?? "",
    lineaLabel: product.lineName ?? product.lineId ?? "",
    precioOriginal: product.price,
    precioFinal: finalPrice,
    tieneOferta: Boolean(product.salePrice && product.salePrice < product.price),
    ofertaAplicadaId: null,
    ofertaTitulo: product.salePrice ? "Oferta" : null,
    descuentoTotal: Math.max(product.price - finalPrice, 0),
    imagenPrincipal: product.images[0] ?? null,
    imagenes: product.images,
    stockTotal: product.stockTotal ?? product.stock,
    disponible: isAvailable,
    destacado: product.tags.includes("new"),
  };
}

function getCatalogCursorOffset(cursor?: string) {
  if (!cursor) return 0;

  const parsed = Number(cursor.replace(/^offset:/, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeCatalogResponse(payload: unknown): CatalogResponse {
  const unwrapped = unwrapData<unknown>(payload);
  const data =
    unwrapped &&
    typeof unwrapped === "object" &&
    "data" in unwrapped &&
    (unwrapped as { data?: unknown }).data !== undefined
      ? (unwrapped as { data: unknown }).data
      : unwrapped;

  if (!data || typeof data !== "object") {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const record = data as UnknownRecord;
  const items = Array.isArray(record.items)
    ? (record.items as CatalogProductCard[])
    : [];

  return {
    items,
    nextCursor:
      typeof record.nextCursor === "string" ? record.nextCursor : null,
    hasMore: Boolean(record.hasMore),
  };
}

let productImageLookupPromise: Promise<Map<string, string[]>> | null = null;

async function getProductImageLookup() {
  productImageLookupPromise ??= fetchProductsFromEndpoint("/api/productos").then(
    (products) => {
      const lookup = new Map<string, string[]>();

      products.forEach((product) => {
        if (product.images.length > 0) {
          lookup.set(product.id, product.images);
        }
      });

      return lookup;
    },
  );

  return productImageLookupPromise;
}

function getCatalogImageCount(item: CatalogProductCard) {
  return item.imagenes?.length ?? (item.imagenPrincipal ? 1 : 0);
}

async function hydrateCatalogImages(
  response: CatalogResponse,
): Promise<CatalogResponse> {
  if (response.items.length === 0) {
    return response;
  }

  const needsImageHydration = response.items.some(
    (item) => getCatalogImageCount(item) < 2,
  );

  if (!needsImageHydration) {
    return response;
  }

  try {
    const imageLookup = await getProductImageLookup();

    return {
      ...response,
      items: response.items.map((item) => {
        const productImages = imageLookup.get(item.id);

        if (!productImages || productImages.length === 0) {
          return item;
        }

        return {
          ...item,
          imagenPrincipal: item.imagenPrincipal ?? productImages[0] ?? null,
          imagenes: uniqueStrings([
            item.imagenPrincipal ?? "",
            ...(item.imagenes ?? []),
            ...productImages,
          ].filter(Boolean)),
        };
      }),
    };
  } catch (error) {
    console.warn("hydrateCatalogImages failed", error);
    return response;
  }
}

async function fetchCatalogFallbackPage(
  params: CatalogQuery,
): Promise<CatalogResponse> {
  const limit = Math.min(Math.max(Number(params.limit) || 24, 1), 48);
  const offset = getCatalogCursorOffset(params.cursor);
  const payload = await apiFetch<unknown>(
    "/api/productos",
    { method: "GET", cache: "no-store" },
    getProductReadOptions(),
  );

  let products = normalizeProductsArray(payload)
    .map(mapProduct)
    .filter((product) => Boolean(product.id))
    .filter((product) => product.activo !== false);

  if (params.onlyAvailable) {
    products = products.filter(
      (product) => (product.stockTotal ?? product.stock) > 0,
    );
  }

  if (params.category || params.categoria) {
    const category = normalizeStorefrontLikeText(
      params.category ?? params.categoria ?? "",
    );
    products = products.filter(
      (product) => normalizeStorefrontLikeText(product.category) === category,
    );
  }

  if (params.line || params.linea) {
    const line = normalizeStorefrontLikeText(params.line ?? params.linea ?? "");
    products = products.filter(
      (product) =>
        normalizeStorefrontLikeText(product.lineId ?? "") === line ||
        normalizeStorefrontLikeText(product.lineName ?? "") === line,
    );
  }

  if (params.talla) {
    const talla = normalizeStorefrontLikeText(params.talla);
    products = products.filter((product) =>
      (product.sizes ?? product.tallaIds ?? []).some(
        (size) => normalizeStorefrontLikeText(size) === talla,
      ),
    );
  }

  if (typeof params.maxPrice === "number") {
    products = products.filter(
      (product) => (product.salePrice ?? product.price) <= params.maxPrice!,
    );
  }

  if (typeof params.minPrice === "number") {
    products = products.filter(
      (product) => (product.salePrice ?? product.price) >= params.minPrice!,
    );
  }

  if (params.q) {
    const query = normalizeStorefrontLikeText(params.q);
    products = products.filter((product) =>
      normalizeStorefrontLikeText(
        `${product.name} ${product.description} ${product.clave ?? ""} ${product.category} ${product.lineName ?? ""}`,
      ).includes(query),
    );
  }

  if (params.onlyOffers) {
    products = products.filter((product) => product.tags.includes("sale"));
  }

  products = [...products].sort((a, b) => {
    switch (params.sort) {
      case "precio_asc":
        return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
      case "precio_desc":
        return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
      case "nombre_asc":
        return a.name.localeCompare(b.name, "es-MX");
      case "recientes":
      case "destacados":
      case "populares":
      case "mas_comprados":
      default:
        return a.name.localeCompare(b.name, "es-MX");
    }
  });

  const page = products.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < products.length;

  return {
    items: page.map(mapProductToCatalogCard),
    nextCursor: hasMore ? `offset:${nextOffset}` : null,
    hasMore,
  };
}

function normalizeStorefrontLikeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Shared page size for home Destacados rail and /products?sort=destacados first page.
 * Backend may return fewer items when the ranked list is shorter than this limit.
 */
export const DESTACADOS_CATALOG_FETCH_LIMIT = 24;

export function resolveCatalogOnlyAvailable(
  value: string | null | undefined,
): boolean {
  return value !== "false";
}

/** Canonical catalog query for analytics-ranked Destacados (home + catalog parity). */
export function getDestacadosCatalogQuery(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  return {
    sort: "destacados",
    limit,
    onlyAvailable: true,
    onlyOffers: false,
    ...overrides,
  };
}

/** Canonical catalog query for Populares (home rail + /products?sort=populares). */
export function getPopularesCatalogQuery(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  return {
    sort: "populares",
    limit,
    onlyAvailable: true,
    onlyOffers: false,
    ...overrides,
  };
}

/** Canonical catalog query for Más comprados (home rail + /products?sort=mas_comprados). */
export function getMasCompradosCatalogQuery(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  return {
    sort: "mas_comprados",
    limit,
    onlyAvailable: true,
    onlyOffers: false,
    ...overrides,
  };
}

/** Canonical catalog query for Novedades (home rail + /products?sort=recientes). */
export function getRecientesCatalogQuery(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  return {
    sort: "recientes",
    limit,
    onlyAvailable: true,
    onlyOffers: false,
    ...overrides,
  };
}

export const OFERTAS_CATALOG_SORTS = [
  "ofertas_populares",
  "ofertas_mas_compradas",
  "ofertas_recientes",
] as const satisfies readonly CatalogSort[];

export type OfertasCatalogSort = (typeof OFERTAS_CATALOG_SORTS)[number];

export function isOfertasCatalogSort(
  sort: string | null | undefined,
): sort is OfertasCatalogSort {
  return OFERTAS_CATALOG_SORTS.includes(sort as OfertasCatalogSort);
}

export function getOfertasSortLabel(sort: OfertasCatalogSort): string {
  switch (sort) {
    case "ofertas_populares":
      return "Ofertas más vistas";
    case "ofertas_mas_compradas":
      return "Ofertas más compradas";
    case "ofertas_recientes":
      return "Ofertas recién agregadas";
    default:
      return "Ofertas";
  }
}

/** Map catalog toolbar sorts to backend ofertas rankings when onlyOffers is active. */
export function mapCatalogSortForOffersView(sort: CatalogSort): CatalogSort {
  if (isOfertasCatalogSort(sort)) {
    return sort;
  }

  switch (sort) {
    case "populares":
    case "destacados":
      return "ofertas_populares";
    case "mas_comprados":
      return "ofertas_mas_compradas";
    case "recientes":
      return "ofertas_recientes";
    default:
      return sort;
  }
}

export function getProductEffectiveCatalogPrice(product: Product): number {
  return product.salePrice ?? product.price;
}

/** Canonical catalog query for Ofertas más vistas. */
export function getOfertasPopularesCatalogQuery(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  return {
    sort: "ofertas_populares",
    limit,
    onlyAvailable: true,
    onlyOffers: false,
    ...overrides,
  };
}

/** Canonical catalog query for Ofertas más compradas. */
export function getOfertasMasCompradasCatalogQuery(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  return {
    sort: "ofertas_mas_compradas",
    limit,
    onlyAvailable: true,
    onlyOffers: false,
    ...overrides,
  };
}

/** Canonical catalog query for Ofertas recién agregadas. */
export function getOfertasRecientesCatalogQuery(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  return {
    sort: "ofertas_recientes",
    limit,
    onlyAvailable: true,
    onlyOffers: false,
    ...overrides,
  };
}

const AGGREGATE_CATALOG_SORTS = new Set<CatalogSort>([
  "destacados",
  "populares",
  "mas_comprados",
  "recientes",
  "ofertas_populares",
  "ofertas_mas_compradas",
  "ofertas_recientes",
]);

export function getCatalogQueryForSort(
  sort: CatalogSort,
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): CatalogQuery {
  switch (sort) {
    case "destacados":
      return getDestacadosCatalogQuery(limit, overrides);
    case "populares":
      return getPopularesCatalogQuery(limit, overrides);
    case "mas_comprados":
      return getMasCompradosCatalogQuery(limit, overrides);
    case "recientes":
      return getRecientesCatalogQuery(limit, overrides);
    case "ofertas_populares":
      return getOfertasPopularesCatalogQuery(limit, overrides);
    case "ofertas_mas_compradas":
      return getOfertasMasCompradasCatalogQuery(limit, overrides);
    case "ofertas_recientes":
      return getOfertasRecientesCatalogQuery(limit, overrides);
    default:
      return {
        sort,
        limit,
        onlyAvailable: true,
        onlyOffers: false,
        ...overrides,
      };
  }
}

export function isAggregateCatalogSort(sort: CatalogSort): boolean {
  return AGGREGATE_CATALOG_SORTS.has(sort);
}

/** Single source for Destacados product IDs/order — used by home and catalog. */
export async function fetchDestacadosProducts(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
  overrides: Partial<CatalogQuery> = {},
): Promise<Product[]> {
  try {
    const page = await fetchCatalogPage(getDestacadosCatalogQuery(limit, overrides));

    return page.items.map(mapCatalogProductToProductCardViewModel);
  } catch (error) {
    console.warn("fetchDestacadosProducts failed", error);
    return [];
  }
}

/** @deprecated Use fetchDestacadosProducts — kept for call-site compatibility. */
export async function fetchFeaturedProducts(
  limit = DESTACADOS_CATALOG_FETCH_LIMIT,
): Promise<Product[]> {
  return fetchDestacadosProducts(limit);
}

export async function fetchCatalogPage(params: CatalogQuery = {}): Promise<CatalogResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const path = `/api/productos/catalogo${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;

  try {
    const payload = await apiFetch<unknown>(
      path,
      {
        method: "GET",
        cache: "no-store",
      },
      getProductReadOptions(),
    );

    return hydrateCatalogImages(normalizeCatalogResponse(payload));
  } catch (error) {
    console.warn("fetchCatalogPage failed, using /api/productos fallback", error);
    return fetchCatalogFallbackPage(params);
  }
}
