import { Suspense } from "react";
import { ProductFilters } from "./product-filters";
import { fetchCategories, fetchCatalogPage } from "@/lib/api/storefront";
import type { CatalogSort } from "@/lib/types";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";

export const dynamic = "force-dynamic";

const CATALOG_SORTS: CatalogSort[] = [
  "destacados",
  "precio_asc",
  "precio_desc",
  "recientes",
  "nombre_asc",
];

function getSingleParam(params: URLSearchParams, key: string) {
  return params.get(key)?.trim() || undefined;
}

function getCatalogSort(value: string | null): CatalogSort {
  return CATALOG_SORTS.includes(value as CatalogSort)
    ? (value as CatalogSort)
    : "destacados";
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

  const initialParams = {
    limit: 24,
    category: getSingleParam(queryParams, "category"),
    line: getSingleParam(queryParams, "line"),
    talla: getSingleParam(queryParams, "talla"),
    minPrice: getNumberParam(queryParams, "minPrice"),
    maxPrice: getNumberParam(queryParams, "maxPrice"),
    sort: getCatalogSort(queryParams.get("sort")),
    q: getSingleParam(queryParams, "q"),
    onlyOffers: queryParams.get("onlyOffers") === "true",
    onlyAvailable: queryParams.get("onlyAvailable") !== "false",
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
