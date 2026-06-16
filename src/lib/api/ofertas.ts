import { apiFetch } from "./client";
import type { Product } from "@/lib/types";

// Obtiene productos en oferta desde el endpoint de ofertas activas
export async function fetchActiveOffers(): Promise<Product[]> {
  const res = await apiFetch<{ success: boolean; productos: Product[] }>(
    "/ofertas/activas",
    { method: "GET" }
  );

  return res.productos || [];
}

export type OfertaBannerOption = {
  id: string;
  nombre?: string;
  titulo?: string;
  descripcion?: string;
  badgeTexto?: string;
  estado?: boolean;
  activa?: boolean;
  tipoDescuento?: "porcentaje" | "monto" | "precio_fijo";
  valor?: number;
  valorDescuento?: number;
  aplicaA?: "productos" | "categorias" | "lineas" | "todo";

  productoIds?: string[];
  productIds?: string[];

  categoriaIds?: string[];
  categoryIds?: string[];

  lineaIds?: string[];
  lineIds?: string[];

  tallaIds?: string[];
  sizeIds?: string[];

  fechaInicio?: string;
  fechaFin?: string;
};

type OfertasListResponse =
  | {
      success?: boolean;
      ofertas?: OfertaBannerOption[];
      data?: OfertaBannerOption[];
      items?: OfertaBannerOption[];
    }
  | OfertaBannerOption[];

export async function fetchOfertasAdmin(): Promise<OfertaBannerOption[]> {
  const res = await apiFetch<OfertasListResponse>("/api/ofertas", {
    method: "GET",
  });

  if (Array.isArray(res)) {
    return res;
  }

  const data = res.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object" && "ofertas" in data) {
    const ofertas = (data as { ofertas?: OfertaBannerOption[] }).ofertas;
    return ofertas || [];
  }

  return res.ofertas || res.items || [];
}

export async function fetchOfertasActivasAdmin(): Promise<OfertaBannerOption[]> {
  const ofertas = await fetchOfertasAdmin();
  const now = Date.now();

  return ofertas.filter((oferta) => {
    if (oferta.estado !== true && oferta.activa !== true) {
      return false;
    }

    const inicio = oferta.fechaInicio ? new Date(oferta.fechaInicio).getTime() : null;
    const fin = oferta.fechaFin ? new Date(oferta.fechaFin).getTime() : null;

    if (inicio && Number.isFinite(inicio) && now < inicio) {
      return false;
    }

    if (fin && Number.isFinite(fin) && now > fin) {
      return false;
    }

    return true;
  });
}