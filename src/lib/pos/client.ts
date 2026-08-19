import { apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import type {
  PosAuditEvent,
  PosCashCount,
  PosCashMovement,
  PosContext,
  PosCutDetail,
  PosCutPreview,
  PosCutSummary,
  PosDailySummaryReport,
  PosPage,
  PosRegister,
  PosSale,
  PosShiftReport,
  PosTicket,
} from "./types";

const DEVICE_KEY = "club-leon-pos-device-id";
const INTENT_PREFIX = "club-leon-pos-intent";

export type PosIntentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getIntentStorage(): PosIntentStorage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function intentStorageKey(operation: string, resourceId: string) {
  return `${INTENT_PREFIX}:${operation}:${resourceId}`;
}

function intentResource(resourceId: string, payload: unknown) {
  const value = `${resourceId}:${JSON.stringify(payload)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${resourceId}:${(hash >>> 0).toString(16)}`;
}

export function createPosIdempotencyKey(operation: string): string {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `pos-web:${operation}:${random}`;
}

export function getOrCreatePosIntentKey(
  operation: string,
  resourceId: string,
  storage: PosIntentStorage | null = getIntentStorage(),
): string {
  const key = intentStorageKey(operation, resourceId);
  const current = storage?.getItem(key);
  if (current) return current;
  const created = createPosIdempotencyKey(operation);
  storage?.setItem(key, created);
  return created;
}

export function completePosIntent(
  operation: string,
  resourceId: string,
  storage: PosIntentStorage | null = getIntentStorage(),
) {
  storage?.removeItem(intentStorageKey(operation, resourceId));
}

export function isPosPaymentTerminal(sale: Pick<PosSale, "status">) {
  return sale.status !== "PAYMENT_PENDING";
}

export function getPosDeviceId(): string {
  if (typeof window === "undefined") return "pos-web-server";
  const current = window.localStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const id = createPosIdempotencyKey("device").replace("pos-web:device:", "web-");
  window.localStorage.setItem(DEVICE_KEY, id);
  return id;
}

type RequestOptions<T> = ApiFetchOptions & {
  intent?: { operation: string; resourceId: string };
  intentTerminal?: (response: T) => boolean;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions<T> = {},
) {
  const { intent, intentTerminal, ...apiOptions } = options;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json, application/problem+json");
  headers.set("X-Pos-Device-Id", getPosDeviceId());
  const idempotencyKey = intent
    ? getOrCreatePosIntentKey(
        intent.operation,
        intent.resourceId,
      )
    : apiOptions.idempotencyKey;
  const response = await apiFetch<T>(
      `/api/pos/v1${path}`,
      { ...init, headers },
      { ...apiOptions, idempotencyKey, local: true },
    );
  if (intent && (!intentTerminal || intentTerminal(response))) {
    completePosIntent(intent.operation, intent.resourceId);
  }
  return response;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const posApi = {
  context: (token?: string) =>
    request<PosContext>("/context", { method: "GET" }, { token }),
  registers: (token?: string) =>
    request<PosPage<PosRegister>>("/registers?limit=100", { method: "GET" }, { token }),
  createRegister: (
    payload: {
      code: string;
      name: string;
      allowCash?: boolean;
      allowCardExternal?: boolean;
    },
    token?: string,
  ) =>
    request<{ register: PosRegister }>(
      "/registers",
      json("POST", payload),
      {
        token,
        intent: {
          operation: "register-create",
          resourceId: intentResource(payload.code.toUpperCase(), payload),
        },
      },
    ),
  openRegister: (
    registerId: string,
    openingFloatMinor: number,
    token?: string,
  ) =>
    request<{ register: PosRegister }>(
      `/registers/${registerId}/open`,
      json("POST", { openingFloatMinor }),
      {
        token,
        intent: {
          operation: "register-open",
          resourceId: intentResource(registerId, { openingFloatMinor }),
        },
      },
    ),
  startShift: (sessionId: string, receivedFloatMinor: number, token?: string) =>
    request<{ shift: PosContext["activeShift"] }>(
      `/register-sessions/${sessionId}/shifts`,
      json("POST", { receivedFloatMinor }),
      {
        token,
        intent: {
          operation: "shift-start",
          resourceId: intentResource(sessionId, { receivedFloatMinor }),
        },
      },
    ),
  createSale: (payload: { customerName?: string; note?: string }, token?: string) =>
    request<{ sale: PosSale }>("/sales", json("POST", payload), { token }),
  getSale: (saleId: string, token?: string) =>
    request<{ sale: PosSale }>(`/sales/${saleId}`, { method: "GET" }, { token }),
  listSales: (query: string, token?: string) =>
    request<PosPage<PosSale>>(`/sales?${query}`, { method: "GET" }, { token }),
  addItem: (
    saleId: string,
    payload: { productoId: string; tallaId?: string | null; quantity: number },
    token?: string,
  ) =>
    request<{ sale: PosSale }>(`/sales/${saleId}/items`, json("POST", payload), {
      token,
    }),
  updateItem: (saleId: string, itemId: string, quantity: number, token?: string) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/items/${itemId}`,
      json("PATCH", { quantity }),
      { token },
    ),
  removeItem: (saleId: string, itemId: string, token?: string) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/items/${itemId}`,
      { method: "DELETE" },
      { token },
    ),
  reprice: (saleId: string, token?: string) =>
    request<{ sale: PosSale }>(`/sales/${saleId}/reprice`, json("POST"), { token }),
  returnToDraft: (saleId: string, token?: string) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/return-to-draft`,
      json("POST"),
      { token },
    ),
  applyCode: (saleId: string, codigo: string, token?: string) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/apply-code`,
      json("POST", { codigo }),
      { token },
    ),
  removeCode: (saleId: string, token?: string) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/applied-code`,
      { method: "DELETE" },
      { token },
    ),
  preview: (saleId: string, token?: string) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/checkout-preview`,
      json("POST"),
      { token },
    ),
  suspend: (saleId: string, token?: string) =>
    request<{ sale: PosSale }>(`/sales/${saleId}/suspend`, json("POST"), { token }),
  resume: (saleId: string, token?: string) =>
    request<{ sale: PosSale }>(`/sales/${saleId}/resume`, json("POST"), { token }),
  payCash: (
    saleId: string,
    payload: { amountMinor?: number; receivedMinor: number },
    token?: string,
  ) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/payments/cash`,
      json("POST", payload),
      {
        token,
        intent: {
          operation: "payment-cash",
          resourceId: intentResource(saleId, payload),
        },
        intentTerminal: (response) => isPosPaymentTerminal(response.sale),
      },
    ),
  payCard: (
    saleId: string,
    payload: {
      amountMinor: number;
      terminalId?: string;
      reference?: string;
      authorizationCode?: string | null;
      cardBrand?: string | null;
      last4?: string | null;
      approvedAtClientReported?: string;
    },
    token?: string,
  ) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/payments/card-external`,
      json("POST", payload),
      {
        token,
        intent: {
          operation: "payment-card",
          resourceId: intentResource(saleId, {
            amountMinor: payload.amountMinor,
            terminalId: payload.terminalId,
            reference: payload.reference,
            authorizationCode: payload.authorizationCode,
            cardBrand: payload.cardBrand,
            last4: payload.last4,
          }),
        },
        intentTerminal: (response) => isPosPaymentTerminal(response.sale),
      },
    ),
  payMixed: (
    saleId: string,
    payload: {
      cash: { amountMinor: number; receivedMinor: number };
      card: {
        amountMinor: number;
        terminalId?: string;
        reference?: string;
        authorizationCode?: string | null;
        cardBrand?: string | null;
        last4?: string | null;
        approvedAtClientReported?: string;
      };
    },
    token?: string,
  ) =>
    request<{ sale: PosSale }>(
      `/sales/${saleId}/payments/mixed`,
      json("POST", payload),
      {
        token,
        intent: {
          operation: "payment-mixed",
          resourceId: intentResource(saleId, {
            cash: payload.cash,
            card: {
              amountMinor: payload.card.amountMinor,
              terminalId: payload.card.terminalId,
              reference: payload.card.reference,
              authorizationCode: payload.card.authorizationCode,
              cardBrand: payload.card.cardBrand,
              last4: payload.card.last4,
            },
          }),
        },
        intentTerminal: (response) => isPosPaymentTerminal(response.sale),
      },
    ),
  ticket: (saleId: string, token?: string) =>
    request<{ ticket: PosTicket }>(`/sales/${saleId}/ticket`, { method: "GET" }, { token }),
  cashMovements: (shiftId: string, token?: string) =>
    request<PosPage<PosCashMovement>>(
      `/cash-movements?shiftId=${encodeURIComponent(shiftId)}&limit=50`,
      { method: "GET" },
      { token },
    ),
  createCashMovement: (
    payload: {
      type: string;
      amountMinor: number;
      reason: string;
      description?: string;
      direction?: "IN" | "OUT";
      shiftId?: string;
    },
    token?: string,
  ) =>
    request<{ movement: PosCashMovement }>(
      "/cash-movements",
      json("POST", payload),
      {
        token,
        intent: {
          operation: "cash-movement",
          resourceId: intentResource(payload.shiftId ?? "unassigned", payload),
        },
      },
    ),
  startCount: (shiftId: string, token?: string) =>
    request<{ cut: PosCutDetail }>(`/shifts/${shiftId}/start-count`, json("POST"), {
      token,
      intent: { operation: "count-start", resourceId: shiftId },
    }),
  cancelCount: (shiftId: string, token?: string) =>
    request<{ cut: PosCutDetail }>(
      `/shifts/${shiftId}/cancel-count`,
      json("POST"),
      {
        token,
        intent: { operation: "count-cancel", resourceId: shiftId },
      },
    ),
  cutPreview: (shiftId: string, token?: string) =>
    request<{ preview: PosCutPreview }>(
      `/shifts/${shiftId}/cut-preview`,
      { method: "GET" },
      { token },
    ),
  submitCount: (
    shiftId: string,
    payload: {
      denominations?: Array<{ denominationMinor: number; pieces: number }>;
      countedCashMinor?: number;
      note?: string;
    },
    token?: string,
  ) =>
    request<{ count: PosCashCount; cut: PosCutDetail }>(
      `/shifts/${shiftId}/cash-counts`,
      json("POST", payload),
      {
        token,
        intent: {
          operation: "count-submit",
          resourceId: intentResource(shiftId, payload),
        },
      },
    ),
  getCut: (cutId: string, token?: string) =>
    request<{ cut: PosCutDetail }>(
      `/cuts/${encodeURIComponent(cutId)}`,
      { method: "GET" },
      { token },
    ),
  listAuditEvents: (query: string, token?: string) =>
    request<PosPage<PosAuditEvent>>(
      `/audit-events?${query}`,
      { method: "GET" },
      { token },
    ),
  createReturn: (
    saleId: string,
    payload: {
      items: Array<{
        itemId: string;
        quantity: number;
        physicalCondition:
          | "RETURNED_RESELLABLE"
          | "RETURNED_DAMAGED"
          | "NOT_RETURNED";
      }>;
      reason: string;
    },
    token?: string,
  ) =>
    request<unknown>(`/sales/${saleId}/returns`, json("POST", payload), {
      token,
      intent: {
        operation: "return-create",
        resourceId: intentResource(saleId, payload),
      },
    }),
  shiftsReport: (
    query: { from: string; to: string; registerId?: string },
    token?: string,
  ) => {
    const params = new URLSearchParams({
      from: query.from,
      to: query.to,
    });
    if (query.registerId) params.set("registerId", query.registerId);
    return request<PosShiftReport>(
      `/reports/shifts?${params.toString()}`,
      { method: "GET" },
      { token },
    );
  },
  dailySummaryReport: (
    query: { from: string; to: string },
    token?: string,
  ) => {
    const params = new URLSearchParams({
      from: query.from,
      to: query.to,
    });
    return request<PosDailySummaryReport>(
      `/reports/daily-summary?${params.toString()}`,
      { method: "GET" },
      { token },
    );
  },
  listCuts: (query: string, token?: string) =>
    request<PosPage<PosCutSummary>>(`/cuts?${query}`, { method: "GET" }, { token }),
};

export function formatPosMoney(minor: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function pesosToMinor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}
