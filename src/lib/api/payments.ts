import type {
  AplazoAdminActionResponse,
  AplazoRefundCreateResponse,
  AplazoRefundRequest,
  AplazoRefundRequestListResponse,
  AplazoRefundRequestPayload,
  AplazoRefundRequestStatus,
  AplazoRefundRequestResponse,
  AplazoRefundStatusResponse,
  AplazoOnlineCreatePayload,
  AplazoOnlineCreateResponse,
  AplazoPaymentStatus,
  AplazoPaymentStatusResponse,
  AplazoReturnKind,
  AplazoReturnResponse,
  PaymentTimelineEvent,
  Pago,
  PaymentInitPayload,
  PaymentInitResponse,
} from "@/lib/types";
import {
  isAplazoTerminalStatus,
  normalizeAplazoStatus,
} from "@/lib/aplazo";
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return fallback;
}

function buildQueryString(query: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      searchParams.set(key, value);
    }
  });

  const search = searchParams.toString();
  return search ? `?${search}` : "";
}

function normalizeAplazoStatusValue(
  value: unknown,
  fallback: AplazoPaymentStatus = "pending_customer",
) {
  return normalizeAplazoStatus(toStringValue(value)) ?? fallback;
}

function normalizeRefundState(value: unknown) {
  const normalized = toStringValue(value).trim().toLowerCase();
  if (normalized === "completed") return "succeeded";
  return normalized || undefined;
}

function mapAplazoRefundResponse(
  input: unknown,
  paymentAttemptIdFallback = "",
): AplazoRefundStatusResponse {
  const data = unwrapData<unknown>(input);
  const record =
    data && typeof data === "object" ? (data as UnknownRecord) : {};

  return {
    ok: true,
    paymentAttemptId: toStringValue(
      record.paymentAttemptId,
      paymentAttemptIdFallback,
    ),
    provider: "aplazo",
    status: normalizeAplazoStatusValue(
      record.status,
      toNumber(record.totalRefundedAmount, 0) > 0
        ? "partially_refunded"
        : "pending_customer",
    ),
    refundState: normalizeRefundState(record.refundState),
    providerStatus: toStringValue(record.providerStatus) || undefined,
    refundId: toStringValue(record.refundId) || undefined,
    refundAmount:
      record.refundAmount === undefined
        ? undefined
        : toNumber(record.refundAmount, 0),
    totalRefundedAmount: toNumber(record.totalRefundedAmount, 0),
    currency: toStringValue(record.currency, "MXN") || "MXN",
    refunds: Array.isArray(record.refunds)
      ? record.refunds.map((refund) => {
          const refundRecord =
            refund && typeof refund === "object"
              ? (refund as UnknownRecord)
              : {};

          return {
            id: toStringValue(
              refundRecord.id ?? refundRecord.refundId ?? refundRecord.reference,
            ),
            status: toStringValue(refundRecord.status, "PROCESSING"),
            refundState:
              normalizeRefundState(refundRecord.refundState) || "processing",
            refundDate: toStringValue(
              refundRecord.refundDate ?? refundRecord.createdAt,
            ) || null,
            amount: toNumber(refundRecord.amount, 0),
          };
        })
      : [],
  };
}

function mapAplazoAdminActionResponse(
  input: unknown,
  paymentAttemptIdFallback: string,
): AplazoAdminActionResponse {
  const data = unwrapData<unknown>(input);
  const record =
    data && typeof data === "object" ? (data as UnknownRecord) : {};

  return {
    ok: true,
    paymentAttemptId: toStringValue(
      record.paymentAttemptId,
      paymentAttemptIdFallback,
    ),
    provider: "aplazo",
    status: normalizeAplazoStatusValue(record.status),
    providerStatus: toStringValue(record.providerStatus) || undefined,
  };
}

function normalizeAplazoRefundRequestStatus(
  value: unknown,
): AplazoRefundRequestStatus {
  const normalized = toStringValue(value).trim().toLowerCase();
  if (
    normalized === "approved" ||
    normalized === "rejected" ||
    normalized === "processed"
  ) {
    return normalized;
  }

  return "pending";
}

function mapAplazoRefundRequest(input: unknown): AplazoRefundRequest {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    id: toStringValue(item.id ?? item._id),
    provider: "aplazo",
    orderId: toStringValue(item.orderId ?? item.ordenId),
    paymentAttemptId: toStringValue(
      item.paymentAttemptId ?? item.attemptId ?? item.intentoPagoId,
    ),
    userId: toStringValue(item.userId ?? item.usuarioId),
    reason: toStringValue(item.reason ?? item.motivo),
    status: normalizeAplazoRefundRequestStatus(item.status ?? item.estado),
    refundAmount:
      item.refundAmount === undefined
        ? undefined
        : toNumber(item.refundAmount, 0),
    refundAmountMinor:
      item.refundAmountMinor === undefined
        ? undefined
        : toNumber(item.refundAmountMinor, 0),
    providerRefundId: toStringValue(item.providerRefundId) || undefined,
    providerStatus: toStringValue(item.providerStatus) || undefined,
    rejectionReason:
      toStringValue(item.rejectionReason ?? item.rejectedReason) || undefined,
    lastProcessingError: toStringValue(item.lastProcessingError) || undefined,
    createdAt: toStringValue(item.createdAt) || undefined,
    updatedAt: toStringValue(item.updatedAt) || undefined,
    approvedAt: toStringValue(item.approvedAt) || undefined,
    processedAt: toStringValue(item.processedAt) || undefined,
    rejectedAt: toStringValue(item.rejectedAt) || undefined,
  };
}

function mapAplazoRefundRequestResponse(
  input: unknown,
): AplazoRefundRequestResponse {
  const data = unwrapData<unknown>(input);
  return {
    ok: true,
    data: mapAplazoRefundRequest(data),
  };
}

function mapAplazoRefundRequestListResponse(
  input: unknown,
): AplazoRefundRequestListResponse {
  const data = unwrapData<unknown>(input);
  const list = Array.isArray(data) ? data : [];

  return {
    ok: true,
    count:
      input && typeof input === "object" && "count" in input
        ? toNumber((input as UnknownRecord).count, list.length)
        : list.length,
    data: list.map(mapAplazoRefundRequest).filter((item) => Boolean(item.id)),
  };
}

function mapPago(input: unknown): Pago {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};
  const provider = toStringValue(
    item.provider ?? item.proveedor ?? item.metodoPago,
  ).toLowerCase();
  const id = toStringValue(item.id ?? item._id ?? item.pagoId);
  const explicitPaymentAttemptId = toStringValue(
    item.paymentAttemptId ?? item.attemptId ?? item.intentoPagoId,
  );
  const paymentAttemptId =
    explicitPaymentAttemptId || (provider.includes("aplazo") ? id : "");

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
    refunds: Array.isArray(item.refunds)
      ? item.refunds.map((refund) => {
          const refundRecord =
            refund && typeof refund === "object"
              ? (refund as UnknownRecord)
              : {};

          return {
            id: toStringValue(
              refundRecord.id ?? refundRecord.refundId ?? refundRecord.reference,
            ),
            status: toStringValue(refundRecord.status) || undefined,
            refundState:
              normalizeRefundState(refundRecord.refundState) || undefined,
            refundDate: toStringValue(
              refundRecord.refundDate ?? refundRecord.createdAt,
            ) || null,
            amount: toNumber(refundRecord.amount, 0),
          };
        })
      : undefined,
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

  async createAplazoOnlineAttempt(
    payload: AplazoOnlineCreatePayload,
    idempotencyKey?: string,
  ) {
    const raw = await apiFetch<AplazoOnlineCreateResponse>(
      "/api/payments/aplazo/online/create",
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
      ok: true,
      paymentAttemptId: toStringValue(record.paymentAttemptId),
      provider: toStringValue(record.provider, "aplazo"),
      flowType: toStringValue(record.flowType, "online"),
      status: normalizeAplazoStatusValue(record.status),
      redirectUrl: toStringValue(record.redirectUrl) || undefined,
      checkoutUrl: toStringValue(record.checkoutUrl) || undefined,
      expiresAt: toStringValue(record.expiresAt) || null,
    } as AplazoOnlineCreateResponse;
  },

  async getAplazoPaymentStatus(paymentAttemptId: string) {
    const raw = await apiFetch<AplazoPaymentStatusResponse>(
      `/api/payments/${paymentAttemptId}/status`,
      { method: "GET" },
      { local: true },
    );

    const data = unwrapData<unknown>(raw);
    const record =
      data && typeof data === "object" ? (data as UnknownRecord) : {};

    const status = normalizeAplazoStatusValue(record.status);
    const isTerminal = toBoolean(
      record.isTerminal,
      isAplazoTerminalStatus(status),
    );

    return {
      ok: true,
      paymentAttemptId: toStringValue(record.paymentAttemptId, paymentAttemptId),
      provider: toStringValue(record.provider, "aplazo"),
      status,
      providerStatus: toStringValue(record.providerStatus) || undefined,
      amount: toNumber(record.amount, 0),
      currency: toStringValue(record.currency, "MXN") || undefined,
      paidAt: toStringValue(record.paidAt) || null,
      expiresAt: toStringValue(record.expiresAt) || null,
      isTerminal,
      nextPollAfterMs: toNumber(record.nextPollAfterMs, isTerminal ? 0 : 3000),
    } as AplazoPaymentStatusResponse;
  },

  getPaymentStatus(paymentAttemptId: string) {
    return this.getAplazoPaymentStatus(paymentAttemptId);
  },

  async getAplazoReturnPayload(
    kind: AplazoReturnKind,
    query: {
      paymentAttemptId?: string;
      providerPaymentId?: string;
      providerReference?: string;
    },
  ) {
    const search = buildQueryString(query);
    const raw = await apiFetch<AplazoReturnResponse>(
      `/api/payments/aplazo/returns/${kind}${search}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
      { local: true },
    );

    const data = unwrapData<unknown>(raw);
    const record =
      data && typeof data === "object" ? (data as UnknownRecord) : {};
    const status = normalizeAplazoStatusValue(record.status);
    const isTerminal = toBoolean(
      record.isTerminal,
      isAplazoTerminalStatus(status),
    );

    return {
      ok: true,
      paymentAttemptId: toStringValue(record.paymentAttemptId) || undefined,
      provider: toStringValue(record.provider, "aplazo"),
      status,
      message: toStringValue(record.message) || undefined,
      isTerminal,
      nextPollAfterMs: toNumber(record.nextPollAfterMs, isTerminal ? 0 : 3000),
    } as AplazoReturnResponse;
  },

  async reconcileAplazoAttempt(paymentAttemptId: string) {
    const raw = await apiFetch<AplazoAdminActionResponse>(
      `/api/admin/payments/aplazo/${paymentAttemptId}/reconcile`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
      { local: true },
    );

    return mapAplazoAdminActionResponse(raw, paymentAttemptId);
  },

  async cancelAplazoAttempt(paymentAttemptId: string, reason: string) {
    const raw = await apiFetch<AplazoAdminActionResponse>(
      `/api/admin/payments/aplazo/${paymentAttemptId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
      { local: true },
    );

    return mapAplazoAdminActionResponse(raw, paymentAttemptId);
  },

  cancelPayment(paymentAttemptId: string, reason: string) {
    return this.cancelAplazoAttempt(paymentAttemptId, reason);
  },

  async createAplazoRefund(
    paymentAttemptId: string,
    body?: AplazoRefundRequestPayload,
  ) {
    const raw = await apiFetch<AplazoRefundCreateResponse>(
      `/api/admin/payments/aplazo/${paymentAttemptId}/refund`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
      { local: true },
    );

    return mapAplazoRefundResponse(raw, paymentAttemptId);
  },

  requestRefund(paymentAttemptId: string, body?: AplazoRefundRequestPayload) {
    return this.createAplazoRefund(paymentAttemptId, body);
  },

  async createAplazoRefundRequest(params: { orderId: string; reason: string }) {
    const raw = await apiFetch<AplazoRefundRequestResponse>(
      "/api/payments/aplazo/refund-requests",
      {
        method: "POST",
        body: JSON.stringify({
          orderId: params.orderId,
          reason: params.reason,
        }),
      },
      { local: true },
    );

    return mapAplazoRefundRequestResponse(raw);
  },

  async listAplazoRefundRequests(query?: { orderId?: string }) {
    const search = buildQueryString({
      orderId: query?.orderId?.trim() || undefined,
    });
    const raw = await apiFetch<AplazoRefundRequestListResponse>(
      `/api/payments/aplazo/refund-requests${search}`,
      { method: "GET" },
      { local: true },
    );

    return mapAplazoRefundRequestListResponse(raw);
  },

  async getAplazoRefundRequest(refundRequestId: string) {
    const raw = await apiFetch<AplazoRefundRequestResponse>(
      `/api/payments/aplazo/refund-requests/${refundRequestId}`,
      { method: "GET" },
      { local: true },
    );

    return mapAplazoRefundRequestResponse(raw);
  },

  async listAdminAplazoRefundRequests(query?: {
    status?: AplazoRefundRequestStatus | "all";
  }) {
    const search = buildQueryString({
      status:
        query?.status && query.status !== "all" ? query.status : undefined,
    });
    const raw = await apiFetch<AplazoRefundRequestListResponse>(
      `/api/admin/payments/aplazo/refund-requests${search}`,
      { method: "GET" },
      { local: true },
    );

    return mapAplazoRefundRequestListResponse(raw);
  },

  async approveAplazoRefundRequest(
    refundRequestId: string,
    body: { refundAmountMinor: number; reason?: string },
  ) {
    const raw = await apiFetch<AplazoRefundRequestResponse>(
      `/api/admin/payments/aplazo/refund-requests/${refundRequestId}/approve`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      { local: true },
    );

    return mapAplazoRefundRequestResponse(raw);
  },

  async rejectAplazoRefundRequest(
    refundRequestId: string,
    body: { reason: string },
  ) {
    const raw = await apiFetch<AplazoRefundRequestResponse>(
      `/api/admin/payments/aplazo/refund-requests/${refundRequestId}/reject`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      { local: true },
    );

    return mapAplazoRefundRequestResponse(raw);
  },

  async getAplazoRefundStatus(paymentAttemptId: string, refundId?: string) {
    const search = buildQueryString({
      refundId: refundId?.trim() || undefined,
    });
    const raw = await apiFetch<AplazoRefundStatusResponse>(
      `/api/admin/payments/aplazo/${paymentAttemptId}/refund/status${search}`,
      {
        method: "GET",
      },
      { local: true },
    );

    return mapAplazoRefundResponse(raw, paymentAttemptId);
  },

  getRefundStatus(paymentAttemptId: string, refundId?: string) {
    return this.getAplazoRefundStatus(paymentAttemptId, refundId);
  },

  async getAplazoAttemptEvents(paymentAttemptId: string) {
    const raw = await apiFetch<unknown>(
      `/api/admin/payments/aplazo/${paymentAttemptId}/events`,
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(raw);
    if (!Array.isArray(data)) {
      return [] as PaymentTimelineEvent[];
    }

    return data.flatMap((item) => {
      const record =
        item && typeof item === "object" ? (item as UnknownRecord) : {};
      const id = toStringValue(record.id);
      const title = toStringValue(record.title);
      const createdAt = toStringValue(record.createdAt);

      if (!id || !title || !createdAt) {
        return [];
      }

      return [
        {
          id,
          type: toStringValue(record.type, "manual_action") as PaymentTimelineEvent["type"],
          title,
          description: toStringValue(record.description) || undefined,
          createdAt,
          status: toStringValue(record.status) || undefined,
        },
      ];
    });
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
