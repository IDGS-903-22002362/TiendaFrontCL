import { Suspense } from "react";
import { ProductFilters } from "./product-filters";
import { fetchCategories, fetchCatalogPage } from "@/lib/api/storefront";
import type { CatalogSort } from "@/lib/types";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";

export const dynamic = "force-dynamic";

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
    category: queryParams.get("category") || undefined,
    line: queryParams.get("line") || undefined,
    talla: queryParams.get("talla") || undefined,
    minPrice: queryParams.has("minPrice") ? Number(queryParams.get("minPrice")) : undefined,
    maxPrice: queryParams.has("maxPrice") ? Number(queryParams.get("maxPrice")) : undefined,
    sort: (queryParams.get("sort") as CatalogSort) || undefined,
    q: queryParams.get("q") || undefined,
    onlyOffers: queryParams.get("onlyOffers") === "true",
    onlyAvailable: queryParams.get("onlyAvailable") === "true",
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
