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
import { resolveClientBearerToken } from "@/lib/cookies/constants";
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

function parseTimestamp(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    const record = value as UnknownRecord & { toDate?: () => Date };

    if (typeof record.toDate === "function") {
      try {
        const date = record.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // ignore invalid Firestore timestamp
      }
    }

    const seconds = Number(record._seconds ?? record.seconds);
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }

  return undefined;
}

function mapMovementQuantity(item: UnknownRecord): number {
  const cantidad = toNumber(item.cantidad, Number.NaN);
  if (Number.isFinite(cantidad) && cantidad !== 0) {
    return cantidad;
  }

  const diferencia = toNumber(item.diferencia, Number.NaN);
  if (Number.isFinite(diferencia) && diferencia !== 0) {
    return Math.abs(diferencia);
  }

  const cantidadAnterior = toNumber(item.cantidadAnterior);
  const cantidadNueva = toNumber(item.cantidadNueva);
  if (cantidadNueva !== cantidadAnterior) {
    return Math.abs(cantidadNueva - cantidadAnterior);
  }

  return Number.isFinite(cantidad) ? cantidad : 0;
}

function flattenStockAlerts(payload: unknown): InventoryAlert[] {
  const root = (
    payload && typeof payload === "object" ? payload : {}
  ) as UnknownRecord;

  let alertasRaw: unknown[] = [];
  if (Array.isArray(root.alertas)) {
    alertasRaw = root.alertas;
  } else if (Array.isArray(payload)) {
    alertasRaw = payload;
  }

  const rows: InventoryAlert[] = [];

  for (const rawAlert of alertasRaw) {
    if (!rawAlert || typeof rawAlert !== "object") continue;

    const product = rawAlert as UnknownRecord;
    const productoId = toStringValue(product.productoId);
    if (!productoId) continue;

    const productoNombre =
      toStringValue(product.descripcion ?? product.clave ?? product.productoNombre) ||
      undefined;
    const lineaId = toStringValue(product.lineaId) || undefined;
    const categoriaId = toStringValue(product.categoriaId) || undefined;

    if (toBoolean(product.globalBajoStock)) {
      const stockMinimo = toNumber(product.stockMinimoGlobal);
      const stockActual = toNumber(product.existencias);
      rows.push({
        productoId,
        productoNombre,
        stockActual,
        stockMinimo,
        esCritica: stockMinimo - stockActual >= 5,
        lineaId,
        categoriaId,
      });
    }

    const tallas = Array.isArray(product.tallasBajoStock)
      ? product.tallasBajoStock
      : [];

    for (const rawTalla of tallas) {
      if (!rawTalla || typeof rawTalla !== "object") continue;

      const talla = rawTalla as UnknownRecord;
      const deficit = toNumber(talla.deficit);

      rows.push({
        productoId,
        productoNombre,
        tallaId: toStringValue(talla.tallaId) || undefined,
        stockActual: toNumber(talla.cantidadActual),
        stockMinimo: toNumber(talla.minimo),
        esCritica: deficit >= 5,
        lineaId,
        categoriaId,
      });
    }
  }

  return rows;
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
    cantidad: mapMovementQuantity(item),
    motivo: toStringValue(item.motivo) || undefined,
    referencia: toStringValue(item.referencia) || undefined,
    ordenId: toStringValue(item.ordenId) || undefined,
    usuarioId: toStringValue(item.usuarioId) || undefined,
    createdAt:
      parseTimestamp(item.createdAt ?? item.fecha) ||
      toStringValue(item.createdAt ?? item.fecha) ||
      undefined,
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

type AdminNotificationsPayload = {
  items: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    href: string;
    createdAt: string;
    read: boolean;
  }>;
  unreadCount: number;
};

function localAuthOptions(token?: string) {
  return {
    local: true as const,
    token: resolveClientBearerToken(token),
  };
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
      localAuthOptions(token),
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
      localAuthOptions(token),
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
      localAuthOptions(token),
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
      { ...localAuthOptions(token), idempotencyKey },
    );
  },

  async listMovements(token: string, params: ListMovementsParams = {}) {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/inventario/movimientos${buildQuery(params)}`,
      { method: "GET" },
      localAuthOptions(token),
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
    const payload = await apiFetch<ApiEnvelope<unknown>>(
      `/api/inventario/alertas-stock${buildQuery(params)}`,
      { method: "GET" },
      localAuthOptions(token),
    );

    const data = unwrapData<unknown>(payload);
    const list = flattenStockAlerts(data);

    return {
      data: list,
      count: payload.count ?? list.length,
    };
  },

  async listDashboard(
    token: string,
    params: {
      q?: string;
      lineaId?: string;
      categoriaId?: string;
      soloBajoStock?: boolean;
      limit?: number;
      cursor?: string;
    } = {},
  ) {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/inventario/dashboard${buildQuery(params)}`,
      { method: "GET" },
      localAuthOptions(token),
    );

    const data = unwrapData<unknown>(payload);
    const list = Array.isArray(data) ? data : [];

    return {
      data: list,
      count: payload.count ?? list.length,
      pagination: payload.pagination,
    };
  },

  async getDiagnostic(token: string, productoId: string) {
    const payload = await apiFetch<ApiEnvelope<unknown>>(
      `/api/inventario/diagnostico/${productoId}`,
      { method: "GET" },
      localAuthOptions(token),
    );

    return unwrapData<unknown>(payload);
  },

  async listRecepciones(
    token: string,
    params: {
      estado?: string;
      proveedorId?: string;
      referencia?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ) {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/inventario/recepciones${buildQuery(params)}`,
      { method: "GET" },
      localAuthOptions(token),
    );

    const data = unwrapData<unknown>(payload);
    const list = Array.isArray(data) ? data : [];

    return {
      data: list,
      count: payload.count ?? list.length,
      pagination: payload.pagination,
    };
  },

  async getRecepcion(token: string, recepcionId: string) {
    const payload = await apiFetch<ApiEnvelope<unknown>>(
      `/api/inventario/recepciones/${recepcionId}`,
      { method: "GET" },
      localAuthOptions(token),
    );

    return unwrapData<unknown>(payload);
  },

  createRecepcion(token: string, body: Record<string, unknown>) {
    return apiFetch<ApiEnvelope<unknown>>(
      "/api/inventario/recepciones",
      { method: "POST", body: JSON.stringify(body) },
      localAuthOptions(token),
    );
  },

  confirmRecepcion(
    token: string,
    recepcionId: string,
    body: Record<string, unknown>,
    idempotencyKey?: string,
  ) {
    return apiFetch<ApiEnvelope<unknown>>(
      `/api/inventario/recepciones/${recepcionId}/confirmar`,
      { method: "POST", body: JSON.stringify(body) },
      { ...localAuthOptions(token), idempotencyKey },
    );
  },

  closeRecepcion(token: string, recepcionId: string) {
    return apiFetch<ApiEnvelope<unknown>>(
      `/api/inventario/recepciones/${recepcionId}/cerrar`,
      { method: "POST", body: JSON.stringify({}) },
      localAuthOptions(token),
    );
  },

  async getOperationalSummary(token?: string) {
    type OperationalSummary = {
      pendingOrdersCount: number;
      lowStockCount: number;
      activeProductsCount: number;
      recentMovementsCount: number;
      generatedAt: string;
    };

    const payload = await apiFetch<ApiEnvelope<OperationalSummary>>(
      "/api/inventario/resumen-operativo",
      { method: "GET", cache: "no-store" },
      localAuthOptions(token),
    );

    const data = unwrapData<OperationalSummary>(payload);
    if (!data) {
      throw new Error("No se pudo cargar el resumen operativo");
    }

    return data;
  },

  async listAdminNotifications(token?: string) {
    const payload = await apiFetch<ApiEnvelope<AdminNotificationsPayload>>(
      "/api/inventario/notificaciones-admin",
      { method: "GET", cache: "no-store" },
      localAuthOptions(token),
    );

    const data = unwrapData<AdminNotificationsPayload>(payload);
    return data ?? { items: [], unreadCount: 0 };
  },

  async markAdminNotificationsRead(ids: string[], token?: string) {
    const payload = await apiFetch<ApiEnvelope<AdminNotificationsPayload>>(
      "/api/inventario/notificaciones-admin/read",
      {
        method: "POST",
        body: JSON.stringify({ ids }),
      },
      localAuthOptions(token),
    );

    const data = unwrapData<AdminNotificationsPayload>(payload);
    return data ?? { items: [], unreadCount: 0 };
  },

  async markAllAdminNotificationsRead(token?: string) {
    const payload = await apiFetch<ApiEnvelope<AdminNotificationsPayload>>(
      "/api/inventario/notificaciones-admin/read-all",
      { method: "POST" },
      localAuthOptions(token),
    );

    const data = unwrapData<AdminNotificationsPayload>(payload);
    return data ?? { items: [], unreadCount: 0 };
  },
};
