import type { Talla } from "@/lib/types";
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
    });

    return mapTallasList(payload).sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );
  },

  async getById(id: string): Promise<Talla | null> {
    const payload = await apiFetch<ApiEnvelope<unknown>>(`/api/tallas/${id}`, {
      method: "GET",
    });

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
    });
  },

  update(
    id: string,
    payload: Partial<{ codigo: string; descripcion: string; orden: number }>,
  ) {
    return apiFetch<ApiEnvelope<Talla>>(`/api/tallas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiFetch<ApiEnvelope<null>>(`/api/tallas/${id}`, {
      method: "DELETE",
    });
  },
};
