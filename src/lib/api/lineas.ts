import type { Linea } from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  count?: number;
  message?: string;
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

function toBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function mapLinea(input: unknown): Linea {
  const item = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;

  return {
    id: toStringValue(item.id ?? item._id ?? item.lineaId),
    codigo: toNumber(item.codigo),
    nombre: toStringValue(item.nombre ?? item.name, "Línea"),
    activo: toBoolean(item.activo, true),
  };
}

function mapLineasList(payload: unknown): Linea[] {
  const data = unwrapData<unknown>(payload);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapLinea).filter((linea) => Boolean(linea.id));
}

export const lineasApi = {
  async getAll(): Promise<Linea[]> {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>("/api/lineas", {
      method: "GET",
    });

    return mapLineasList(payload);
  },

  async getById(id: string): Promise<Linea | null> {
    const payload = await apiFetch<ApiEnvelope<unknown>>(`/api/lineas/${id}`, {
      method: "GET",
    });

    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }

    const linea = mapLinea(data);
    return linea.id ? linea : null;
  },

  async search(term: string): Promise<Linea[]> {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/lineas/buscar/${encodeURIComponent(term)}`,
      { method: "GET" },
    );

    return mapLineasList(payload);
  },

  create(payload: { codigo: number; nombre: string; activo?: boolean }) {
    return apiFetch<ApiEnvelope<Linea>>("/api/lineas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(
    id: string,
    payload: Partial<{ codigo: number; nombre: string; activo: boolean }>,
  ) {
    return apiFetch<ApiEnvelope<Linea>>(`/api/lineas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiFetch<ApiEnvelope<null>>(`/api/lineas/${id}`, {
      method: "DELETE",
    });
  },
};
