import re

content = """
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Linea, Product, Talla, CatalogResponse, CatalogSort } from "@/lib/types";
import { ProductGrid } from "./product-grid";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { FilterDrawer } from "@/components/storefront/catalog/filter-drawer";
import { FilterSidebar } from "@/components/storefront/catalog/filter-sidebar";
import { ProductToolbar } from "@/components/storefront/catalog/product-toolbar";
import { useStorefront } from "@/hooks/use-storefront";
import { isCategoryVisible, normalizeStorefrontText } from "@/lib/storefront";
import { fetchCatalogPage, mapCatalogProductToProductCardViewModel } from "@/lib/api/storefront";
import { Button } from "@/components/ui/button";

type ProductFiltersProps = {
  initialPage: CatalogResponse;
  categories: Category[];
  lineas: Linea[];
  tallas: Talla[];
};

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
    initialPage.items.map(mapCatalogProductToProductCardViewModel)
  );
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialPage.hasMore);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Parse filters from URL
  const getSortFromUrl = () => {
    const s = searchParams.get("sort");
    return s ? (s as CatalogSort) : "destacados";
  };
  const getParam = (key: string, defaultValue: any) => searchParams.get(key) || defaultValue;

  const [sort, setSort] = useState<CatalogSort>(getSortFromUrl());
  const [category, setCategory] = useState(getParam("category", "all"));
  const [linea, setLinea] = useState(getParam("line", "all"));
  const [selectedSize, setSelectedSize] = useState(getParam("talla", "all"));
  const [priceRange, setPriceRange] = useState<[number]>([
    Number(getParam("maxPrice", 5000))
  ]);
  const [searchQuery, setSearchQuery] = useState(getParam("q", ""));

  // Note: Only Offers mapped to tags.includes('sale') implicitly
  const [tags, setTags] = useState<string[]>([]);
  const [wishlistOnly, setWishlistOnly] = useState(false);

  const initialRender = useRef(true);

  const visibleCategories = useMemo(
    () => categories.filter(isCategoryVisible),
    [categories],
  );

  const visibleLineas = useMemo(
    () => lineas.filter((linea) => !linea.oculta),
    [lineas],
  );

  const visibleSizes = useMemo(
    () => tallas.filter((talla) => !talla.oculta),
    [tallas],
  );

  const loadPage = useCallback(async (cursor?: string | null) => {
    if (!cursor) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const isPriceSort = sort === "precio_asc" || sort === "precio_desc";
      const actualSort = isPriceSort ? sort : (priceRange[0] < 5000 ? "precio_asc" : sort); // Required by API if price is used? Wait, API allows min/max with sort.

      const response = await fetchCatalogPage({
        limit: 24,
        cursor: cursor || undefined,
        category: category !== "all" ? category : undefined,
        line: linea !== "all" ? linea : undefined,
        talla: selectedSize !== "all" ? selectedSize : undefined,
        maxPrice: priceRange[0] < 5000 ? priceRange[0] : undefined,
        sort: actualSort,
        q: searchQuery || undefined,
        onlyOffers: tags.includes("sale"),
        onlyAvailable: true,
      });

      const newProducts = response.items.map(mapCatalogProductToProductCardViewModel);

      if (cursor) {
        setItems((prev) => [...prev, ...newProducts]);
      } else {
        setItems(newProducts);
      }
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error("Failed to load catalog page", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, linea, selectedSize, priceRange, sort, searchQuery, tags]);

  // Sync state to URL and fetch new data when filters change
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (category !== "all") params.set("category", category);
    else params.delete("category");

    if (linea !== "all") params.set("line", linea);
    else params.delete("line");

    if (selectedSize !== "all") params.set("talla", selectedSize);
    else params.delete("talla");

    if (priceRange[0] < 5000) params.set("maxPrice", String(priceRange[0]));
    else params.delete("maxPrice");

    if (sort && sort !== "destacados") params.set("sort", sort);
    else params.delete("sort");

    if (searchQuery) params.set("q", searchQuery);
    else params.delete("q");

    router.push(`?${params.toString()}`, { scroll: false });

    // Fetch page 1
    loadPage(null);
  }, [category, linea, selectedSize, priceRange, sort, searchQuery, tags, router]);

  const activeFilters = [
    category !== "all"
      ? (visibleCategories.find((item) => item.slug === category)?.name ??
        category)
      : null,
    linea !== "all"
      ? (visibleLineas.find((item) => item.id === linea)?.nombre ?? linea)
      : null,
    selectedSize !== "all" ? `Talla ${selectedSize}` : null,
    priceRange[0] < 5000
      ? `Hasta $${priceRange[0].toLocaleString()}`
      : null,
    wishlistOnly ? "Favoritos" : null,
    ...tags.map((tag) => (tag === "new" ? "Novedades" : "Ofertas")),
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setSort("destacados");
    setCategory("all");
    setLinea("all");
    setSelectedSize("all");
    setPriceRange([5000]);
    setTags([]);
    setWishlistOnly(false);
    setSearchQuery("");
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setTags((currentTags) =>
      checked
        ? [...currentTags, tag]
        : currentTags.filter((item) => item !== tag),
    );
  };

  let productsToShow = items;
  if (wishlistOnly) {
    productsToShow = items.filter((p) => wishlistIds.includes(p.id));
  }

  const filterControls = (
    <div className="space-y-7">
      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Categoría
        </h3>
        <div className="space-y-2">
          <label className="flex items-center min-h-[44px] text-[15px] lg:text-[16px] text-muted-foreground">
            <Checkbox
              checked={category === "all"}
              onCheckedChange={() => setCategory("all")}
            />
            <span className="ml-2">Todas</span>
          </label>
          {visibleCategories.map((categoryItem) => (
            <label
              key={categoryItem.id}
              className="flex items-center text-sm text-muted-foreground"
            >
              <Checkbox
                checked={category === categoryItem.slug}
                onCheckedChange={() => setCategory(categoryItem.slug)}
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
          max={5000}
          step={100}
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Hasta ${priceRange[0].toLocaleString()}
        </p>
      </div>

      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Líneas
        </h3>
        <div className="space-y-2">
          <label className="flex items-center min-h-[44px] text-[15px] lg:text-[16px] text-muted-foreground">
            <Checkbox
              checked={linea === "all"}
              onCheckedChange={() => setLinea("all")}
            />
            <span className="ml-2">Todas</span>
          </label>
          {visibleLineas.map((lineaItem) => (
            <label
              key={lineaItem.id}
              className="flex items-center text-sm text-muted-foreground"
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
          <label className="flex items-center min-h-[44px] text-[15px] lg:text-[16px] text-muted-foreground">
            <Checkbox
              checked={selectedSize === "all"}
              onCheckedChange={() => setSelectedSize("all")}
            />
            <span className="ml-2">Todas</span>
          </label>
          {visibleSizes.map((sizeItem) => (
            <label
              key={sizeItem.id}
              className="flex items-center text-sm text-muted-foreground"
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
          Etiquetas
        </h3>
        <div className="space-y-2">
          <label className="flex items-center min-h-[44px] text-[15px] lg:text-[16px] text-muted-foreground">
            <Checkbox
              checked={tags.includes("sale")}
              onCheckedChange={(checked) =>
                handleTagChange("sale", Boolean(checked))
              }
            />
            <span className="ml-2">Ofertas</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-headline text-[var(--font-size-subtitle)] font-semibold uppercase leading-none tracking-[0.03em]">
          Favoritos
        </h3>
        <label className="flex items-center min-h-[44px] text-[15px] lg:text-[16px] text-muted-foreground">
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
          count={items.length}
          searchLabel={
            searchQuery ? `Resultados para "${searchQuery}"` : undefined
          }
          activeFilters={activeFilters}
          onClear={clearFilters}
          sort={sort}
          onSortChange={(val) => setSort(val as CatalogSort)}
          mobileFilters={<FilterDrawer>{filterControls}</FilterDrawer>}
        />

        {loading ? (
          <div className="mt-6">Cargando catálogo...</div>
        ) : (
          <div className="mt-6">
            <ProductGrid products={productsToShow} />

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => loadPage(nextCursor)}
                  disabled={loadingMore}
                  variant="outline"
                  className="min-w-[200px]"
                >
                  {loadingMore ? "Cargando..." : "Cargar más"}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
"""
with open("src/app/products/product-filters.tsx", "w") as f:
    f.write(content)
