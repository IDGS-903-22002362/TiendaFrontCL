"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CatalogQuery,
  CatalogResponse,
  CatalogSort,
  Category,
  Linea,
  Product,
  Talla,
} from "@/lib/types";
import { ProductGrid } from "./product-grid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { FilterDrawer } from "@/components/storefront/catalog/filter-drawer";
import { FilterSidebar } from "@/components/storefront/catalog/filter-sidebar";
import { ProductToolbar } from "@/components/storefront/catalog/product-toolbar";
import { useStorefront } from "@/hooks/use-storefront";
import { isCategoryVisible } from "@/lib/storefront";
import {
  fetchCatalogPage,
  mapCatalogProductToProductCardViewModel,
} from "@/lib/api/storefront";

type ProductFiltersProps = {
  initialPage: CatalogResponse;
  categories: Category[];
  lineas: Linea[];
  tallas: Talla[];
};

const DEFAULT_MAX_PRICE = 5000;
const CATALOG_SORTS: CatalogSort[] = [
  "destacados",
  "precio_asc",
  "precio_desc",
  "recientes",
  "nombre_asc",
];

function getCatalogSort(value: string | null): CatalogSort {
  return CATALOG_SORTS.includes(value as CatalogSort)
    ? (value as CatalogSort)
    : "destacados";
}

function getUrlParam(searchParams: URLSearchParams, key: string, fallback = "") {
  return searchParams.get(key)?.trim() || fallback;
}

function getUrlNumber(searchParams: URLSearchParams, key: string, fallback: number) {
  const value = searchParams.get(key);
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ProductFilters({
  initialPage,
  categories,
  lineas,
  tallas,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wishlistIds } = useStorefront();

  const [items, setItems] = useState<Product[]>(() =>
    initialPage.items.map(mapCatalogProductToProductCardViewModel),
  );
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialPage.nextCursor,
  );
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<CatalogSort>(() =>
    getCatalogSort(searchParams.get("sort")),
  );
  const [category, setCategory] = useState(() =>
    getUrlParam(searchParams, "category", "all"),
  );
  const [linea, setLinea] = useState(() =>
    getUrlParam(searchParams, "line", "all"),
  );
  const [selectedSize, setSelectedSize] = useState(() =>
    getUrlParam(searchParams, "talla", "all"),
  );
  const [priceRange, setPriceRange] = useState<[number]>(() => [
    getUrlNumber(searchParams, "maxPrice", DEFAULT_MAX_PRICE),
  ]);
  const [searchQuery, setSearchQuery] = useState(() =>
    getUrlParam(searchParams, "q"),
  );
  const [onlyOffers, setOnlyOffers] = useState(
    () => searchParams.get("onlyOffers") === "true",
  );
  const [onlyAvailable, setOnlyAvailable] = useState(
    () => searchParams.get("onlyAvailable") === "true",
  );
  const [wishlistOnly, setWishlistOnly] = useState(false);

  const initialRender = useRef(true);

  const visibleCategories = useMemo(
    () => categories.filter(isCategoryVisible),
    [categories],
  );
  const visibleLineas = useMemo(() => lineas, [lineas]);
  const visibleSizes = useMemo(() => tallas, [tallas]);

  const catalogQuery = useCallback(
    (cursor?: string | null): CatalogQuery => {
      const shouldSendPriceSort =
        priceRange[0] < DEFAULT_MAX_PRICE &&
        sort !== "precio_asc" &&
        sort !== "precio_desc";

      return {
        limit: 24,
        cursor: cursor || undefined,
        category: category !== "all" ? category : undefined,
        line: linea !== "all" ? linea : undefined,
        talla: selectedSize !== "all" ? selectedSize : undefined,
        maxPrice:
          priceRange[0] < DEFAULT_MAX_PRICE ? priceRange[0] : undefined,
        sort: shouldSendPriceSort ? "precio_asc" : sort,
        q: searchQuery || undefined,
        onlyOffers,
        onlyAvailable,
      };
    },
    [
      category,
      linea,
      onlyAvailable,
      onlyOffers,
      priceRange,
      searchQuery,
      selectedSize,
      sort,
    ],
  );

  const loadPage = useCallback(
    async (cursor?: string | null) => {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchCatalogPage(catalogQuery(cursor));
        const newProducts = response.items.map(
          mapCatalogProductToProductCardViewModel,
        );

        setItems((current) =>
          cursor ? [...current, ...newProducts] : newProducts,
        );
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (loadError) {
        console.error("Failed to load catalog page", loadError);
        if (!cursor) {
          setItems([]);
          setNextCursor(null);
          setHasMore(false);
        }
        setError("No se pudo cargar el catálogo. Intenta de nuevo.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [catalogQuery],
  );

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    const params = new URLSearchParams();

    if (category !== "all") params.set("category", category);
    if (linea !== "all") params.set("line", linea);
    if (selectedSize !== "all") params.set("talla", selectedSize);
    if (priceRange[0] < DEFAULT_MAX_PRICE) {
      params.set("maxPrice", String(priceRange[0]));
    }
    if (sort !== "destacados") params.set("sort", sort);
    if (searchQuery) params.set("q", searchQuery);
    if (onlyOffers) params.set("onlyOffers", "true");
    if (onlyAvailable) params.set("onlyAvailable", "true");

    const nextUrl = params.toString() ? `?${params.toString()}` : "/products";
    router.push(nextUrl, { scroll: false });
    void loadPage(null);
  }, [
    category,
    linea,
    loadPage,
    onlyAvailable,
    onlyOffers,
    priceRange,
    router,
    searchQuery,
    selectedSize,
    sort,
  ]);

  const activeFilters = [
    category !== "all"
      ? (visibleCategories.find((item) => item.id === category)?.name ??
        category)
      : null,
    linea !== "all"
      ? (visibleLineas.find((item) => item.id === linea)?.nombre ?? linea)
      : null,
    selectedSize !== "all" ? `Talla ${selectedSize}` : null,
    priceRange[0] < DEFAULT_MAX_PRICE
      ? `Hasta $${priceRange[0].toLocaleString("es-MX")}`
      : null,
    onlyOffers ? "Ofertas" : null,
    onlyAvailable ? "Solo disponibles" : null,
    wishlistOnly ? "Favoritos" : null,
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setSort("destacados");
    setCategory("all");
    setLinea("all");
    setSelectedSize("all");
    setPriceRange([DEFAULT_MAX_PRICE]);
    setSearchQuery("");
    setOnlyOffers(false);
    setOnlyAvailable(false);
    setWishlistOnly(false);
  };

  const productsToShow = wishlistOnly
    ? items.filter((product) => wishlistIds.includes(product.id))
    : items;

  const filterControls = (
    <div className="space-y-7">
      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Categoría
        </h3>
        <div className="space-y-2">
          <label className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]">
            <Checkbox
              checked={category === "all"}
              onCheckedChange={() => setCategory("all")}
            />
            <span className="ml-2">Todas</span>
          </label>
          {visibleCategories.map((categoryItem) => (
            <label
              key={categoryItem.id}
              className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]"
            >
              <Checkbox
                checked={category === categoryItem.id}
                onCheckedChange={() => setCategory(categoryItem.id)}
              />
              <span className="ml-2">{categoryItem.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Precio
        </h3>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number])}
          max={DEFAULT_MAX_PRICE}
          step={100}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Hasta ${priceRange[0].toLocaleString("es-MX")}
        </p>
      </div>

      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Líneas
        </h3>
        <div className="space-y-2">
          <label className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]">
            <Checkbox
              checked={linea === "all"}
              onCheckedChange={() => setLinea("all")}
            />
            <span className="ml-2">Todas</span>
          </label>
          {visibleLineas.map((lineaItem) => (
            <label
              key={lineaItem.id}
              className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]"
            >
              <Checkbox
                checked={linea === lineaItem.id}
                onCheckedChange={() => setLinea(lineaItem.id)}
              />
              <span className="ml-2">{lineaItem.nombre}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Tallas
        </h3>
        <div className="space-y-2">
          <label className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]">
            <Checkbox
              checked={selectedSize === "all"}
              onCheckedChange={() => setSelectedSize("all")}
            />
            <span className="ml-2">Todas</span>
          </label>
          {visibleSizes.map((sizeItem) => (
            <label
              key={sizeItem.id}
              className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]"
            >
              <Checkbox
                checked={
                  selectedSize === sizeItem.id ||
                  selectedSize === sizeItem.codigo
                }
                onCheckedChange={() => setSelectedSize(sizeItem.codigo)}
              />
              <span className="ml-2">{sizeItem.codigo}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Disponibilidad
        </h3>
        <div className="space-y-2">
          <label className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]">
            <Checkbox
              checked={onlyAvailable}
              onCheckedChange={(checked) => setOnlyAvailable(Boolean(checked))}
            />
            <span className="ml-2">Solo disponibles</span>
          </label>
          <label className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]">
            <Checkbox
              checked={onlyOffers}
              onCheckedChange={(checked) => setOnlyOffers(Boolean(checked))}
            />
            <span className="ml-2">Solo ofertas</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Favoritos
        </h3>
        <label className="flex min-h-[44px] items-center text-[15px] text-muted-foreground lg:text-[16px]">
          <Checkbox
            checked={wishlistOnly}
            onCheckedChange={(checked) => setWishlistOnly(Boolean(checked))}
          />
          <span className="ml-2">Solo favoritos</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] xl:gap-8">
      <FilterSidebar>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/72">
          Refinar búsqueda
        </p>
        <div className="mt-5">{filterControls}</div>
      </FilterSidebar>

      <main>
        <ProductToolbar
          count={productsToShow.length}
          searchLabel={
            searchQuery ? `Resultados para "${searchQuery}"` : undefined
          }
          activeFilters={activeFilters}
          onClear={clearFilters}
          sort={sort}
          onSortChange={(value) => setSort(value as CatalogSort)}
          mobileFilters={<FilterDrawer>{filterControls}</FilterDrawer>}
        />

        {error ? (
          <div className="mt-6 border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-[44px]"
              onClick={() => void loadPage(null)}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div
            className="mt-6 border border-black/14 bg-white p-5 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Cargando catálogo...
          </div>
        ) : (
          <div className="mt-6">
            <ProductGrid products={productsToShow} />

            {hasMore && !error ? (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => void loadPage(nextCursor)}
                  disabled={loadingMore}
                  variant="outline"
                  className="min-h-[44px] min-w-[200px]"
                >
                  {loadingMore ? "Cargando..." : "Cargar más"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
