import type { Orden } from "@/lib/types";
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

function mapOrden(input: unknown): Orden {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    id: toStringValue(item.id ?? item._id ?? item.ordenId),
    usuarioId: toStringValue(item.usuarioId) || undefined,
    estado: toStringValue(item.estado, "PENDIENTE"),
    total: toNumber(item.total, 0),
    subtotal: toNumber(item.subtotal, 0),
    shippingCost: toNumber(item.costoEnvio ?? item.shippingCost, 0),
    metodoPago: toStringValue(item.metodoPago) || undefined,
    createdAt: toStringValue(item.createdAt ?? item.fechaCreacion) || undefined,
    updatedAt: toStringValue(item.updatedAt) || undefined,
  };
}

function buildQuery(query?: Record<string, string | undefined>) {
  if (!query) return "";
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export type ListOrdenesQuery = {
  estado?: string;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};

export const ordersApi = {
  create(payload: Record<string, unknown>) {
    return apiFetch<unknown>(
      "/api/ordenes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { local: true },
    );
  },

  async list(query?: ListOrdenesQuery) {
    const payload = await apiFetch<unknown>(
      `/api/ordenes${buildQuery(query)}`,
      { method: "GET" },
      { local: true },
    );

    const data = unwrapData<unknown>(payload);
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(mapOrden).filter((item) => Boolean(item.id));
  },

  async getById(id: string) {
    const payload = await apiFetch<unknown>(
      `/api/ordenes/${id}`,
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }

    return mapOrden(data);
  },

  getPago(id: string) {
    return apiFetch<unknown>(
      `/api/ordenes/${id}/pago`,
      { method: "GET" },
      { local: true },
    );
  },

  updateEstado(id: string, estado: string) {
    return apiFetch<unknown>(
      `/api/ordenes/${id}/estado`,
      {
        method: "PUT",
        body: JSON.stringify({ estado }),
      },
      { local: true },
    );
  },

  cancel(id: string) {
    return apiFetch<unknown>(
      `/api/ordenes/${id}/cancelar`,
      { method: "PUT" },
      { local: true },
    );
  },
};
