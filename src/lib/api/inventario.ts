import type {
  ApiPagination,
  InventoryAdjustmentPayload,
  InventoryAlert,
  InventoryMovement,
  InventoryMovementPayload,
  InventoryMovementType,
} from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  count?: number;
  message?: string;
  pagination?: ApiPagination;
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

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function mapMovement(input: unknown): InventoryMovement {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  return {
    id: toStringValue(item.id ?? item._id ?? item.movimientoId),
    tipo: toStringValue(item.tipo, "entrada") as InventoryMovementType,
    productoId: toStringValue(item.productoId),
    tallaId: toStringValue(item.tallaId) || undefined,
    cantidad: toNumber(item.cantidad),
    motivo: toStringValue(item.motivo) || undefined,
    referencia: toStringValue(item.referencia) || undefined,
    ordenId: toStringValue(item.ordenId) || undefined,
    usuarioId: toStringValue(item.usuarioId) || undefined,
    createdAt: toStringValue(item.createdAt ?? item.fecha) || undefined,
  };
}

function mapAlert(input: unknown): InventoryAlert {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  return {
    productoId: toStringValue(item.productoId),
    productoNombre:
      toStringValue(item.productoNombre ?? item.nombreProducto) || undefined,
    tallaId: toStringValue(item.tallaId) || undefined,
    tallaCodigo:
      toStringValue(item.tallaCodigo ?? item.codigoTalla) || undefined,
    stockActual: toNumber(item.stockActual ?? item.stock),
    stockMinimo: toNumber(item.stockMinimo, 0),
    esCritica: toBoolean(item.esCritica, false),
    lineaId: toStringValue(item.lineaId) || undefined,
    categoriaId: toStringValue(item.categoriaId) || undefined,
  };
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export type ListMovementsParams = {
  productoId?: string;
  tallaId?: string;
  tipo?: InventoryMovementType;
  ordenId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  cursor?: string;
};

export type ListAlertsParams = {
  productoId?: string;
  lineaId?: string;
  categoriaId?: string;
  soloCriticas?: boolean;
  limit?: number;
};

export const inventarioApi = {
  registerMovement(token: string, payload: InventoryMovementPayload) {
    return apiFetch<ApiEnvelope<InventoryMovement>>(
      "/api/inventario/movimientos",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { token },
    );
  },

  registerAdjustment(
    token: string,
    payload: InventoryAdjustmentPayload,
    idempotencyKey?: string,
  ) {
    return apiFetch<ApiEnvelope<unknown>>(
      "/api/inventario/ajustes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { token, idempotencyKey },
    );
  },

  async listMovements(token: string, params: ListMovementsParams = {}) {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/inventario/movimientos${buildQuery(params)}`,
      { method: "GET" },
      { token },
    );

    const data = unwrapData<unknown>(payload);
    const list = Array.isArray(data) ? data.map(mapMovement) : [];

    return {
      data: list,
      count: payload.count ?? list.length,
      pagination: payload.pagination,
    };
  },

  async listLowStockAlerts(token: string, params: ListAlertsParams = {}) {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/inventario/alertas-stock${buildQuery(params)}`,
      { method: "GET" },
      { token },
    );

    const data = unwrapData<unknown>(payload);
    const list = Array.isArray(data) ? data.map(mapAlert) : [];

    return {
      data: list,
      count: payload.count ?? list.length,
    };
  },
};
