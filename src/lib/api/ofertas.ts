import { apiFetch } from "./client";
import type { Product } from "@/lib/types";

// Obtiene productos en oferta desde el endpoint de ofertas activas
export async function fetchActiveOffers(): Promise<Product[]> {
  // Se asume que la respuesta tiene un array de productos en la propiedad "productos"
  const res = await apiFetch<{ success: boolean; productos: Product[] }>(
    "/ofertas/activas",
    { method: "GET" }
  );
  return res.productos || [];
}
