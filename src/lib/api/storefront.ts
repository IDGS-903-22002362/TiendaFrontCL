import type {
  Category,
  Product,
  ProductSizeStock,
  ProductStockSnapshot,
} from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

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
  const categoryName = toStringValue(
    (product.categoria as UnknownRecord | undefined)?.nombre ??
      product.categoriaNombre ??
      product.categoriaId ??
      product.category,
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

  const imageCandidates = [
    product.imagenes,
    product.images,
    product.fotos,
    product.image,
    product.imagen,
    (product.categoria as UnknownRecord | undefined)?.imagen,
  ];

  const images = imageCandidates
    .flatMap((candidate) => toStringArray(candidate))
    .filter(Boolean);

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
    ? normalizedInventoryBySize.reduce((total, item) => total + item.cantidad, 0)
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
  };
}

async function fetchProductsFromEndpoint(path: string): Promise<Product[]> {
  try {
    const payload = await apiFetch<unknown>(
      path,
      { method: "GET" },
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
        },
        getProductReadOptions(),
      ),
      apiFetch<{ success?: boolean; data?: ProductStockSnapshot }>(
        `/api/productos/${id}/stock`,
        {
          method: "GET",
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
      return product;
    }

    const normalizedInventory = mapSizeInventory(stockData.inventarioPorTalla);
    const tallaIds = toStringArray(stockData.tallaIds);
    const hasSizeInventory = tallaIds.length > 0;
    const stockTotal = toNumber(
      stockData.existencias,
      product.stockTotal ?? product.stock,
    );

    return {
      ...product,
      stock: stockTotal,
      stockTotal,
      tallaIds,
      sizes: hasSizeInventory ? tallaIds : product.sizes,
      inventarioPorTalla: normalizedInventory,
      hasSizeInventory,
    };
  } catch (error) {
    console.error("fetchProductById failed", error);
    return null;
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const payload = await apiFetch<unknown>("/api/categorias", {
      method: "GET",
    });
    return normalizeCategoriesArray(payload)
      .map(mapCategory)
      .filter((category) => Boolean(category.id));
  } catch (error) {
    console.error("fetchCategories failed", error);
    return [];
  }
}
