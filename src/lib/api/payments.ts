import type {
  Pago,
  PaymentInitPayload,
  PaymentInitResponse,
} from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapPago(input: unknown): Pago {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    id: toStringValue(item.id ?? item._id ?? item.pagoId),
    ordenId: toStringValue(item.ordenId),
    paymentIntentId: toStringValue(item.paymentIntentId) || undefined,
    clientSecret: toStringValue(item.clientSecret) || undefined,
    status: toStringValue(item.status ?? item.estado, "PENDIENTE"),
    monto: toNumber(item.monto ?? item.total, 0),
    moneda: toStringValue(item.moneda ?? item.currency) || undefined,
    createdAt: toStringValue(item.createdAt) || undefined,
  };
}

export const paymentsApi = {
  async iniciar(payload: PaymentInitPayload, idempotencyKey?: string) {
    const raw = await apiFetch<unknown>(
      "/api/pagos/iniciar",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { local: true, idempotencyKey },
    );

    const data = unwrapData<unknown>(raw);
    const record =
      data && typeof data === "object" ? (data as UnknownRecord) : {};

    return {
      pagoId: toStringValue(record.pagoId ?? record.id),
      paymentIntentId: toStringValue(record.paymentIntentId),
      clientSecret: toStringValue(record.clientSecret),
      status: toStringValue(record.status ?? record.estado, "PENDIENTE"),
    } as PaymentInitResponse;
  },

  async getByOrden(ordenId: string) {
    const payload = await apiFetch<unknown>(
      `/api/pagos/orden/${ordenId}`,
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }
    return mapPago(data);
  },

  async getById(id: string) {
    const payload = await apiFetch<unknown>(
      `/api/pagos/${id}`,
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }
    return mapPago(data);
  },

  reembolsoAdmin(
    id: string,
    body?: { refundAmount?: number; refundReason?: string },
  ) {
    return apiFetch<unknown>(
      `/api/pagos/${id}/reembolso`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
      { local: true },
    );
  },

  async getConfig() {
    const raw = await apiFetch<unknown>(
      "/api/stripe/config",
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(raw);
    const record =
      data && typeof data === "object" ? (data as UnknownRecord) : {};
    return {
      publishableKey: toStringValue(record.publishableKey),
    };
  },

  async createCheckoutSession(
    ordenId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const raw = await apiFetch<unknown>(
      "/api/stripe/checkout-sessions",
      {
        method: "POST",
        body: JSON.stringify({ orderId: ordenId, successUrl, cancelUrl }),
      },
      { local: true },
    );
    const data = unwrapData<unknown>(raw);
    const record =
      data && typeof data === "object" ? (data as UnknownRecord) : {};
    return {
      url: toStringValue(record.url),
    };
  },

  async createSetupIntent(customerId?: string) {
    const raw = await apiFetch<unknown>(
      "/api/stripe/setup-intents",
      {
        method: "POST",
        body: JSON.stringify({ customerId }),
      },
      { local: true },
    );
    const data = unwrapData<unknown>(raw);
    const record =
      data && typeof data === "object" ? (data as UnknownRecord) : {};
    return {
      clientSecret: toStringValue(record.clientSecret),
    };
  },

  async createBillingPortalSession(returnUrl: string) {
    const raw = await apiFetch<unknown>(
      "/api/stripe/billing-portal",
      {
        method: "POST",
        body: JSON.stringify({ returnUrl }),
      },
      { local: true },
    );
    const data = unwrapData<unknown>(raw);
    const record =
      data && typeof data === "object" ? (data as UnknownRecord) : {};
    return {
      url: toStringValue(record.url),
    };
  },
};
