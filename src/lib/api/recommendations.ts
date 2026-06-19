import type { CatalogProductCard, Product } from "@/lib/types";
import { apiFetch, unwrapData } from "./client";
import { mapCatalogProductToProductCardViewModel } from "./storefront";
import { getOrCreateSessionId } from "./cart";

export type RecommendationStrategy =
  | "recientemente_vistos"
  | "para_ti"
  | "mas_vendidos"
  | "tendencias"
  | "popularidad"
  | "similares"
  | "comprados_juntos"
  | "complementos_carrito"
  | "comprar_nuevamente"
  | "novedades"
  | "ofertas_relevantes";

export type RecommendationSectionResponse = {
  estrategia: RecommendationStrategy;
  seccionId?: string;
  titulo: string;
  subtitulo?: string;
  items: CatalogProductCard[];
  meta: { total: number; limite: number; hasMore: boolean };
};

export type HomeRecommendationsResponse = {
  secciones: RecommendationSectionResponse[];
};

export type RecommendationEventType =
  | "vista_producto"
  | "clic_producto"
  | "clic_recomendacion"
  | "impresion_recomendacion"
  | "agregar_carrito"
  | "inicio_checkout"
  | "compra"
  | "favorito";

function getClientOptions(token?: string) {
  return {
    local: true as const,
    token,
    sessionId: typeof window !== "undefined" ? getOrCreateSessionId() : undefined,
  };
}

export function mapRecommendationItems(items: CatalogProductCard[]): Product[] {
  return items.map(mapCatalogProductToProductCardViewModel);
}

export async function fetchHomeRecommendations(token?: string) {
  const payload = await apiFetch<{ data: HomeRecommendationsResponse }>(
    "/api/recomendaciones/home",
    { method: "GET" },
    getClientOptions(token),
  );
  return unwrapData(payload).secciones;
}

export async function fetchRecommendations(params: {
  estrategia: RecommendationStrategy;
  productoId?: string;
  productoIdsCarrito?: string[];
  limite?: number;
  token?: string;
}) {
  const query = new URLSearchParams({ estrategia: params.estrategia });
  if (params.productoId) query.set("productoId", params.productoId);
  if (params.limite) query.set("limite", String(params.limite));
  if (params.productoIdsCarrito?.length) {
    query.set("productoIdsCarrito", params.productoIdsCarrito.join(","));
  }

  const payload = await apiFetch<{ data: RecommendationSectionResponse }>(
    `/api/recomendaciones?${query.toString()}`,
    { method: "GET" },
    getClientOptions(params.token),
  );

  return unwrapData(payload);
}

export async function fetchProductRecommendations(productoId: string, token?: string) {
  const payload = await apiFetch<{
    data: {
      similares: RecommendationSectionResponse;
      compradosJuntos: RecommendationSectionResponse;
    };
  }>(
    `/api/recomendaciones/producto/${productoId}`,
    { method: "GET" },
    getClientOptions(token),
  );

  return unwrapData(payload);
}

export async function fetchCartRecommendations(productoIdsCarrito: string[], token?: string) {
  const query = new URLSearchParams({
    productoIdsCarrito: productoIdsCarrito.join(","),
  });

  const payload = await apiFetch<{ data: RecommendationSectionResponse }>(
    `/api/recomendaciones/carrito?${query.toString()}`,
    { method: "GET" },
    getClientOptions(token),
  );

  return unwrapData(payload);
}

export async function trackRecommendationEvent(input: {
  tipo: RecommendationEventType;
  productoId?: string;
  productoIds?: string[];
  estrategia?: RecommendationStrategy;
  superficie?: "home" | "producto" | "carrito" | "cuenta" | "checkout";
  seccionId?: string;
  token?: string;
}) {
  await apiFetch(
    "/api/recomendaciones/eventos",
    {
      method: "POST",
      body: JSON.stringify({
        tipo: input.tipo,
        productoId: input.productoId,
        productoIds: input.productoIds,
        estrategia: input.estrategia,
        superficie: input.superficie,
        seccionId: input.seccionId,
      }),
    },
    getClientOptions(input.token),
  );
}

export async function mergeRecommendationIdentity(token: string, sessionId: string) {
  await apiFetch(
    "/api/recomendaciones/identidad/unir",
    {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    },
    { local: true, token, sessionId },
  );
}

export type RecommendationConfigSection = {
  id: string;
  titulo: string;
  subtitulo?: string;
  estrategia: RecommendationStrategy;
  activo: boolean;
  limite: number;
  orden: number;
  superficie: "home" | "producto" | "carrito" | "cuenta" | "checkout" | "admin";
  productoIdsFijados?: string[];
  exclusionProductoIds?: string[];
  exclusionCategoriaIds?: string[];
  exclusionLineaIds?: string[];
};

export type RecommendationConfigWeight = {
  estrategia: RecommendationStrategy;
  peso: number;
  activo: boolean;
};

export type RecommendationAdminConfig = {
  id: "global";
  secciones: RecommendationConfigSection[];
  pesos: RecommendationConfigWeight[];
  exclusionGlobalProductoIds: string[];
  retencionEventosDias: number;
  cacheTtlSegundos: number;
  diversificacionMaxPorCategoria: number;
  diversificacionMaxPorLinea: number;
  abVariant?: string;
};

export async function fetchAdminRecommendationConfig(token: string) {
  const payload = await apiFetch<{ data: RecommendationAdminConfig }>(
    "/api/recomendaciones/admin/config",
    { method: "GET" },
    { local: true, token },
  );
  return unwrapData(payload);
}

export async function updateAdminRecommendationConfig(
  token: string,
  config: Partial<RecommendationAdminConfig>,
) {
  const payload = await apiFetch<{ data: RecommendationAdminConfig }>(
    "/api/recomendaciones/admin/config",
    {
      method: "PUT",
      body: JSON.stringify(config),
    },
    { local: true, token },
  );
  return unwrapData(payload);
}

export async function fetchRecentlyViewedRecommendations(token?: string) {
  const payload = await apiFetch<{ data: RecommendationSectionResponse }>(
    "/api/recomendaciones/vistos-recientemente",
    { method: "GET" },
    getClientOptions(token),
  );
  return unwrapData(payload);
}

export async function fetchBuyAgainRecommendations(token: string) {
  const payload = await apiFetch<{ data: RecommendationSectionResponse }>(
    "/api/recomendaciones/recompra",
    { method: "GET" },
    getClientOptions(token),
  );
  return unwrapData(payload);
}

export async function fetchAccountRecommendations(token: string) {
  const query = new URLSearchParams({
    estrategia: "para_ti",
    superficie: "cuenta",
    limite: "12",
  });

  const payload = await apiFetch<{ data: RecommendationSectionResponse }>(
    `/api/recomendaciones?${query.toString()}`,
    { method: "GET" },
    getClientOptions(token),
  );

  return unwrapData(payload);
}

export async function clearRecentlyViewedHistory(token?: string) {
  const payload = await apiFetch<{ data: { deleted: number } }>(
    "/api/recomendaciones/historial/vistos",
    { method: "DELETE" },
    getClientOptions(token),
  );
  return unwrapData(payload);
}

export async function cleanupRecommendationData(token: string) {
  const payload = await apiFetch<{ data: { eventsDeleted: number; cacheDeleted: number } }>(
    "/api/recomendaciones/admin/cleanup",
    { method: "POST" },
    { local: true, token },
  );
  return unwrapData(payload);
}

export async function rebuildRecommendationAggregates(token: string) {
  await apiFetch(
    "/api/recomendaciones/admin/rebuild",
    { method: "POST" },
    { local: true, token },
  );
}
