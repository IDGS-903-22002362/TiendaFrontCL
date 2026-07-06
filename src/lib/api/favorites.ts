import type { FavoriteItem, Product } from "@/lib/types";
import { apiFetch } from "./client";

type FavoritesListResponse = {
  success: boolean;
  count: number;
  meta?: {
    limit: number;
    offset: number;
    returned: number;
  };
  data: FavoriteItem[];
};

type FavoriteCheckResponse = {
  success: boolean;
  data: {
    esFavorito: boolean;
  };
};

type FavoriteMutationResponse = {
  success: boolean;
  message: string;
  data?: {
    id: string;
    usuarioId: string;
    productoId: string;
    createdAt: string;
  };
};

export function mapFavoriteProductToProductCard(
  producto: FavoriteItem["producto"],
): Product {
  return {
    id: producto.id,
    clave: producto.clave,
    name: producto.name,
    description: producto.description ?? producto.name,
    price: producto.price,
    images: producto.images?.length ? producto.images : [],
    category: "",
    tags: [],
    stock: 1,
    stockTotal: 1,
    activo: true,
  };
}

export async function getFavorites(limit = 100, offset = 0) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return apiFetch<FavoritesListResponse>(
    `/api/favoritos?limit=${safeLimit}&offset=${Math.max(offset, 0)}`,
    { method: "GET" },
    { local: true },
  );
}

export async function checkFavorite(productId: string) {
  return apiFetch<FavoriteCheckResponse>(
    `/api/favoritos/check/${encodeURIComponent(productId)}`,
    { method: "GET" },
    { local: true },
  );
}

export async function addFavorite(productId: string) {
  return apiFetch<FavoriteMutationResponse>(
    "/api/favoritos",
    {
      method: "POST",
      body: JSON.stringify({ productoId: productId }),
    },
    { local: true },
  );
}

export async function removeFavorite(productId: string) {
  return apiFetch<FavoriteMutationResponse>(
    `/api/favoritos/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
    { local: true },
  );
}
