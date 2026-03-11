import type { Talla, TallaInventorySnapshot } from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  count?: number;
  message?: string;
};

function getReadOptions() {
  return typeof window !== "undefined" ? { local: true as const } : undefined;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapTalla(input: unknown): Talla {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  return {
    id: toStringValue(item.id ?? item._id ?? item.tallaId),
    codigo: toStringValue(item.codigo ?? item.code, ""),
    descripcion: toStringValue(item.descripcion ?? item.description, ""),
    orden: toNumber(item.orden, 0),
  };
}

function mapTallaInventorySnapshot(input: unknown): TallaInventorySnapshot {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;
  const talla = mapTalla(item.talla);
  const resumen =
    item.resumen && typeof item.resumen === "object"
      ? (item.resumen as UnknownRecord)
      : {};
  const productosRaw = Array.isArray(item.productos) ? item.productos : [];
  const productos = productosRaw.map((productoItem) => {
    const producto =
      productoItem && typeof productoItem === "object"
        ? (productoItem as UnknownRecord)
        : {};

    return {
      productoId: toStringValue(producto.productoId ?? producto.id),
      clave: toStringValue(producto.clave) || undefined,
      descripcion: toStringValue(producto.descripcion) || undefined,
      cantidad: toNumber(producto.cantidad),
      existencias: toNumber(producto.existencias),
    };
  });

  return {
    talla,
    resumen: {
      totalProductos: toNumber(resumen.totalProductos),
      totalUnidades: toNumber(resumen.totalUnidades),
    },
    productos,
  };
}

function mapTallasList(payload: unknown): Talla[] {
  const data = unwrapData<unknown>(payload);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapTalla).filter((item) => Boolean(item.id));
}

export const tallasApi = {
  async getAll(): Promise<Talla[]> {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>("/api/tallas", {
      method: "GET",
    }, getReadOptions());

    return mapTallasList(payload).sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );
  },

  async getById(id: string): Promise<Talla | null> {
    const payload = await apiFetch<ApiEnvelope<unknown>>(`/api/tallas/${id}`, {
      method: "GET",
    }, getReadOptions());

    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }

    const talla = mapTalla(data);
    return talla.id ? talla : null;
  },

  create(payload: { codigo: string; descripcion: string; orden?: number }) {
    return apiFetch<ApiEnvelope<Talla>>("/api/tallas", {
      method: "POST",
      body: JSON.stringify(payload),
    }, { local: true });
  },

  update(
    id: string,
    payload: Partial<{ codigo: string; descripcion: string; orden: number }>,
  ) {
    return apiFetch<ApiEnvelope<Talla>>(`/api/tallas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, { local: true });
  },

  remove(id: string) {
    return apiFetch<ApiEnvelope<null>>(`/api/tallas/${id}`, {
      method: "DELETE",
    }, { local: true });
  },

  async getInventoryById(id: string): Promise<TallaInventorySnapshot | null> {
    const payload = await apiFetch<ApiEnvelope<unknown>>(
      `/api/tallas/${id}/inventario`,
      { method: "GET" },
      getReadOptions(),
    );

    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }

    return mapTallaInventorySnapshot(data);
  },
};
