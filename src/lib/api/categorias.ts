import type { Category } from "@/lib/types";
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

function mapCategory(input: unknown): Category {
  const category = (
    input && typeof input === "object" ? input : {}
  ) as UnknownRecord;
  const name = toStringValue(category.nombre ?? category.name, "General");
  const slug = toStringValue(category.slug, name.toLowerCase().replace(/\s+/g, "-"));

  return {
    id: toStringValue(
      category.id ?? category._id ?? category.categoriaId ?? slug,
    ),
    name,
    slug,
    imagenPrincipal: category.imagenPrincipal ? toStringValue(category.imagenPrincipal) : null,
    lineaId: category.lineaId ? toStringValue(category.lineaId) : null,
    orden: typeof category.orden === "number" ? category.orden : null,
  };
}

function mapCategoriesList(payload: unknown): Category[] {
  const data = unwrapData<unknown>(payload);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapCategory).filter((category) => Boolean(category.id));
}

export const categoriasApi = {
  async getAll(): Promise<Category[]> {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>("/api/categorias", {
      method: "GET",
    }, getReadOptions());

    return mapCategoriesList(payload);
  },

  async getById(id: string): Promise<Category | null> {
    const payload = await apiFetch<ApiEnvelope<unknown>>(`/api/categorias/${id}`, {
      method: "GET",
    }, getReadOptions());

    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }

    const category = mapCategory(data);
    return category.id ? category : null;
  },

  async search(term: string): Promise<Category[]> {
    const payload = await apiFetch<ApiEnvelope<unknown[]>>(
      `/api/categorias/buscar/${encodeURIComponent(term)}`,
      { method: "GET" },
      getReadOptions(),
    );

    return mapCategoriesList(payload);
  },

  create(payload: { nombre: string; lineaId?: string; orden?: number; imagenPrincipal?: string | null }) {
    return apiFetch<ApiEnvelope<Category>>("/api/categorias", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(
    id: string,
    payload: Partial<{ nombre: string; lineaId: string; orden: number; imagenPrincipal: string | null }>,
  ) {
    return apiFetch<ApiEnvelope<Category>>(`/api/categorias/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return apiFetch<ApiEnvelope<null>>(`/api/categorias/${id}`, {
      method: "DELETE",
    });
  },

  async uploadImage(id: string, file: File) {
    const formData = new FormData();
    formData.append("imagen", file);

    const res = await fetch(`/api/categorias/${id}/imagen`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("No se pudo subir la imagen de la categoría");
    }

    return res.json() as Promise<{
      success: true;
      data: {
        url: string;
        categoria: Category;
      };
    }>;
  },

  async deleteImage(id: string) {
    const res = await fetch(`/api/categorias/${id}/imagen`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("No se pudo eliminar la imagen de la categoría");
    }

    return res.json() as Promise<{ success: true; data: Category }>;
  },
};
