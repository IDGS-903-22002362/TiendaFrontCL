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

type LegacyAssignment = {
  id: string;
  usuarioId: string;
  puntos: number;
  descripcion?: string;
  origenId: string;
  createdAt: string;
};

type LegacyAssignmentsResponse = {
  success: boolean;
  data: LegacyAssignment[];
  pagination?: { nextCursor?: string | null; hasMore?: boolean };
};

type LegacyAssignBySaleResponse = {
  success: boolean;
  data: {
    puntosAsignados: number;
    puntosActuales: number;
    origenId?: string;
    descripcion?: string;
  };
};

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}`;
}

function mapLegacyAssignment(item: LegacyAssignment): LoyaltyTransaction {
  return {
    transactionId: item.id,
    memberId: item.usuarioId,
    type: "EARN",
    status: "POSTED",
    points: item.puntos,
    balanceBefore: 0,
    balanceAfter: 0,
    description: item.descripcion,
    channel: "STORE",
    createdAt: item.createdAt,
  };
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
  externalTransactionId: string;
  amountCents: number;
  description?: string;
  token?: string;
}): Promise<LoyaltyTransaction> {
  const response = await apiFetch<LegacyAssignBySaleResponse>(
    `/api/usuarios/${input.memberId}/puntos/asignar-por-venta`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": input.externalTransactionId,
      },
      body: JSON.stringify({
        dinero: input.amountCents / 100,
        descripcion:
          input.description?.trim() ||
          `Venta ${input.externalTransactionId}`,
      }),
    },
    { local: true, token: input.token },
  );

  return {
    transactionId: input.externalTransactionId,
    memberId: input.memberId,
    type: "EARN",
    status: "POSTED",
    points: response.data.puntosAsignados,
    amountCents: input.amountCents,
    currency: "MXN",
    externalTransactionId: input.externalTransactionId,
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
  token?: string;
  actorId?: string;
}): Promise<PaginatedTransactions> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.actorId) search.set("empleadoId", params.actorId);

  const response = await apiFetch<LegacyAssignmentsResponse>(
    `/api/usuarios/puntos/asignaciones?${search.toString()}`,
    { method: "GET" },
    { local: true, token: params.token },
  );

  return {
    items: (response.data ?? []).map(mapLegacyAssignment),
    nextCursor: response.pagination?.nextCursor ?? null,
    hasMore: response.pagination?.hasMore ?? false,
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
