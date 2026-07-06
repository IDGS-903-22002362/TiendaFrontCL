import { apiFetch } from "./client";

export type LoyaltyWallet = {
  memberId: string;
  availablePoints: number;
  heldPoints: number;
  pendingPoints: number;
  lifetimeEarnedPoints: number;
  lifetimeRedeemedPoints: number;
  level: string;
  nextExpirationAt?: string;
  upcomingExpirations?: Array<{ points: number; expiresAt: string }>;
};

export type LoyaltyTransaction = {
  transactionId: string;
  memberId: string;
  type: string;
  status: string;
  points: number;
  amountCents?: number;
  currency?: string;
  externalTransactionId?: string;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  channel: string;
  createdAt: string;
};

export type PaginatedTransactions = {
  items: LoyaltyTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
};

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}`;
}

export async function getMyWallet(): Promise<LoyaltyWallet> {
  return apiFetch<LoyaltyWallet>(
    "/api/loyalty/wallets/me",
    { method: "GET" },
    { local: true },
  );
}

export async function getMyWalletTransactions(params?: {
  limit?: number;
  cursor?: string;
}): Promise<PaginatedTransactions> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return apiFetch<PaginatedTransactions>(
    `/api/loyalty/wallets/me/transactions${qs ? `?${qs}` : ""}`,
    { method: "GET" },
    { local: true },
  );
}

export async function previewEarnPoints(amountCents: number): Promise<{
  amountCents: number;
  currency: string;
  points: number;
  disclaimer: string;
}> {
  return apiFetch(
    `/api/loyalty/earn-preview?amountCents=${amountCents}`,
    { method: "GET" },
    { local: true },
  );
}

export async function earnFromStoreSale(input: {
  memberId: string;
  externalTransactionId: string;
  amountCents: number;
  description?: string;
  token: string;
}): Promise<LoyaltyTransaction> {
  const response = await fetch("/api/loyalty/earn-transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
      "Idempotency-Key": input.externalTransactionId,
    },
    body: JSON.stringify({
      memberId: input.memberId,
      externalTransactionId: input.externalTransactionId,
      amountCents: input.amountCents,
      currency: "MXN",
      channel: "STORE",
      description: input.description,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.title || "Error al acumular puntos");
  }
  return response.json();
}

export async function getAdminTransactions(params: {
  limit?: number;
  cursor?: string;
  token: string;
}): Promise<PaginatedTransactions> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  if (params.cursor) search.set("cursor", params.cursor);
  const response = await fetch(
    `/api/loyalty/admin/transactions?${search.toString()}`,
    {
      headers: { Authorization: `Bearer ${params.token}` },
    },
  );
  if (!response.ok) {
    throw new Error("Error al cargar historial");
  }
  return response.json();
}

export { idempotencyKey };

export const LOYALTY_POINTS_RATE = 0.1;

export function mxnToPointsPreview(amountMxn: number): number {
  return Math.round(amountMxn * LOYALTY_POINTS_RATE);
}

export function mxnToAmountCents(amountMxn: number): number {
  return Math.round(amountMxn * 100);
}
