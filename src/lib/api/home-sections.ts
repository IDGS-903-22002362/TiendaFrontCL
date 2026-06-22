import type { Product } from "@/lib/types";
import {
  fetchBuyAgainRecommendations,
  fetchRecentlyViewedRecommendations,
  fetchRecommendations,
  mapRecommendationItems,
  type RecommendationStrategy,
} from "@/lib/api/recommendations";
import {
  getFavorites,
  mapFavoriteProductToProductCard,
} from "@/lib/api/favorites";
import {
  fetchCatalogPage,
  getMasCompradosCatalogQuery,
  getOfertasMasCompradasCatalogQuery,
  getOfertasPopularesCatalogQuery,
  getOfertasRecientesCatalogQuery,
  getPopularesCatalogQuery,
  getRecientesCatalogQuery,
  mapCatalogProductToProductCardViewModel,
} from "@/lib/api/storefront";

const HOME_RAIL_LIMIT = 12;

/** Home Destacados rail cap — catalog keeps full fetch via DESTACADOS_CATALOG_FETCH_LIMIT. */
export const HOME_DESTACADOS_RAIL_LIMIT = 8;

/**
 * Home Destacados rail: same ordered list as /products?sort=destacados first page,
 * minus editorial slots (hero/collection). Does not re-rank or re-filter.
 */
export function buildHomeDestacadosRailProducts(
  products: Product[],
  excludeIds: string[],
  limit = HOME_DESTACADOS_RAIL_LIMIT,
): Product[] {
  const excluded = new Set(excludeIds.filter(Boolean));

  return products
    .filter((product) => Boolean(product.id) && !excluded.has(product.id))
    .slice(0, limit);
}

export function filterVisibleHomeRailProducts(products: Product[]) {
  return products.filter(
    (product) => product.id && product.activo !== false && product.images.length > 0,
  );
}

export function shouldShowHomeRail(products: Product[] | null | undefined): boolean {
  if (!products) {
    return false;
  }

  return filterVisibleHomeRailProducts(products).length > 0;
}

export async function loadFavoritesRailProducts(): Promise<Product[]> {
  const response = await getFavorites(HOME_RAIL_LIMIT);
  const products = (response.data ?? [])
    .filter((item) => Boolean(item.producto?.id))
    .map((item) => mapFavoriteProductToProductCard(item.producto));
  return filterVisibleHomeRailProducts(products);
}

export async function loadBuyAgainRailProducts(token: string): Promise<Product[]> {
  const section = await fetchBuyAgainRecommendations(token);
  return filterVisibleHomeRailProducts(mapRecommendationItems(section.items));
}

async function loadCatalogRecientesRailProducts(): Promise<Product[]> {
  const page = await fetchCatalogPage(getRecientesCatalogQuery(HOME_RAIL_LIMIT));

  return filterVisibleHomeRailProducts(
    page.items.map(mapCatalogProductToProductCardViewModel),
  );
}

async function loadCatalogPopularesRailProducts(): Promise<Product[]> {
  const page = await fetchCatalogPage(getPopularesCatalogQuery(HOME_RAIL_LIMIT));

  return filterVisibleHomeRailProducts(
    page.items.map(mapCatalogProductToProductCardViewModel),
  );
}

async function loadCatalogMasCompradosRailProducts(): Promise<Product[]> {
  const page = await fetchCatalogPage(getMasCompradosCatalogQuery(HOME_RAIL_LIMIT));

  return filterVisibleHomeRailProducts(
    page.items.map(mapCatalogProductToProductCardViewModel),
  );
}

async function loadCatalogOfertasPopularesRailProducts(): Promise<Product[]> {
  const page = await fetchCatalogPage(
    getOfertasPopularesCatalogQuery(HOME_RAIL_LIMIT),
  );

  return filterVisibleHomeRailProducts(
    page.items.map(mapCatalogProductToProductCardViewModel),
  );
}

async function loadCatalogOfertasMasCompradasRailProducts(): Promise<Product[]> {
  const page = await fetchCatalogPage(
    getOfertasMasCompradasCatalogQuery(HOME_RAIL_LIMIT),
  );

  return filterVisibleHomeRailProducts(
    page.items.map(mapCatalogProductToProductCardViewModel),
  );
}

async function loadCatalogOfertasRecientesRailProducts(): Promise<Product[]> {
  const page = await fetchCatalogPage(
    getOfertasRecientesCatalogQuery(HOME_RAIL_LIMIT),
  );

  return filterVisibleHomeRailProducts(
    page.items.map(mapCatalogProductToProductCardViewModel),
  );
}

export async function loadOfertasPopularesRailProducts(): Promise<Product[]> {
  return loadCatalogOfertasPopularesRailProducts();
}

export async function loadOfertasMasCompradasRailProducts(): Promise<Product[]> {
  return loadCatalogOfertasMasCompradasRailProducts();
}

export async function loadOfertasRecientesRailProducts(): Promise<Product[]> {
  return loadCatalogOfertasRecientesRailProducts();
}

export async function loadRecommendationRailProducts(
  estrategia: RecommendationStrategy,
  token?: string,
): Promise<Product[]> {
  if (estrategia === "popularidad") {
    return loadCatalogPopularesRailProducts();
  }

  if (estrategia === "mas_vendidos") {
    return loadCatalogMasCompradosRailProducts();
  }

  try {
    const section = await fetchRecommendations({
      estrategia,
      limite: HOME_RAIL_LIMIT,
      token,
    });
    const products = filterVisibleHomeRailProducts(
      mapRecommendationItems(section.items),
    );

    if (products.length > 0) {
      return products;
    }
  } catch {
    // Fall through to empty state for non-catalog strategies.
  }

  return [];
}

export async function loadRecentlyViewedRailProducts(token?: string): Promise<Product[]> {
  const section = await fetchRecentlyViewedRecommendations(token);
  return filterVisibleHomeRailProducts(mapRecommendationItems(section.items));
}

export async function loadNewArrivalsRailProducts(): Promise<Product[]> {
  const catalogProducts = await loadCatalogRecientesRailProducts();

  if (catalogProducts.length > 0) {
    return catalogProducts;
  }

  try {
    const section = await fetchRecommendations({
      estrategia: "novedades",
      limite: HOME_RAIL_LIMIT,
    });
    return filterVisibleHomeRailProducts(mapRecommendationItems(section.items));
  } catch {
    return [];
  }
}
