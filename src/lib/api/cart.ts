import type { Cart, CartItem } from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;
type ProductSnapshot = { name?: string; image?: string; price?: number };

const SESSION_STORAGE_KEY = "tiendafront_session_id";

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function resolveTallaId(item: Pick<CartItem, "tallaId" | "size">): string | undefined {
  return toStringValue(item.tallaId ?? item.size) || undefined;
}

export function getCartVariantKey(item: Pick<CartItem, "id" | "tallaId" | "size">): string {
  return `${item.id}::${resolveTallaId(item) ?? "no-size"}`;
}

function mapCartItem(input: unknown): CartItem {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;
  const product =
    item.producto && typeof item.producto === "object"
      ? (item.producto as UnknownRecord)
      : undefined;

  const productId = toStringValue(
    item.productoId ?? item.id ?? product?.id ?? product?._id ?? item.uid,
    "unknown",
  );

  const images = toStringArray(
    product?.imagenes ?? product?.images ?? item.imagenes,
  );

  return {
    id: productId,
    name: toStringValue(
      item.nombre ??
        item.productoNombre ??
        item.descripcion ??
        item.clave ??
        product?.nombre ??
        product?.name ??
        product?.descripcion ??
        product?.clave,
      "Producto",
    ),
    image:
      toStringValue(item.imagen ?? item.image ?? images[0]) ||
      `https://picsum.photos/seed/cart-${productId}/300/300`,
    price: toNumber(
      item.precioUnitario ??
        item.precio ??
        item.precioPublico ??
        product?.precio ??
        product?.price ??
        product?.precioPublico,
      0,
    ),
    quantity: Math.max(1, toNumber(item.cantidad ?? item.quantity, 1)),
    tallaId:
      toStringValue(item.tallaId ?? item.talla ?? item.size) || undefined,
    size: toStringValue(item.tallaId ?? item.talla ?? item.size) || undefined,
    color: toStringValue(item.color ?? item.colour) || undefined,
  };
}

function normalizeCartItems(payload: unknown): unknown[] {
  const data = unwrapData<unknown>(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as UnknownRecord;
    const keys = ["items", "productos", "articulos", "carrito"];

    for (const key of keys) {
      if (Array.isArray(record[key])) {
        return record[key] as unknown[];
      }
    }
  }

  return [];
}

function mapCart(payload: unknown): Cart {
  return {
    items: normalizeCartItems(payload).map(mapCartItem),
  };
}

function isFallbackImage(image: string): boolean {
  return image.includes("picsum.photos/seed/cart-");
}

function needsEnrichment(item: CartItem): boolean {
  return (
    item.name === "Producto" || item.price <= 0 || isFallbackImage(item.image)
  );
}

function mapProductSnapshot(input: unknown): ProductSnapshot | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const product = input as UnknownRecord;
  const images = toStringArray(product.imagenes ?? product.images);

  return {
    name: toStringValue(
      product.nombre ?? product.name ?? product.descripcion ?? product.clave,
    ),
    image: toStringValue(images[0] ?? product.imagen ?? product.image),
    price: toNumber(
      product.precioPublico ?? product.precio ?? product.price,
      0,
    ),
  };
}

async function fetchProductSnapshot(
  productId: string,
  token?: string,
): Promise<ProductSnapshot | null> {
  try {
    const payload = await apiFetch<unknown>(
      `/api/productos/${productId}`,
      {
        method: "GET",
      },
      { token },
    );
    return mapProductSnapshot(unwrapData<unknown>(payload));
  } catch {
    return null;
  }
}

async function enrichCart(cart: Cart, token?: string): Promise<Cart> {
  const productIdsToHydrate = Array.from(
    new Set(
      cart.items
        .filter(needsEnrichment)
        .map((item) => item.id)
        .filter((id) => Boolean(id) && id !== "unknown"),
    ),
  );

  if (productIdsToHydrate.length === 0) {
    return cart;
  }

  const snapshots = new Map<string, ProductSnapshot>();

  await Promise.all(
    productIdsToHydrate.map(async (productId) => {
      const snapshot = await fetchProductSnapshot(productId, token);
      if (snapshot) {
        snapshots.set(productId, snapshot);
      }
    }),
  );

  return {
    items: cart.items.map((item) => {
      const snapshot = snapshots.get(item.id);

      if (!snapshot) {
        return item;
      }

      return {
        ...item,
        name:
          item.name === "Producto" && snapshot.name ? snapshot.name : item.name,
        image:
          isFallbackImage(item.image) && snapshot.image
            ? snapshot.image
            : item.image,
        price: item.price <= 0 && snapshot.price ? snapshot.price : item.price,
      };
    }),
  };
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const fromStorage = localStorage.getItem(SESSION_STORAGE_KEY);
  if (fromStorage) {
    return fromStorage;
  }

  const generated = crypto.randomUUID();
  localStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

export async function fetchCart(
  sessionId: string,
  token?: string,
): Promise<Cart> {
  const payload = await apiFetch<unknown>(
    "/api/carrito",
    { method: "GET" },
    { sessionId, token, local: true },
  );

  return enrichCart(mapCart(payload), token);
}

export async function addCartItem(
  sessionId: string,
  item: Pick<CartItem, "id" | "quantity" | "size" | "tallaId" | "color">,
  token?: string,
): Promise<Cart> {
  const tallaId = resolveTallaId(item);
  const payload = await apiFetch<unknown>(
    "/api/carrito/items",
    {
      method: "POST",
      body: JSON.stringify({
        productoId: item.id,
        cantidad: item.quantity,
        ...(tallaId ? { tallaId } : {}),
      }),
    },
    { sessionId, token, local: true },
  );

  return enrichCart(mapCart(payload), token);
}

export async function updateCartItem(
  sessionId: string,
  item: Pick<CartItem, "id" | "quantity" | "size" | "tallaId" | "color">,
  token?: string,
): Promise<Cart> {
  const tallaId = resolveTallaId(item);
  const payload = await apiFetch<unknown>(
    `/api/carrito/items/${item.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        cantidad: item.quantity,
        ...(tallaId ? { tallaId } : {}),
      }),
    },
    { sessionId, token, local: true },
  );

  return enrichCart(mapCart(payload), token);
}

export async function removeCartItem(
  sessionId: string,
  item: Pick<CartItem, "id" | "size" | "tallaId">,
  token?: string,
): Promise<Cart> {
  const tallaId = resolveTallaId(item);
  const payload = await apiFetch<unknown>(
    `/api/carrito/items/${item.id}`,
    {
      method: "DELETE",
      body: JSON.stringify({
        ...(tallaId ? { tallaId } : {}),
      }),
    },
    { sessionId, token, local: true },
  );

  return enrichCart(mapCart(payload), token);
}

export async function clearCart(
  sessionId: string,
  token?: string,
): Promise<Cart> {
  const payload = await apiFetch<unknown>(
    "/api/carrito",
    { method: "DELETE" },
    { sessionId, token, local: true },
  );

  return enrichCart(mapCart(payload), token);
}

export async function checkoutCart(payload: {
  direccionEnvio: {
    nombre: string;
    calle: string;
    numero: string;
    colonia: string;
    ciudad: string;
    estado: string;
    codigoPostal: string;
    telefono: string;
  };
  metodoPago: "TARJETA";
  costoEnvio: number;
  notas?: string;
}) {
  return apiFetch<unknown>(
    "/api/carrito/checkout",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { local: true },
  );
}

export async function mergeCartSession(sessionId: string) {
  return apiFetch<unknown>(
    "/api/carrito/merge",
    {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    },
    { local: true },
  );
}
