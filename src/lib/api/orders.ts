import type {
  RefundItem,
  Orden,
  OrderShipping,
  OrdenItem,
  OrderStatusHistoryEntry,
  OrderDireccionEnvio,
  Pago,
} from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  // Handle Firebase Timestamps that might be returned un-serialized
  if (value && typeof value === "object" && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
  }
  return fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean);
  }
  if (typeof value === "string" && value) {
    return [value];
  }
  return [];
}

function mapShipping(input: unknown): OrderShipping | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const item = input as UnknownRecord;
  const manualEvidenceRaw =
    item.manualEvidence && typeof item.manualEvidence === "object"
      ? (item.manualEvidence as UnknownRecord)
      : undefined;
  const manualEvidence = manualEvidenceRaw
    ? {
        realShippingCost:
          manualEvidenceRaw.realShippingCost === undefined
            ? undefined
            : toNumber(manualEvidenceRaw.realShippingCost, 0),
        receiptUrl: toStringValue(manualEvidenceRaw.receiptUrl) || undefined,
        guidePdfUrl: toStringValue(manualEvidenceRaw.guidePdfUrl) || undefined,
        notes: toStringValue(manualEvidenceRaw.notes) || undefined,
      }
    : undefined;

  return {
    provider: toStringValue(item.provider) || undefined,
    status: (toStringValue(item.status) || undefined) as
      | OrderShipping["status"]
      | undefined,
    quoteId: toStringValue(item.quoteId) || undefined,
    selectedOptionId:
      toStringValue(item.selectedOptionId ?? item.optionId) || undefined,
    serviceType: toStringValue(item.serviceType) || undefined,
    serviceName: toStringValue(item.serviceName) || undefined,
    amount:
      item.amount === undefined && item.costoEnvio === undefined
        ? undefined
        : toNumber(item.amount ?? item.costoEnvio, 0),
    currency: toStringValue(item.currency, "MXN") || "MXN",
    trackingNumber: toStringValue(item.trackingNumber) || undefined,
    trackingUrl: toStringValue(item.trackingUrl) || undefined,
    labelUrl: toStringValue(item.labelUrl) || undefined,
    labelStoragePath: toStringValue(item.labelStoragePath) || undefined,
    estimatedDeliveryDate:
      toStringValue(item.estimatedDeliveryDate ?? item.eta) || undefined,
    shippedAt: toStringValue(item.shippedAt) || undefined,
    deliveredAt: toStringValue(item.deliveredAt) || undefined,
    transitTime: toStringValue(item.transitTime) || undefined,
    manualEvidence,
    warnings: toStringArray(item.warnings),
  };
}

function mapItems(input: unknown): OrdenItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((raw) => {
    const item =
      raw && typeof raw === "object" ? (raw as UnknownRecord) : {};
    const productoRaw =
      item.producto && typeof item.producto === "object"
        ? (item.producto as UnknownRecord)
        : undefined;

    const personalizacionRaw =
      item.personalizacion && typeof item.personalizacion === "object"
        ? (item.personalizacion as UnknownRecord)
        : undefined;
    const personalizationMode = toStringValue(personalizacionRaw?.mode);
    const personalizacion =
      personalizacionRaw &&
      (personalizationMode === "player" || personalizationMode === "custom")
        ? {
            mode: personalizationMode as "player" | "custom",
            nombre: toStringValue(personalizacionRaw.nombre),
            numero: toStringValue(personalizacionRaw.numero),
          }
        : undefined;

    return {
      productoId: toStringValue(item.productoId ?? item.id),
      cantidad: toNumber(item.cantidad, 0),
      precioUnitario: toNumber(item.precioUnitario, 0),
      subtotal: toNumber(item.subtotal, 0),
      tallaId: toStringValue(item.tallaId) || undefined,
      personalizacion,
      personalizationFee:
        item.personalizationFee === undefined
          ? undefined
          : toNumber(item.personalizationFee, 0),
      producto: productoRaw
        ? {
            clave: toStringValue(productoRaw.clave) || undefined,
            descripcion:
              toStringValue(
                productoRaw.descripcion ?? productoRaw.nombre,
              ) || undefined,
            imagenes: toStringArray(productoRaw.imagenes),
          }
        : undefined,
    };
  });
}

function mapHistory(input: unknown): OrderStatusHistoryEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((raw) => {
    const item =
      raw && typeof raw === "object" ? (raw as UnknownRecord) : {};
    return {
      type: toStringValue(item.type) || undefined,
      from: toStringValue(item.from) || undefined,
      to: toStringValue(item.to) || undefined,
      changedBy: toStringValue(item.changedBy) || undefined,
      changedAt: toStringValue(item.changedAt) || undefined,
      note: toStringValue(item.note) || undefined,
    };
  });
}

function mapDireccionEnvio(input: unknown): OrderDireccionEnvio | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const item = input as UnknownRecord;
  return {
    nombre: toStringValue(item.nombre ?? item.nombreCompleto) || undefined,
    nombreCompleto: toStringValue(item.nombreCompleto) || undefined,
    telefono: toStringValue(item.telefono) || undefined,
    calle: toStringValue(item.calle) || undefined,
    numero: toStringValue(item.numero ?? item.numeroExterior) || undefined,
    numeroExterior: toStringValue(item.numeroExterior) || undefined,
    numeroInterior: toStringValue(item.numeroInterior) || undefined,
    colonia: toStringValue(item.colonia) || undefined,
    ciudad: toStringValue(item.ciudad) || undefined,
    estado: toStringValue(item.estado) || undefined,
    codigoPostal: toStringValue(item.codigoPostal) || undefined,
    pais: toStringValue(item.pais) || undefined,
    referencias: toStringValue(item.referencias) || undefined,
    instruccionesEntrega:
      toStringValue(item.instruccionesEntrega) || undefined,
    email: toStringValue(item.email) || undefined,
  };
}

function mapOrden(input: unknown): Orden {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};
  const pickupLocation =
    item.pickupLocation && typeof item.pickupLocation === "object"
      ? (item.pickupLocation as UnknownRecord)
      : undefined;

  const itemsDetallados = Array.isArray(item.itemsDetallados)
    ? item.itemsDetallados
    : item.items;

  return {
    id: toStringValue(item.id ?? item._id ?? item.ordenId),
    usuarioId: toStringValue(item.usuarioId) || undefined,
    estado: toStringValue(item.estado, "PENDIENTE"),
    total: toNumber(item.total, 0),
    subtotal: toNumber(item.subtotal, 0),
    subtotalOriginal:
      item.subtotalOriginal === undefined
        ? undefined
        : toNumber(item.subtotalOriginal, 0),
    shippingCost: toNumber(item.costoEnvio ?? item.shippingCost, 0),
    impuestos:
      item.impuestos === undefined ? undefined : toNumber(item.impuestos, 0),
    discountTotal:
      item.discountTotal === undefined
        ? undefined
        : toNumber(item.discountTotal, 0),
    descuentoCodigoPromocion:
      item.descuentoCodigoPromocion === undefined
        ? undefined
        : toNumber(item.descuentoCodigoPromocion, 0),
    codigoPromocion: toStringValue(item.codigoPromocion) || undefined,
    codigoPromocionTitulo:
      toStringValue(item.codigoPromocionTitulo) || undefined,
    metodoPago: toStringValue(item.metodoPago) || undefined,
    paymentStatus: toStringValue(item.paymentStatus) || undefined,
    preparationStatus: toStringValue(item.preparationStatus) || undefined,
    items: mapItems(itemsDetallados),
    direccionEnvio: mapDireccionEnvio(item.direccionEnvio),
    numeroGuia: toStringValue(item.numeroGuia) || undefined,
    transportista: toStringValue(item.transportista) || undefined,
    shippingHistory: mapHistory(item.shippingHistory),
    fulfillmentMethod:
      ["PICKUP", "pickup"].includes(toStringValue(item.fulfillmentMethod))
        ? "PICKUP"
        : ["DELIVERY", "home_delivery"].includes(
              toStringValue(item.fulfillmentMethod),
            )
          ? "DELIVERY"
          : undefined,
    fulfillmentStatus: toStringValue(item.fulfillmentStatus) || undefined,
    shipping: mapShipping(item.shipping),
    pickupLocation: pickupLocation
      ? {
          id: toStringValue(pickupLocation.id ?? pickupLocation._id) || undefined,
          name:
            toStringValue(pickupLocation.name ?? pickupLocation.nombre) ||
            undefined,
          address:
            toStringValue(pickupLocation.address ?? pickupLocation.direccion) ||
            undefined,
          city:
            toStringValue(pickupLocation.city ?? pickupLocation.ciudad) ||
            undefined,
          state:
            toStringValue(pickupLocation.state ?? pickupLocation.estado) ||
            undefined,
          postalCode:
            toStringValue(
              pickupLocation.postalCode ?? pickupLocation.codigoPostal,
            ) || undefined,
          phone:
            toStringValue(pickupLocation.phone ?? pickupLocation.telefono) ||
            undefined,
        }
      : undefined,
    pickupInstructions: toStringValue(item.pickupInstructions) || undefined,
    pickupContact:
      item.pickupContact && typeof item.pickupContact === "object"
        ? {
            name:
              toStringValue((item.pickupContact as UnknownRecord).name) ||
              undefined,
            phone:
              toStringValue((item.pickupContact as UnknownRecord).phone) ||
              undefined,
            email:
              toStringValue((item.pickupContact as UnknownRecord).email) ||
              undefined,
          }
        : undefined,
    pickupCodeLast4: toStringValue(item.pickupCodeLast4) || undefined,
    pickupQrPayload: toStringValue(item.pickupQrPayload) || undefined,
    readyForPickupAt: toStringValue(item.readyForPickupAt) || undefined,
    pickedUpAt: toStringValue(item.pickedUpAt) || undefined,
    pickupExpiresAt: toStringValue(item.pickupExpiresAt) || undefined,
    deliveredAt: toStringValue(item.deliveredAt) || undefined,
    createdAt: toStringValue(item.createdAt ?? item.fechaCreacion) || undefined,
    updatedAt: toStringValue(item.updatedAt) || undefined,
  };
}

function normalizeRefundState(value: unknown) {
  const normalized = toStringValue(value).trim().toLowerCase();
  if (normalized === "completed") return "succeeded";
  return normalized || undefined;
}

function mapRefund(input: unknown): RefundItem {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    id: toStringValue(item.id ?? item.refundId ?? item.reference) || undefined,
    status: toStringValue(item.status) || undefined,
    refundState: normalizeRefundState(item.refundState) || undefined,
    refundDate: toStringValue(item.refundDate ?? item.createdAt) || null,
    amount: toNumber(item.amount, 0),
  };
}

function mapPago(input: unknown): Pago | null {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};
  const id = toStringValue(item.id ?? item._id ?? item.pagoId);
  const provider = toStringValue(
    item.provider ?? item.proveedor ?? item.metodoPago,
  ).toLowerCase();

  if (!id) {
    return null;
  }

  return {
    id,
    ordenId: toStringValue(item.ordenId),
    provider: provider || undefined,
    paymentIntentId: toStringValue(item.paymentIntentId) || undefined,
    clientSecret: toStringValue(item.clientSecret) || undefined,
    status: toStringValue(item.status ?? item.estado, "PENDIENTE"),
    monto: toNumber(item.monto ?? item.total, 0),
    moneda: toStringValue(item.moneda ?? item.currency) || undefined,
    totalRefundedAmount:
      item.totalRefundedAmount === undefined
        ? undefined
        : toNumber(item.totalRefundedAmount, 0),
    refunds: Array.isArray(item.refunds) ? item.refunds.map(mapRefund) : undefined,
    createdAt: toStringValue(item.createdAt) || undefined,
  };
}

function buildQuery(query?: Record<string, string | undefined>) {
  if (!query) return "";
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export type ListOrdenesQuery = {
  estado?: string;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};

export const ordersApi = {
  /** @deprecated Usa startCheckoutAttempt + Stripe Embedded Checkout. */
  create(payload: Record<string, unknown>) {
    return apiFetch<unknown>(
      "/api/ordenes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { local: true },
    );
  },

  async list(query?: ListOrdenesQuery) {
    const payload = await apiFetch<unknown>(
      `/api/ordenes${buildQuery(query)}`,
      { method: "GET" },
      { local: true },
    );

    const data = unwrapData<unknown>(payload);
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(mapOrden).filter((item) => Boolean(item.id));
  },

  async getById(id: string) {
    const payload = await apiFetch<unknown>(
      `/api/ordenes/${id}`,
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }

    return mapOrden(data);
  },

  async getPago(id: string) {
    const payload = await apiFetch<unknown>(
      `/api/ordenes/${id}/pago`,
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    return mapPago(data);
  },

  updateEstado(id: string, estado: string) {
    return apiFetch<unknown>(
      `/api/ordenes/${id}/estado`,
      {
        method: "PUT",
        body: JSON.stringify({ estado }),
      },
      { local: true },
    );
  },

  cancel(id: string) {
    return apiFetch<unknown>(
      `/api/ordenes/${id}/cancelar`,
      { method: "PUT" },
      { local: true },
    );
  },
};

export type ManualShippingStatusInput =
  | "IN_TRANSIT"
  | "DELIVERED"
  | "INCIDENT"
  | "RETURNED";

export type ManualTrackingInput = {
  trackingNumber: string;
  serviceName?: string;
  realShippingCost?: number;
  notes?: string;
};

/**
 * Operaciones admin de fulfillment (envio manual FedEx y pickup en tienda).
 * Consumen los endpoints protegidos del backend via BFF.
 */
export const fulfillmentAdminApi = {
  // --- Envio a domicilio (FedEx manual) ---
  markPreparing(orderId: string, note?: string) {
    return apiFetch<unknown>(
      `/api/admin/orders/${orderId}/manual-shipping/preparing`,
      { method: "POST", body: JSON.stringify(note ? { note } : {}) },
      { local: true },
    );
  },

  markReadyToShip(orderId: string, note?: string) {
    return apiFetch<unknown>(
      `/api/admin/orders/${orderId}/manual-shipping/ready-to-ship`,
      { method: "POST", body: JSON.stringify(note ? { note } : {}) },
      { local: true },
    );
  },

  captureTracking(orderId: string, input: ManualTrackingInput) {
    return apiFetch<unknown>(
      `/api/admin/orders/${orderId}/manual-shipping/tracking`,
      { method: "POST", body: JSON.stringify(input) },
      { local: true },
    );
  },

  updateShippingStatus(
    orderId: string,
    status: ManualShippingStatusInput,
    note?: string,
  ) {
    return apiFetch<unknown>(
      `/api/admin/orders/${orderId}/manual-shipping/status`,
      {
        method: "POST",
        body: JSON.stringify({ status, ...(note ? { note } : {}) }),
      },
      { local: true },
    );
  },

  // --- Recoger en tienda (pickup) ---
  pickupPrepare(orderId: string) {
    return apiFetch<unknown>(
      `/api/admin/pickup-orders/${orderId}/prepare`,
      { method: "POST", body: JSON.stringify({}) },
      { local: true },
    );
  },

  pickupReady(orderId: string) {
    return apiFetch<unknown>(
      `/api/admin/pickup-orders/${orderId}/ready`,
      { method: "POST", body: JSON.stringify({}) },
      { local: true },
    );
  },

  pickupComplete(orderId: string, input: { code: string; pickedUpBy?: string }) {
    return apiFetch<unknown>(
      `/api/admin/pickup-orders/${orderId}/complete`,
      { method: "POST", body: JSON.stringify(input) },
      { local: true },
    );
  },
};
