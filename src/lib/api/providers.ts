import type { Proveedor } from "@/lib/types";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function mapProveedor(input: unknown): Proveedor {
  const record =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    id: toStringValue(record.id ?? record._id ?? record.proveedorId),
    codigo: toStringValue(record.codigo) || undefined,
    nombre: toStringValue(record.nombre ?? record.name, "Proveedor"),
    email: toStringValue(record.email) || undefined,
    telefono: toStringValue(record.telefono ?? record.phone) || undefined,
    contacto: toStringValue(record.contacto ?? record.contactName) || undefined,
    activo: toBoolean(record.activo, true),
  };
}

function mapProveedorList(payload: unknown): Proveedor[] {
  const data = unwrapData<unknown>(payload);
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapProveedor).filter((item) => Boolean(item.id));
}

export const providersApi = {
  async getAll() {
    const payload = await apiFetch<unknown>(
      "/api/proveedores",
      { method: "GET" },
      { local: true },
    );
    return mapProveedorList(payload);
  },

  async search(termino: string) {
    const payload = await apiFetch<unknown>(
      `/api/proveedores/buscar/${encodeURIComponent(termino)}`,
      { method: "GET" },
      { local: true },
    );

    return mapProveedorList(payload);
  },

  async getById(id: string) {
    const payload = await apiFetch<unknown>(
      `/api/proveedores/${id}`,
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    if (!data || typeof data !== "object") {
      return null;
    }
    return mapProveedor(data);
  },

  create(payload: Partial<Proveedor> & { nombre: string }) {
    return apiFetch<unknown>(
      "/api/proveedores",
      { method: "POST", body: JSON.stringify(payload) },
      { local: true },
    );
  },

  update(id: string, payload: Partial<Proveedor>) {
    return apiFetch<unknown>(
      `/api/proveedores/${id}`,
      { method: "PUT", body: JSON.stringify(payload) },
      { local: true },
    );
  },

  remove(id: string) {
    return apiFetch<unknown>(
      `/api/proveedores/${id}`,
      { method: "DELETE" },
      { local: true },
    );
  },
};
