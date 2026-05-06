import type {
  AplazoOnlineCreatePayload,
  AplazoPaymentStatus,
  AplazoReturnKind,
  CartItem,
  PaymentMethod,
} from "@/lib/types";

const APLAZO_STORAGE_KEY = "aplazo_checkout_state";
const APLAZO_RETRY_PAYLOAD_KEY = "aplazo_checkout_retry_payload";

export type StoredAplazoCheckoutState = {
  paymentMethod: PaymentMethod;
  flowType: "online";
  orderId: string;
  paymentAttemptId?: string;
  idempotencyKey: string;
  cartFingerprint: string;
  cartSessionId?: string;
  cartSnapshot?: Array<{
    productoId: string;
    cantidad: number;
    tallaId?: string;
  }>;
  expiresAt?: string | null;
  lastKnownStatus?: string;
  lastReturnPath?: string;
  updatedAt: string;
};

export type StoredAplazoRetryPayload = Omit<
  AplazoOnlineCreatePayload,
  "successUrl" | "failureUrl" | "cancelUrl" | "cartUrl"
>;

type AplazoPayloadProduct = {
  id: string;
  count: number;
  description: string;
  imageUrl?: string;
  price: number;
  title: string;
};

const TERMINAL_FAILURE_STATUSES = new Set<AplazoPaymentStatus>([
  "failed",
  "canceled",
  "expired",
]);

const TERMINAL_STATUSES = new Set<AplazoPaymentStatus>([
  ...TERMINAL_FAILURE_STATUSES,
  "paid",
  "refunded",
  "partially_refunded",
]);

type ItemCandidate = Partial<CartItem> &
  Record<string, unknown> & {
    productoId?: string;
    cantidad?: number;
    tallaId?: string;
    nombre?: string;
    titulo?: string;
    title?: string;
    descripcion?: string;
    description?: string;
    precio?: number;
    image?: string;
    imageUrl?: string;
  };

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNestedRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = record[key];
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function resolveItemName(item: ItemCandidate) {
  const nestedProduct = pickNestedRecord(item, "product");
  const candidates = [
    item.name,
    item.nombre,
    item.title,
    item.titulo,
    nestedProduct?.name,
    nestedProduct?.nombre,
    nestedProduct?.title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = normalizeWhitespace(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
}

function resolveItemDescription(item: ItemCandidate, fallbackTitle: string) {
  const nestedProduct = pickNestedRecord(item, "product");
  const candidates = [
    item.description,
    item.descripcion,
    nestedProduct?.description,
    nestedProduct?.descripcion,
    fallbackTitle,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = normalizeWhitespace(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return fallbackTitle;
}

function resolveItemId(item: ItemCandidate) {
  const nestedProduct = pickNestedRecord(item, "product");
  const nestedVariant = pickNestedRecord(item, "variant");
  const candidates = [
    item.id,
    item.productoId,
    nestedVariant?.id,
    nestedProduct?.id,
    nestedProduct?.sku,
    item.sku,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function resolveItemQuantity(item: ItemCandidate) {
  const quantity = toFiniteNumber(item.quantity ?? item.cantidad);
  if (quantity === null || quantity <= 0) {
    return null;
  }

  return Math.trunc(quantity);
}

function resolveItemPrice(item: ItemCandidate) {
  const nestedProduct = pickNestedRecord(item, "product");
  const price = toFiniteNumber(
    item.price ?? item.precio ?? nestedProduct?.price ?? nestedProduct?.precio,
  );

  if (price === null || price <= 0) {
    return null;
  }

  return Math.round(price * 100) / 100;
}

function resolveItemImageUrl(item: ItemCandidate) {
  const nestedProduct = pickNestedRecord(item, "product");
  const candidates = [
    item.imageUrl,
    item.image,
    nestedProduct?.imageUrl,
    nestedProduct?.image,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      return candidate.trim();
    }
  }

  return "";
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function normalizeMxPhoneForAplazo(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.startsWith("52") && digitsOnly.length === 12) {
    return digitsOnly.slice(2);
  }

  return digitsOnly;
}

export function isValidMxPhoneForAplazo(raw: string): boolean {
  return /^\d{10}$/.test(normalizeMxPhoneForAplazo(raw));
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const normalized = normalizeWhitespace(fullName);
  if (!normalized) {
    return { firstName: ".", lastName: "." };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "." };
  }

  return {
    firstName: parts[0] || ".",
    lastName: parts.slice(1).join(" ") || ".",
  };
}

export function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

export function normalizeAplazoStatus(
  status?: string | null,
): AplazoPaymentStatus | null {
  if (typeof status !== "string") {
    return null;
  }

  const normalizedKey = status.trim().replace(/[\s-]+/g, "_").toUpperCase();
  if (!normalizedKey) {
    return null;
  }

  switch (normalizedKey) {
    case "CREATED":
      return "created";
    case "PENDING":
      return "pending_customer";
    case "PENDING_PROVIDER":
      return "pending_provider";
    case "PENDING_CUSTOMER":
      return "pending_customer";
    case "AUTHORIZED":
      return "authorized";
    case "PAID":
    case "APPROVED":
    case "COMPLETED":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELED":
    case "CANCELLED":
      return "canceled";
    case "EXPIRED":
      return "expired";
    case "REFUNDED":
      return "refunded";
    case "PARTIALLY_REFUNDED":
      return "partially_refunded";
    default:
      return null;
  }
}

export function toAplazoMinorUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (Number.isInteger(value)) {
    return value;
  }

  return Math.round(value * 100);
}

export function validateAplazoProducts(
  items: ItemCandidate[] | null | undefined,
): {
  ok: boolean;
  message?: string;
  products: AplazoPayloadProduct[];
  totalPrice: number;
} {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      message: "No hay productos válidos en el carrito",
      products: [],
      totalPrice: 0,
    };
  }

  const products = items.flatMap((item) => {
    const id = resolveItemId(item);
    const title = resolveItemName(item);
    const quantity = resolveItemQuantity(item);
    const price = resolveItemPrice(item);

    if (!id || !title || quantity === null || price === null) {
      return [];
    }

    return [
      {
        id,
        count: quantity,
        description: resolveItemDescription(item, title),
        imageUrl: resolveItemImageUrl(item),
        price: toAplazoMinorUnit(price),
        title,
      },
    ];
  });

  const totalPrice = products.reduce((sum, product) => {
    return sum + product.count * product.price;
  }, 0);

  if (products.length === 0) {
    return {
      ok: false,
      message: "No hay productos válidos en el carrito",
      products: [],
      totalPrice: 0,
    };
  }

  if (totalPrice <= 0) {
    return {
      ok: false,
      message: "No fue posible preparar el pago con Aplazo",
      products: [],
      totalPrice: 0,
    };
  }

  return { ok: true, products, totalPrice };
}

export function calculateAplazoItemsTotal(
  items: ItemCandidate[] | null | undefined,
) {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((sum, item) => {
    const quantity = resolveItemQuantity(item);
    const price = resolveItemPrice(item);

    if (quantity === null || price === null) {
      return sum;
    }

    return sum + quantity * price;
  }, 0);
}

export function getAplazoCartFingerprint(items: CartItem[]): string {
  return items
    .map((item) => ({
      id: item.id,
      quantity: item.quantity,
      tallaId: item.tallaId ?? item.size ?? "",
    }))
    .sort((first, second) => {
      if (first.id === second.id) {
        return first.tallaId.localeCompare(second.tallaId);
      }
      return first.id.localeCompare(second.id);
    })
    .map((item) => `${item.id}:${item.tallaId}:${item.quantity}`)
    .join("|");
}

export function buildAplazoReturnUrls(origin: string) {
  const baseOrigin =
    typeof origin === "string" && origin.trim()
      ? origin.replace(/\/+$/, "")
      : "";

  return {
    successUrl: `${baseOrigin}/payments/aplazo/success`,
    failureUrl: `${baseOrigin}/payments/aplazo/failure`,
    cancelUrl: `${baseOrigin}/payments/aplazo/cancel`,
    cartUrl: `${baseOrigin}/cart`,
  };
}

function normalizeStoredCheckoutState(
  state: StoredAplazoCheckoutState,
): StoredAplazoCheckoutState {
  const lastKnownStatus = normalizeAplazoStatus(state.lastKnownStatus);
  const lastReturnPath =
    state.lastReturnPath === "success" ||
    state.lastReturnPath === "failure" ||
    state.lastReturnPath === "cancel"
      ? state.lastReturnPath
      : undefined;

  return {
    ...state,
    lastKnownStatus: lastKnownStatus ?? undefined,
    lastReturnPath,
  };
}

export function readStoredAplazoCheckoutState(): StoredAplazoCheckoutState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(APLAZO_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeStoredCheckoutState(
      JSON.parse(raw) as StoredAplazoCheckoutState,
    );
  } catch {
    localStorage.removeItem(APLAZO_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAplazoCheckoutState(
  state: StoredAplazoCheckoutState,
) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    APLAZO_STORAGE_KEY,
    JSON.stringify(normalizeStoredCheckoutState(state)),
  );
}

export function clearStoredAplazoCheckoutState() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(APLAZO_STORAGE_KEY);
}

export function readStoredAplazoRetryPayload(): StoredAplazoRetryPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(APLAZO_RETRY_PAYLOAD_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAplazoRetryPayload;
  } catch {
    window.sessionStorage.removeItem(APLAZO_RETRY_PAYLOAD_KEY);
    return null;
  }
}

export function writeStoredAplazoRetryPayload(payload: StoredAplazoRetryPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    APLAZO_RETRY_PAYLOAD_KEY,
    JSON.stringify(payload),
  );
}

export function clearStoredAplazoRetryPayload() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(APLAZO_RETRY_PAYLOAD_KEY);
}

export function isAplazoTerminalStatus(status?: string | null) {
  const normalized = normalizeAplazoStatus(status);
  return Boolean(normalized && TERMINAL_STATUSES.has(normalized));
}

export function isAplazoRetryableStatus(status?: string | null) {
  const normalized = normalizeAplazoStatus(status);
  return Boolean(normalized && TERMINAL_FAILURE_STATUSES.has(normalized));
}

export function getAplazoStatusLabel(status?: string | null) {
  switch (normalizeAplazoStatus(status)) {
    case "created":
      return "Creado";
    case "pending_provider":
      return "Preparando pago";
    case "pending_customer":
      return "Esperando confirmación";
    case "authorized":
      return "Autorizado";
    case "paid":
      return "Pagado";
    case "failed":
      return "Fallido";
    case "canceled":
      return "Cancelado";
    case "expired":
      return "Expirado";
    case "refunded":
      return "Reembolsado";
    case "partially_refunded":
      return "Reembolso parcial";
    default:
      return "Pendiente";
  }
}

export function getAplazoStatusDescription(
  status?: string | null,
  returnKind: AplazoReturnKind = "success",
) {
  switch (normalizeAplazoStatus(status)) {
    case "created":
      return "El intento fue creado y está esperando avanzar con Aplazo.";
    case "pending_provider":
      return "Estamos preparando tu pago con Aplazo antes de confirmar el resultado final.";
    case "pending_customer":
      return "Tu pago está pendiente en Aplazo. Si acabas de completar el flujo, actualizaremos el pedido en cuanto recibamos la confirmación.";
    case "authorized":
      return "Aplazo autorizó el intento y estamos cerrando la confirmación del pedido.";
    case "paid":
      return "Tu pago fue confirmado. Te llevaremos a la confirmación final del pedido.";
    case "failed":
      return "Aplazo reportó un fallo al procesar el pago. Puedes intentar nuevamente o volver al checkout.";
    case "canceled":
      return "El flujo de Aplazo fue cancelado antes de completarse. Puedes intentarlo de nuevo cuando quieras.";
    case "expired":
      return "El intento de pago expiró. Genera un nuevo intento para continuar con la compra.";
    case "refunded":
      return "El pago fue reembolsado. Puedes revisar el detalle en tus pedidos.";
    case "partially_refunded":
      return "Se aplicó un reembolso parcial a este pago. Puedes revisar el detalle en tus pedidos.";
    default:
      if (returnKind === "failure") {
        return "El pago regresó con una señal de fallo, pero seguiremos consultando el backend antes de cerrar el estado.";
      }
      if (returnKind === "cancel") {
        return "El flujo regresó como cancelado, pero consultaremos el backend antes de asumir el estado final.";
      }
      return "Estamos validando tu pago con Aplazo. El backend sigue siendo la fuente de verdad.";
  }
}
