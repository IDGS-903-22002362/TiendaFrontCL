import type { CheckoutPayload } from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

const IDEMPOTENCY_STORAGE_KEY = "tiendafront_checkout_idempotency_key";

type UnknownRecord = Record<string, unknown>;

export type CheckoutAttemptStartPayload = CheckoutPayload & {
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutAttemptStartResult = {
  attemptId: string;
  status: string;
  clientSecret?: string;
  sessionId?: string;
  pagoId?: string;
  total: number;
  currency?: string;
  created?: boolean;
};

export type CheckoutAttemptStatusResult = {
  attemptId: string;
  status: string;
  orderId?: string;
  pagoId?: string;
  total: number;
  currency: string;
  paymentStatus?: string;
};

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapStartResult(input: unknown): CheckoutAttemptStartResult {
  const record =
    input && typeof input === "object" ? (input as UnknownRecord) : {};
  return {
    attemptId: toStringValue(record.attemptId),
    status: toStringValue(record.status),
    clientSecret: toStringValue(record.clientSecret) || undefined,
    sessionId: toStringValue(record.sessionId) || undefined,
    pagoId: toStringValue(record.pagoId) || undefined,
    total: toNumber(record.total, 0),
    currency: toStringValue(record.currency) || undefined,
    created: record.created === true,
  };
}

function mapStatusResult(input: unknown): CheckoutAttemptStatusResult {
  const record =
    input && typeof input === "object" ? (input as UnknownRecord) : {};
  return {
    attemptId: toStringValue(record.attemptId),
    status: toStringValue(record.status),
    orderId: toStringValue(record.orderId) || undefined,
    pagoId: toStringValue(record.pagoId) || undefined,
    total: toNumber(record.total, 0),
    currency: toStringValue(record.currency, "MXN"),
    paymentStatus: toStringValue(record.paymentStatus) || undefined,
  };
}

export function getOrCreateCheckoutIdempotencyKey(): string {
  if (typeof window === "undefined") {
    return `server-checkout-${Date.now()}`;
  }
  const existing = window.sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
  if (existing && existing.length >= 8) {
    return existing;
  }
  const key =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, key);
  return key;
}

export function clearCheckoutIdempotencyKey(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
}

export async function startCheckoutAttempt(
  payload: CheckoutAttemptStartPayload,
): Promise<CheckoutAttemptStartResult> {
  const idempotencyKey = getOrCreateCheckoutIdempotencyKey();
  const raw = await apiFetch<unknown>(
    "/api/checkout/attempts",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { local: true, idempotencyKey },
  );
  const data = unwrapData<unknown>(raw);
  return mapStartResult(data);
}

export async function getCheckoutAttemptStatus(
  attemptId: string,
): Promise<CheckoutAttemptStatusResult> {
  const raw = await apiFetch<unknown>(
    `/api/checkout/attempts/${encodeURIComponent(attemptId)}/status`,
    { method: "GET" },
    { local: true },
  );
  const data = unwrapData<unknown>(raw);
  return mapStatusResult(data);
}
