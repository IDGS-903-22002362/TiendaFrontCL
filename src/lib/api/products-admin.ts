import type {
  AdminProductListItem,
  AdminProductsResponse,
  AdminProductStatus,
  ProductFedexShipping,
  ProductSizeStock,
} from "@/lib/types";
import { apiFetch, ApiError } from "./client";

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
  fedexShipping?: ProductFedexShipping;
  activo?: boolean;
};

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export type ProductDetailPayload = {
  descripcion: string;
};

export type ProductDetailRecord = {
  id: string;
  descripcion: string;
  productoId: string;
  createdAt?: string;
  updatedAt?: string;
};

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
  fedexShipping?: ProductFedexShipping;
  imagenes: string[];
  activo?: boolean;
};

export type ProductCreateResponse = {
  success?: true;
  id?: string;
  data?: {
    id?: string;
  };
};


function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapDetailRecord(
  input: unknown,
  productIdFallback?: string,
): ProductDetailRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const detail = input as Record<string, unknown>;
  const id = toStringValue(detail.id);
  const descripcion = toStringValue(detail.descripcion).trim();
  const productoId =
    toStringValue(detail.productoId) || productIdFallback || "";

  if (!id || !descripcion || !productoId) {
    return null;
  }

  return {
    id,
    descripcion,
    productoId,
    createdAt: toStringValue(detail.createdAt) || undefined,
    updatedAt: toStringValue(detail.updatedAt) || undefined,
  };
}

function extractCreateId(payload: ProductCreateResponse): string | null {
  const directId = toStringValue(payload.id);
  if (directId) {
    return directId;
  }

  const nestedId = toStringValue(payload.data?.id);
  return nestedId || null;
}

export const productsAdminApi = {
  async getById(id: string, token?: string) {
    return apiFetch<{ success: true; data?: ProductAdminDetail }>(
      `/api/productos/${id}`,
      {
        method: "GET",
      },
      { local: true, token },
    );
  },

  async create(payload: ProductCreatePayload, token?: string) {
    const response = await apiFetch<ProductCreateResponse>(
      "/api/productos",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { local: true, token },
    );

    return {
      ...response,
      id: extractCreateId(response) ?? undefined,
    };
  },

  async fetchAdminProducts(
    token?: string,
    estado: AdminProductStatus = "todos",
  ) {
    return apiFetch<AdminProductsResponse>(
      `/api/productos/admin?estado=${encodeURIComponent(estado)}`,
      {
        method: "GET",
      },
      { local: true, token },
    );
  },

  async searchAdminProducts(term: string, token?: string) {
    const trimmed = term.trim();
    if (!trimmed) {
      return [];
    }

    const payload = await apiFetch<{ data?: AdminProductListItem[] }>(
      `/api/productos/admin/buscar/${encodeURIComponent(trimmed)}`,
      {
        method: "GET",
        cache: "no-store",
      },
      { local: true, token },
    );

    return Array.isArray(payload.data) ? payload.data : [];
  },

  async setProductActiveStatus(id: string, activo: boolean, token?: string) {
    return apiFetch<{ success: boolean; message: string; data: unknown }>(
      `/api/productos/${id}/estado`,
      {
        method: "PATCH",
        body: JSON.stringify({ activo }),
      },
      { local: true, token },
    );
  },

  async update(id: string, payload: ProductUpdatePayload, token?: string) {
    return apiFetch<{ success: true }>(
      `/api/productos/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { local: true, token },
    );
  },

  async delete(id: string, token?: string) {
    return apiFetch<{ success: true }>(
      `/api/productos/${id}`,
      { method: "DELETE" },
      { local: true, token },
    );
  },

  async uploadImages(id: string, formData: FormData, token?: string) {
    const files = Array.from(formData.values()).filter(
      (value): value is File => value instanceof File,
    );

    if (files.length === 0) {
      throw new Error("No se enviaron archivos");
    }

    async function sendWithField(fieldName: string) {
      const data = new FormData();
      files.forEach((file) => data.append(fieldName, file));

      try {
        const payload = await apiFetch<{
          success: true;
          data: { urls: string[]; totalImagenes: number };
        }>(
          `/api/productos/${id}/imagenes`,
          { method: "POST", body: data },
          { local: true, token },
        );
        return { ok: true as const, payload };
      } catch (error) {
        if (error instanceof ApiError) {
          return {
            ok: false as const,
            status: error.status,
            message: error.message,
          };
        }
        throw error;
      }
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

      if (attempt.ok) {
        return attempt.payload;
      }

      lastStatus = attempt.status;
      lastMessage = attempt.message;

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
      { local: true, token },
    );
  },

  async getDetails(productId: string, token?: string) {
    const payload = await apiFetch<{ success?: boolean; data?: unknown[] }>(
      `/api/productos/${productId}/detalles`,
      {
        method: "GET",
        cache: "no-store",
      },
      { local: true, token },
    );

    const payloadRecord =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : undefined;
    const nestedData =
      payloadRecord &&
      payloadRecord.data &&
      typeof payloadRecord.data === "object" &&
      !Array.isArray(payloadRecord.data)
        ? (payloadRecord.data as Record<string, unknown>).data
        : undefined;
    const data = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(nestedData)
        ? nestedData
        : [];

    return data
      .map((detail) => mapDetailRecord(detail, productId))
      .filter((detail): detail is ProductDetailRecord => Boolean(detail));
  },

  async createDetail(
    productId: string,
    payload: ProductDetailPayload,
    token?: string,
  ) {
    const response = await apiFetch<{ success?: boolean; data?: unknown }>(
      `/api/productos/${productId}/detalles`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { local: true, token },
    );

    return (
      mapDetailRecord(response.data, productId) ??
      mapDetailRecord(response, productId)
    );
  },

  async updateDetail(
    productId: string,
    detailId: string,
    payload: ProductDetailPayload,
    token?: string,
  ) {
    const response = await apiFetch<{ success?: boolean; data?: unknown }>(
      `/api/productos/${productId}/detalles/${detailId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { local: true, token },
    );

    return (
      mapDetailRecord(response.data, productId) ??
      mapDetailRecord(response, productId)
    );
  },

  async deleteDetail(productId: string, detailId: string, token?: string) {
    return apiFetch<{ success: true }>(
      `/api/productos/${productId}/detalles/${detailId}`,
      {
        method: "DELETE",
      },
      { local: true, token },
    );
  },
};
