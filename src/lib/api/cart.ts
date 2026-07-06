import type {
  Cart,
  CartItem,
  CartItemStockStatus,
  CheckoutFulfillmentMethod,
  CheckoutPayload,
  PaymentMethod,
} from "@/lib/types";
import type { PickupContact } from "./pickup";
import { apiFetch, unwrapData } from "./client";
import type { AddressValidationStatus, ShippingSelection } from "@/lib/types";

type UnknownRecord = Record<string, unknown>;
type ProductSnapshot = { name?: string; image?: string; price?: number };

export type ValidarCodigoPromocionCarritoItem = {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  categoriaIds?: string[];
  lineaIds?: string[];
  tallaId?: string | null;
};

export type ResultadoCodigoPromocionCarrito = {
  valido: boolean;
  codigo?: string;
  codigoPromocionId?: string;
  titulo?: string;
  mensaje?: string;
  subtotalOriginal: number;
  descuentoTotal: number;
  subtotalFinal: number;
  items?: unknown[];
};

export type DisponibilidadCodigosPromocionCarrito = {
  disponible: boolean;
};

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

function resolveTallaId(
  item: Pick<CartItem, "tallaId" | "size">,
): string | undefined {
  return toStringValue(item.tallaId ?? item.size) || undefined;
}

export function getCartVariantKey(
  item: Pick<CartItem, "id" | "tallaId" | "size" | "personalizacion">,
): string {
  const personalizationKey = item.personalizacion
    ? `${item.personalizacion.mode}:${item.personalizacion.nombre}:${item.personalizacion.numero}`
    : "plain";
  return `${item.id}::${resolveTallaId(item) ?? "no-size"}::${personalizationKey}`;
}

function toStockStatus(value: unknown): CartItemStockStatus | undefined {
  if (
    value === "available" ||
    value === "out_of_stock" ||
    value === "temporarily_unavailable"
  ) {
    return value;
  }
  return undefined;
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

  const personalizationRaw =
    item.personalizacion && typeof item.personalizacion === "object"
      ? (item.personalizacion as UnknownRecord)
      : undefined;
  const personalizacion =
    personalizationRaw &&
    (personalizationRaw.mode === "player" || personalizationRaw.mode === "custom") &&
    typeof personalizationRaw.nombre === "string" &&
    typeof personalizationRaw.numero === "string"
      ? {
          mode: personalizationRaw.mode as "player" | "custom",
          nombre: personalizationRaw.nombre,
          numero: personalizationRaw.numero,
        }
      : undefined;
  const personalizationFee = toNumber(item.personalizationFee, 0);
  const basePrice = toNumber(
    item.precioUnitario ??
      item.precio ??
      item.precioPublico ??
      product?.precio ??
      product?.price ??
      product?.precioPublico,
    0,
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
    price: basePrice + personalizationFee,
    quantity: Math.max(1, toNumber(item.cantidad ?? item.quantity, 1)),
    tallaId:
      toStringValue(item.tallaId ?? item.talla ?? item.size) || undefined,
    size: toStringValue(item.tallaId ?? item.talla ?? item.size) || undefined,
    color: toStringValue(item.color ?? item.colour) || undefined,
    disponible: (() => {
      const value = toNumber(
        item.disponible ?? product?.disponible ?? product?.existencias,
        -1,
      );
      return value >= 0 ? value : undefined;
    })(),
    stockFisico: (() => {
      const value = toNumber(item.stockFisico ?? product?.stockFisico, -1);
      return value >= 0 ? value : undefined;
    })(),
    stockStatus: toStockStatus(item.stockStatus ?? product?.stockStatus),
    purchasable: (() => {
      if (typeof item.purchasable === "boolean") {
        return item.purchasable;
      }
      if (typeof product?.purchasable === "boolean") {
        return product.purchasable;
      }
      const status = toStockStatus(item.stockStatus ?? product?.stockStatus);
      if (
        status === "out_of_stock" ||
        status === "temporarily_unavailable"
      ) {
        return false;
      }
      const disponible = toNumber(
        item.disponible ?? product?.disponible ?? product?.existencias,
        -1,
      );
      const quantity = Math.max(1, toNumber(item.cantidad ?? item.quantity, 1));
      if (disponible >= 0 && disponible < quantity) {
        return false;
      }
      return true;
    })(),
    ...(personalizacion ? { personalizacion } : {}),
    ...(personalizationFee > 0 ? { personalizationFee } : {}),
  };
}

function pickCartItemsArray(record: UnknownRecord): unknown[] | undefined {
  const keys = ["itemsDetallados", "items", "productos", "articulos", "carrito"];

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return undefined;
}

function normalizeCartItems(payload: unknown): unknown[] {
  const data = unwrapData<unknown>(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as UnknownRecord;
    const nestedCart =
      record.carrito && typeof record.carrito === "object"
        ? (record.carrito as UnknownRecord)
        : record.cart && typeof record.cart === "object"
          ? (record.cart as UnknownRecord)
          : undefined;

    const directItems = pickCartItemsArray(record);
    if (directItems) {
      return directItems;
    }

    if (nestedCart) {
      const nestedItems = pickCartItemsArray(nestedCart);
      if (nestedItems) {
        return nestedItems;
      }
    }
  }

  return [];
}

function mapCart(payload: unknown): Cart {
  const data = unwrapData<unknown>(payload);
  const record =
    data && typeof data === "object" ? (data as UnknownRecord) : undefined;
  const nestedCart =
    record?.carrito && typeof record.carrito === "object"
      ? (record.carrito as UnknownRecord)
      : record?.cart && typeof record.cart === "object"
        ? (record.cart as UnknownRecord)
        : undefined;
  const source = nestedCart ?? record;

  return {
    id:
      toStringValue(
        source?.id ??
          source?._id ??
          source?.cartId ??
          record?.carritoId ??
          record?.carritoID,
      ) || undefined,
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
      { token, local: true },
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
    ...cart,
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
  item: Pick<
    CartItem,
    "id" | "quantity" | "size" | "tallaId" | "color" | "personalizacion"
  >,
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
        ...(item.personalizacion ? { personalizacion: item.personalizacion } : {}),
      }),
    },
    { sessionId, token, local: true },
  );

  return enrichCart(mapCart(payload), token);
}

export async function updateCartItem(
  sessionId: string,
  item: Pick<
    CartItem,
    "id" | "quantity" | "size" | "tallaId" | "color" | "personalizacion"
  >,
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
        ...(item.personalizacion ? { personalizacion: item.personalizacion } : {}),
      }),
    },
    { sessionId, token, local: true },
  );

  return enrichCart(mapCart(payload), token);
}

export async function removeCartItem(
  sessionId: string,
  item: Pick<CartItem, "id" | "size" | "tallaId" | "personalizacion">,
  token?: string,
): Promise<Cart> {
  const tallaId = resolveTallaId(item);
  const body: Record<string, unknown> = {};
  if (tallaId) body.tallaId = tallaId;
  if (item.personalizacion) body.personalizacion = item.personalizacion;

  const payload = await apiFetch<unknown>(
    `/api/carrito/items/${item.id}`,
    {
      method: "DELETE",
      ...(Object.keys(body).length > 0
        ? { body: JSON.stringify(body) }
        : {}),
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

function mapResultadoCodigoPromocion(
  payload: unknown,
): ResultadoCodigoPromocionCarrito {
  const data = unwrapData<unknown>(payload);
  const record =
    data && typeof data === "object" ? (data as UnknownRecord) : {};

  const source =
    record.resultado && typeof record.resultado === "object"
      ? (record.resultado as UnknownRecord)
      : record.validacion && typeof record.validacion === "object"
        ? (record.validacion as UnknownRecord)
        : record;

  const subtotalOriginal = toNumber(
    source.subtotalOriginal ?? source.subtotal,
    0,
  );

  const descuentoTotal = toNumber(
    source.descuentoTotal ?? source.descuento,
    0,
  );

  const subtotalFinal = toNumber(
    source.subtotalFinal ?? source.totalFinal ?? source.total,
    Math.max(subtotalOriginal - descuentoTotal, 0),
  );

  return {
    valido:
      source.valido === false
        ? false
        : Boolean(source.valido ?? source.aplicado ?? source.success) ||
          descuentoTotal > 0,
    codigo: toStringValue(source.codigo) || undefined,
    codigoPromocionId:
      toStringValue(
        source.codigoPromocionId ?? source.codigoId ?? source.id,
      ) || undefined,
    titulo:
      toStringValue(source.titulo ?? source.codigoTitulo ?? source.nombre) ||
      undefined,
    mensaje:
      toStringValue(source.mensaje ?? source.message ?? source.error) ||
      undefined,
    subtotalOriginal,
    descuentoTotal,
    subtotalFinal,
    items: Array.isArray(source.items) ? source.items : [],
  };
}

function mapDisponibilidadCodigosPromocion(
  payload: unknown,
): DisponibilidadCodigosPromocionCarrito {
  const data = unwrapData<unknown>(payload);

  if (typeof data === "boolean") {
    return {
      disponible: data,
    };
  }

  const record =
    data && typeof data === "object"
      ? (data as UnknownRecord)
      : {};

  return {
    disponible:
      record.disponible === true ||
      record.hayCodigosDisponibles === true,
  };
}

export async function validarCodigoPromocionCarrito(payload: {
  codigo: string;
  items: ValidarCodigoPromocionCarritoItem[];
}): Promise<ResultadoCodigoPromocionCarrito> {
  const codigo = payload.codigo.trim().toUpperCase();

  const items = payload.items.map((item) => ({
    productoId: item.productoId,
    cantidad: Math.max(1, Number(item.cantidad || 1)),
    precioUnitario: Number(item.precioUnitario || 0),
    categoriaIds: item.categoriaIds ?? [],
    lineaIds: item.lineaIds ?? [],
    ...(item.tallaId ? { tallaId: item.tallaId } : {}),
  }));

  const response = await apiFetch<unknown>(
    "/api/codigos-promocion/validar",
    {
      method: "POST",
      body: JSON.stringify({
        codigo,
        items,
      }),
    },
  );

  return mapResultadoCodigoPromocion(response);
}


export async function consultarDisponibilidadCodigosPromocionCarrito(payload: {
  items: ValidarCodigoPromocionCarritoItem[];
}): Promise<DisponibilidadCodigosPromocionCarrito> {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return {
      disponible: false,
    };
  }

  const items = payload.items.map((item) => ({
    productoId: item.productoId,
    cantidad: Math.max(1, Number(item.cantidad || 1)),
    precioUnitario: Math.max(0, Number(item.precioUnitario || 0)),
    categoriaIds: item.categoriaIds ?? [],
    lineaIds: item.lineaIds ?? [],
    ...(item.tallaId ? { tallaId: item.tallaId } : {}),
  }));

  const response = await apiFetch<unknown>(
    "/api/codigos-promocion/disponibilidad-carrito",
    {
      method: "POST",
      body: JSON.stringify({
        items,
      }),
    },
  );

  return mapDisponibilidadCodigosPromocion(response);
}

/** @deprecated Usa startCheckoutAttempt + Stripe Embedded Checkout. */
export async function checkoutCart(payload: {
  fulfillmentMethod?: CheckoutFulfillmentMethod;
  direccionEnvio?: {
    nombre: string;
    calle: string;
    numero: string;
    numeroInterior?: string;
    colonia: string;
    ciudad: string;
    estado: string;
    codigoPostal: string;
    stateOrProvinceCode?: string;
    countryCode?: "MX";
    postalCode?: string;
    telefono: string;
    referencias?: string;
    addressValidationStatus?: AddressValidationStatus;
  };
  shippingAddress?: {
    streetLines: string[];
    city?: string;
    stateOrProvinceCode?: string;
    postalCode: string;
    countryCode: string;
    residential?: boolean;
  };
  fedexAddress?: {
    streetLines: string[];
    city?: string;
    stateOrProvinceCode?: string;
    postalCode: string;
    countryCode: string;
    residential?: boolean;
  };
  pickupLocationId?: string;
  pickupContact?: PickupContact;
  metodoPago: PaymentMethod;
  shippingQuoteId?: string;
  selectedShippingOptionId?: string;
  selectedServiceType?: string;
  shippingSelection?: ShippingSelection;
  notas?: string;
} | CheckoutPayload) {
  // El backend resuelve el checkout únicamente con el carrito del usuario
  // autenticado (ignora x-session-id). Si los productos quedaron en el carrito
  // anónimo, hay que fusionarlos antes para evitar "El carrito está vacío".
  const sessionId = getOrCreateSessionId();
  if (sessionId) {
    await mergeCartSession(sessionId);
  }

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
