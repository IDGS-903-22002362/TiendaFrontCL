import type { AplazoRefundItem, Orden, Pago } from "@/lib/types";
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

function mapOrden(input: unknown): Orden {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};
  const pickupLocation =
    item.pickupLocation && typeof item.pickupLocation === "object"
      ? (item.pickupLocation as UnknownRecord)
      : undefined;

  return {
    id: toStringValue(item.id ?? item._id ?? item.ordenId),
    usuarioId: toStringValue(item.usuarioId) || undefined,
    estado: toStringValue(item.estado, "PENDIENTE"),
    total: toNumber(item.total, 0),
    subtotal: toNumber(item.subtotal, 0),
    shippingCost: toNumber(item.costoEnvio ?? item.shippingCost, 0),
    metodoPago: toStringValue(item.metodoPago) || undefined,
    fulfillmentMethod:
      toStringValue(item.fulfillmentMethod) === "PICKUP"
        ? "PICKUP"
        : toStringValue(item.fulfillmentMethod) === "DELIVERY"
          ? "DELIVERY"
          : undefined,
    fulfillmentStatus: toStringValue(item.fulfillmentStatus) || undefined,
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
    pickupCodeLast4: toStringValue(item.pickupCodeLast4) || undefined,
    pickupQrPayload: toStringValue(item.pickupQrPayload) || undefined,
    readyForPickupAt: toStringValue(item.readyForPickupAt) || undefined,
    pickupExpiresAt: toStringValue(item.pickupExpiresAt) || undefined,
    createdAt: toStringValue(item.createdAt ?? item.fechaCreacion) || undefined,
    updatedAt: toStringValue(item.updatedAt) || undefined,
  };
}

function normalizeRefundState(value: unknown) {
  const normalized = toStringValue(value).trim().toLowerCase();
  if (normalized === "completed") return "succeeded";
  return normalized || undefined;
}

function mapRefund(input: unknown): AplazoRefundItem {
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
  const explicitPaymentAttemptId = toStringValue(
    item.paymentAttemptId ?? item.attemptId ?? item.intentoPagoId,
  );
  const provider = toStringValue(
    item.provider ?? item.proveedor ?? item.metodoPago,
  ).toLowerCase();
  const paymentAttemptId =
    explicitPaymentAttemptId || (provider.includes("aplazo") ? id : "");

  if (!id && !paymentAttemptId) {
    return null;
  }

  return {
    id,
    ordenId: toStringValue(item.ordenId),
    provider: provider || (paymentAttemptId ? "aplazo" : undefined),
    paymentAttemptId: paymentAttemptId || undefined,
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
