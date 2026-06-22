import { Suspense } from "react";
import { ProductFilters } from "./product-filters";
import type { CatalogQuery, CatalogSort } from "@/lib/types";
import {
  DESTACADOS_CATALOG_FETCH_LIMIT,
  fetchCategories,
  fetchCatalogPage,
  getCatalogQueryForSort,
  isOfertasCatalogSort,
  mapCatalogSortForOffersView,
  resolveCatalogOnlyAvailable,
} from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";
export const dynamic = "force-dynamic";

const CATALOG_SORTS: CatalogSort[] = [
  "destacados",
  "populares",
  "mas_comprados",
  "recientes",
  "ofertas_populares",
  "ofertas_mas_compradas",
  "ofertas_recientes",
  "precio_asc",
  "precio_desc",
  "nombre_asc",
];

function getSingleParam(params: URLSearchParams, key: string) {
  return params.get(key)?.trim() || undefined;
}

function isLegacySaleRoute(params: URLSearchParams): boolean {
  const tag = params.get("tag");
  const tags = params.get("tags")?.split(",") ?? [];

  return (
    params.get("onlyOffers") === "true" ||
    tag === "sale" ||
    tags.includes("sale")
  );
}

function getCatalogSort(value: string | null, params: URLSearchParams): CatalogSort {
  if (value && CATALOG_SORTS.includes(value as CatalogSort)) {
    return value as CatalogSort;
  }

  return "destacados";
}

function resolveInitialOnlyOffers(params: URLSearchParams): boolean {
  if (isLegacySaleRoute(params)) {
    return true;
  }

  if (isOfertasCatalogSort(getCatalogSort(params.get("sort"), params))) {
    return true;
  }

  const discountParam =
    params.get("offerPercent")?.trim() || params.get("discount")?.trim();

  if (discountParam) {
    const parsed = Number(discountParam);
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
}

function getNumberParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;

  const queryParams = new URLSearchParams();
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string") {
          queryParams.append(key, entry);
        }
      });
      return;
    }

    if (typeof value === "string") {
      queryParams.set(key, value);
    }
  });

  const queryKey = queryParams.toString() || "all";

  const sort = getCatalogSort(queryParams.get("sort"), queryParams);
  const onlyOffers = resolveInitialOnlyOffers(queryParams);
  const effectiveSort = onlyOffers ? mapCatalogSortForOffersView(sort) : sort;

  const initialParams: CatalogQuery = {
    ...getCatalogQueryForSort(effectiveSort, DESTACADOS_CATALOG_FETCH_LIMIT, {
      onlyOffers,
    }),
    category: getSingleParam(queryParams, "category"),
    line: getSingleParam(queryParams, "line"),
    talla: getSingleParam(queryParams, "talla"),
    minPrice: getNumberParam(queryParams, "minPrice"),
    maxPrice: onlyOffers
      ? undefined
      : getNumberParam(queryParams, "maxPrice"),
    q: getSingleParam(queryParams, "q"),
    onlyAvailable: resolveCatalogOnlyAvailable(queryParams.get("onlyAvailable")),
    onlyOffers,
  };

  const [initialPage, categories, lineas, tallas] = await Promise.all([
    fetchCatalogPage(initialParams).catch(() => ({ items: [], nextCursor: null, hasMore: false })),
    fetchCategories(),
    lineasApi.getAll(),
    tallasApi.getAll(),
  ]);

  return (
    <div className="container py-6 md:py-8 lg:py-10">
      <Suspense fallback={<div>Cargando catálogo...</div>}>
        <ProductFilters
          key={queryKey}
          initialPage={initialPage}
          categories={categories}
          lineas={lineas}
          tallas={tallas}
        />
      </Suspense>
    </div>
  );
}
