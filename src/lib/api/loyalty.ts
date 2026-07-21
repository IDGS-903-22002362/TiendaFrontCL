import { apiFetch } from "./client";
import {
  buildStaffSaleRequest,
} from "@/lib/loyalty/sale-folio";
import { buildStaffHistorySearchParams } from "@/lib/loyalty/staff-history";

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

export type StaffAssignmentHistoryRow = {
  transactionId: string;
  memberId: string;
  customerFullName: string | null;
  customerExists: boolean;
  saleId: string | null;
  amountMxn: number | null;
  points: number;
  createdAt: string;
};

type LegacyAssignmentsResponse = {
  success: boolean;
  data: StaffAssignmentHistoryRow[];
  pagination?: {
    nextCursor?: string | null;
    hasMore?: boolean;
    searchWindowLimited?: boolean;
    scannedCount?: number;
  };
};

type LegacyAssignBySaleResponse = {
  success: boolean;
  data: {
    puntosAsignados: number;
    puntosActuales: number;
    origenId?: string;
    descripcion?: string;
    folioVenta?: string;
    externalTransactionId?: string;
  };
};

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}`;
}

function normalizePaginatedTransactions(data: {
  items?: LoyaltyTransaction[];
  pagination?: { nextCursor?: string | null; hasMore?: boolean };
  nextCursor?: string | null;
  hasMore?: boolean;
}): PaginatedTransactions {
  return {
    items: data.items ?? [],
    nextCursor: data.pagination?.nextCursor ?? data.nextCursor ?? null,
    hasMore: data.pagination?.hasMore ?? data.hasMore ?? false,
  };
}

type WalletResponse = {
  wallet: LoyaltyWallet;
};

export type QrMemberSummary = {
  memberId: string;
  fullName: string;
  currentPoints: number;
};

export async function getQrMemberSummary(
  memberId: string,
  token?: string,
): Promise<QrMemberSummary> {
  const response = await apiFetch<{ member: QrMemberSummary }>(
    `/api/loyalty/staff/qr-members/${encodeURIComponent(memberId)}`,
    { method: "GET" },
    { local: true, token },
  );
  return response.member;
}

export async function getMyWallet(): Promise<LoyaltyWallet> {
  const data = await apiFetch<WalletResponse>(
    "/api/loyalty/wallets/me",
    { method: "GET" },
    { local: true },
  );
  return data.wallet;
}

export async function getMyWalletTransactions(params?: {
  limit?: number;
  cursor?: string;
}): Promise<PaginatedTransactions> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  const data = await apiFetch<{
    items: LoyaltyTransaction[];
    pagination?: { nextCursor?: string | null; hasMore?: boolean };
  }>(
    `/api/loyalty/wallets/me/transactions${qs ? `?${qs}` : ""}`,
    { method: "GET" },
    { local: true },
  );
  return normalizePaginatedTransactions(data);
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
  saleFolio: string;
  amountCents: number;
  description?: string;
  token?: string;
}): Promise<LoyaltyTransaction> {
  const request = buildStaffSaleRequest(input);
  const response = await apiFetch<LegacyAssignBySaleResponse>(
    `/api/usuarios/${input.memberId}/puntos/asignar-por-venta`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": request.idempotencyKey,
      },
      body: JSON.stringify(request.body),
    },
    { local: true, token: input.token },
  );

  return {
    transactionId: request.idempotencyKey,
    memberId: input.memberId,
    type: "EARN",
    status: "POSTED",
    points: response.data.puntosAsignados,
    amountCents: input.amountCents,
    currency: "MXN",
    externalTransactionId:
      response.data.externalTransactionId ?? request.body.folioVenta,
    balanceBefore: Math.max(
      0,
      response.data.puntosActuales - response.data.puntosAsignados,
    ),
    balanceAfter: response.data.puntosActuales,
    description: response.data.descripcion ?? input.description,
    channel: "STORE",
    createdAt: new Date().toISOString(),
  };
}

export async function getAdminTransactions(params: {
  limit?: number;
  cursor?: string;
  search?: string;
  token?: string;
  actorId?: string;
}): Promise<{
  items: StaffAssignmentHistoryRow[];
  nextCursor: string | null;
  hasMore: boolean;
  searchWindowLimited: boolean;
}> {
  const search = buildStaffHistorySearchParams(params);

  const response = await apiFetch<LegacyAssignmentsResponse>(
    `/api/usuarios/puntos/asignaciones?${search.toString()}`,
    { method: "GET" },
    { local: true, token: params.token },
  );

  return {
    items: response.data ?? [],
    nextCursor: response.pagination?.nextCursor ?? null,
    hasMore: response.pagination?.hasMore ?? false,
    searchWindowLimited: response.pagination?.searchWindowLimited ?? false,
  };
}

export { idempotencyKey };

export const LOYALTY_POINTS_RATE = 0.1;

export function mxnToPointsPreview(amountMxn: number): number {
  return Math.round(amountMxn * LOYALTY_POINTS_RATE);
}

export function mxnToAmountCents(amountMxn: number): number {
  return Math.round(amountMxn * 100);
}
