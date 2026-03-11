import type { ProductSizeStock } from "@/lib/types";
import { apiFetch } from "./client";

export type ProductCreatePayload = {
  clave: string;
  descripcion: string;
  precioPublico: number;
  precioCompra: number;
  existencias: number;
  proveedorId: string;
  categoriaId?: string;
  lineaId?: string;
  tallaIds?: string[];
  inventarioPorTalla?: ProductSizeStock[];
};

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export type ProductAdminDetail = {
  id: string;
  clave: string;
  descripcion: string;
  precioPublico: number;
  precioCompra: number;
  existencias: number;
  proveedorId: string;
  categoriaId?: string;
  lineaId?: string;
  tallaIds: string[];
  inventarioPorTalla?: ProductSizeStock[];
  imagenes: string[];
};

function normalizeToken(token?: string) {
  if (!token || token === "cookie-session") {
    return undefined;
  }

  return token;
}

export const productsAdminApi = {
  async getById(id: string, token?: string) {
    return apiFetch<{ success: true; data?: ProductAdminDetail }>(
      `/api/productos/${id}`,
      {
        method: "GET",
      },
      { local: true, token: normalizeToken(token) },
    );
  },

  async create(payload: ProductCreatePayload, token?: string) {
    return apiFetch<{ success: true; id: string }>(
      "/api/productos",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { local: true, token: normalizeToken(token) },
    );
  },

  async update(id: string, payload: ProductUpdatePayload, token?: string) {
    return apiFetch<{ success: true }>(
      `/api/productos/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { local: true, token: normalizeToken(token) },
    );
  },

  async delete(id: string, token?: string) {
    return apiFetch<{ success: true }>(
      `/api/productos/${id}`,
      { method: "DELETE" },
      { local: true, token: normalizeToken(token) },
    );
  },

  async uploadImages(id: string, formData: FormData, token?: string) {
    const headers = new Headers();
    const normalizedToken = normalizeToken(token);
    if (normalizedToken) {
      headers.set("Authorization", `Bearer ${normalizedToken}`);
    }

    const files = Array.from(formData.values()).filter(
      (value): value is File => value instanceof File,
    );

    if (files.length === 0) {
      throw new Error("No se enviaron archivos");
    }

    async function sendWithField(fieldName: string) {
      const data = new FormData();
      files.forEach((file) => data.append(fieldName, file));

      const res = await fetch(`/api/productos/${id}/imagenes`, {
        method: "POST",
        headers,
        body: data,
        credentials: "include",
      });

      const payload = await res.json().catch(() => ({}));
      return { res, payload };
    }

    const fieldCandidates = [
      "images",
      "image",
      "imagenes",
      "imagen",
      "files",
      "file",
    ];

    let lastStatus = 400;
    let lastMessage = "No se pudieron subir imágenes";

    for (const fieldName of fieldCandidates) {
      const attempt = await sendWithField(fieldName);

      if (attempt.res.ok) {
        return attempt.payload as {
          success: true;
          data: { urls: string[]; totalImagenes: number };
        };
      }

      lastStatus = attempt.res.status;
      lastMessage =
        typeof attempt.payload?.message === "string"
          ? attempt.payload.message
          : `Error HTTP ${attempt.res.status}`;

      // If backend failed for a reason different than missing files, stop retrying.
      if (!/no se enviaron archivos/i.test(lastMessage)) {
        break;
      }
    }

    throw new Error(lastMessage || `Error HTTP ${lastStatus}`);
  },

  async deleteImage(id: string, imageUrl: string, token?: string) {
    return apiFetch<{ success: true }>(
      `/api/productos/${id}/imagenes`,
      {
        method: "DELETE",
        body: JSON.stringify({ imageUrl }),
      },
      { local: true, token: normalizeToken(token) },
    );
  },
};
