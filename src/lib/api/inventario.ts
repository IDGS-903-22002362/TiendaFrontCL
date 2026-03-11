import type {
  ApiPagination,
  InventoryAdjustmentPayload,
  InventoryAlert,
  InventoryMovement,
  InventoryMovementPayload,
  InventoryMovementType,
  ProductSizeInventoryReplacePayload,
  ProductSizeInventoryReplaceResult,
  ProductSizeStock,
  ProductStockSnapshot,
  ProductStockUpdatePayload,
  ProductStockUpdateResult,
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

function mapSizeStock(input: unknown): ProductSizeStock {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  return {
    tallaId: toStringValue(item.tallaId),
    cantidad: toNumber(item.cantidad),
  };
}

function mapProductStockSnapshot(input: unknown): ProductStockSnapshot {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  const tallaIds = Array.isArray(item.tallaIds)
    ? item.tallaIds.map((value) => toStringValue(value)).filter(Boolean)
    : [];
  const inventarioPorTalla = Array.isArray(item.inventarioPorTalla)
    ? item.inventarioPorTalla.map(mapSizeStock).filter((entry) => entry.tallaId)
    : [];

  return {
    productoId: toStringValue(item.productoId ?? item.id),
    tallaIds,
    existencias: toNumber(item.existencias ?? item.stock),
    inventarioPorTalla,
  };
}

function mapProductStockUpdateResult(input: unknown): ProductStockUpdateResult {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  const inventarioPorTalla = Array.isArray(item.inventarioPorTalla)
    ? item.inventarioPorTalla.map(mapSizeStock).filter((entry) => entry.tallaId)
    : [];

  return {
    productoId: toStringValue(item.productoId),
    tallaId: toStringValue(item.tallaId) || undefined,
    cantidadAnterior: toNumber(item.cantidadAnterior),
    cantidadNueva: toNumber(item.cantidadNueva),
    diferencia: toNumber(item.diferencia),
    existencias: toNumber(item.existencias),
    inventarioPorTalla,
    movimientoId: toStringValue(item.movimientoId) || undefined,
    createdAt: toStringValue(item.createdAt) || undefined,
  };
}

function mapProductSizeInventoryReplaceResult(
  input: unknown,
): ProductSizeInventoryReplaceResult {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  const inventarioPorTalla = Array.isArray(item.inventarioPorTalla)
    ? item.inventarioPorTalla.map(mapSizeStock).filter((entry) => entry.tallaId)
    : [];
  const tallaIds = Array.isArray(item.tallaIds)
    ? item.tallaIds.map((value) => toStringValue(value)).filter(Boolean)
    : [];
  const cambios = Array.isArray(item.cambios)
    ? item.cambios.map((rawChange) => {
        const change = (
          rawChange && typeof rawChange === "object" ? rawChange : {}
        ) as UnknownRecord;
        return {
          tallaId: toStringValue(change.tallaId),
          cantidadAnterior: toNumber(change.cantidadAnterior),
          cantidadNueva: toNumber(change.cantidadNueva),
          diferencia: toNumber(change.diferencia),
          movimientoId: toStringValue(change.movimientoId) || undefined,
        };
      })
    : [];

  return {
    productoId: toStringValue(item.productoId),
    tallaIds,
    inventarioPorTalla,
    existencias: toNumber(item.existencias),
    cambios,
  };
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
  async getProductStock(productoId: string) {
    const payload = await apiFetch<ApiEnvelope<unknown>>(
      `/api/productos/${productoId}/stock`,
      { method: "GET" },
      { local: true },
    );

    const data = unwrapData<unknown>(payload);
    return mapProductStockSnapshot(data);
  },

  async updateProductStock(
    token: string,
    productoId: string,
    payload: ProductStockUpdatePayload,
  ) {
    const response = await apiFetch<ApiEnvelope<unknown>>(
      `/api/productos/${productoId}/stock`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { token, local: true },
    );

    return mapProductStockUpdateResult(unwrapData<unknown>(response));
  },

  async replaceProductSizeInventory(
    token: string,
    productoId: string,
    payload: ProductSizeInventoryReplacePayload,
  ) {
    const response = await apiFetch<ApiEnvelope<unknown>>(
      `/api/productos/${productoId}/inventario-tallas`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { token, local: true },
    );

    return mapProductSizeInventoryReplaceResult(unwrapData<unknown>(response));
  },

  registerMovement(token: string, payload: InventoryMovementPayload) {
    return apiFetch<ApiEnvelope<InventoryMovement>>(
      "/api/inventario/movimientos",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { token, local: true },
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
      { token, idempotencyKey, local: true },
    );
  },

  async listMovements(token: string, params: ListMovementsParams = {}) {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/inventario/movimientos${buildQuery(params)}`,
      { method: "GET" },
      { token, local: true },
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
      { token, local: true },
    );

    const data = unwrapData<unknown>(payload);
    const list = Array.isArray(data) ? data.map(mapAlert) : [];

    return {
      data: list,
      count: payload.count ?? list.length,
    };
  },
};
