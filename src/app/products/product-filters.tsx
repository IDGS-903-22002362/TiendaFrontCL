"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Linea, Product, Talla } from "@/lib/types";
import { ProductGrid } from "./product-grid";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { FilterDrawer } from "@/components/storefront/catalog/filter-drawer";
import { FilterSidebar } from "@/components/storefront/catalog/filter-sidebar";
import { ProductToolbar } from "@/components/storefront/catalog/product-toolbar";
import { useStorefront } from "@/hooks/use-storefront";
import { isCategoryVisible, normalizeStorefrontText } from "@/lib/storefront";

type ProductFiltersProps = {
  allProducts: Product[];
  categories: Category[];
  lineas: Linea[];
  tallas: Talla[];
};

function sortProducts(products: Product[], sort: string) {
  const sortable = [...products];

  switch (sort) {
    case "featured":
      sortable.sort((a, b) => {
        const scoreA =
          (a.tags.includes("sale") ? 5 : 0) +
          (a.tags.includes("new") ? 4 : 0) +
          ((a.stockTotal ?? a.stock) > 0 ? 2 : 0);
        const scoreB =
          (b.tags.includes("sale") ? 5 : 0) +
          (b.tags.includes("new") ? 4 : 0) +
          ((b.stockTotal ?? b.stock) > 0 ? 2 : 0);
        return scoreB - scoreA;
      });
      break;
    case "price-asc":
      sortable.sort(
        (a, b) => (a.salePrice || a.price) - (b.salePrice || b.price),
      );
      break;
    case "price-desc":
      sortable.sort(
        (a, b) => (b.salePrice || b.price) - (a.salePrice || a.price),
      );
      break;
    case "newest":
      sortable.sort(
        (a, b) =>
          (b.tags.includes("new") ? 1 : -1) - (a.tags.includes("new") ? 1 : -1),
      );
      break;
    default:
      break;
  }

  return sortable;
}

export function ProductFilters({
  allProducts,
  categories,
  lineas,
  tallas,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wishlistIds } = useStorefront();

  const maxCatalogPrice = useMemo(() => {
    const maxPrice = allProducts.reduce((currentMax, product) => {
      const effectivePrice = product.salePrice || product.price;
      return Math.max(currentMax, effectivePrice);
    }, 0);

    return Math.max(100, Math.ceil(maxPrice / 100) * 100);
  }, [allProducts]);

  const [sort, setSort] = useState(searchParams.get("sort") || "featured");
  const [category, setCategory] = useState(
    searchParams.get("category") || "all",
  );
  const [linea, setLinea] = useState(searchParams.get("linea") || "all");
  const [selectedSize, setSelectedSize] = useState(
    searchParams.get("size") || "all",
  );
  const [priceRange, setPriceRange] = useState<[number]>(() => {
    const maxPriceFromQuery = Number(searchParams.get("maxPrice"));
    if (!Number.isFinite(maxPriceFromQuery) || maxPriceFromQuery <= 0) {
      return [maxCatalogPrice];
    }

    return [Math.min(maxPriceFromQuery, maxCatalogPrice)];
  });
  const [tags, setTags] = useState<string[]>(searchParams.getAll("tag"));
  const [wishlistOnly, setWishlistOnly] = useState(
    searchParams.get("wishlist") === "1",
  );

  // Parsear IDs de productos específicos desde query string
  const productIds = useMemo(() => {
    const idsParam = searchParams.get("ids");
    if (!idsParam) return [] as string[];
    return idsParam.split(",").filter((id) => id.trim());
  }, [searchParams]);

  // Parsear límite de productos desde query string
  const productLimit = useMemo(() => {
    const limitParam = searchParams.get("limit");
    const parsed = limitParam ? parseInt(limitParam, 10) : null;
    return parsed && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const searchQuery = searchParams.get("q")?.trim() ?? "";

  const visibleCategories = useMemo(
    () => categories.filter((categoryItem) => isCategoryVisible(categoryItem)),
    [categories],
  );
  const visibleLineas = useMemo(
    () =>
      lineas
        .filter((lineaItem) => lineaItem.activo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [lineas],
  );
  const visibleSizes = useMemo(
    () => [...tallas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [tallas],
  );

  useEffect(() => {
    if (priceRange[0] > maxCatalogPrice) {
      setPriceRange([maxCatalogPrice]);
    }
  }, [maxCatalogPrice, priceRange]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (sort !== "featured") params.set("sort", sort);
    if (category !== "all") params.set("category", category);
    if (linea !== "all") params.set("linea", linea);
    if (selectedSize !== "all") params.set("size", selectedSize);
    if (priceRange[0] < maxCatalogPrice)
      params.set("maxPrice", priceRange[0].toString());
    if (wishlistOnly) params.set("wishlist", "1");
    tags.forEach((tag) => params.append("tag", tag));
    // Preservar IDs y limit si vienen desde URL (ej: banner con productos específicos)
    if (productIds.length > 0) params.set("ids", productIds.join(","));
    if (productLimit && productLimit > 0) params.set("limit", productLimit.toString());

    const nextQueryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    router.replace(
      nextQueryString ? `/products?${nextQueryString}` : "/products",
      { scroll: false },
    );
  }, [
    category,
    linea,
    maxCatalogPrice,
    priceRange,
    router,
    searchQuery,
    selectedSize,
    sort,
    tags,
    searchParams,
    wishlistOnly,
    productIds,
    productLimit,
  ]);

  // Solo validar categorías/líneas/tallas si NO estamos usando IDs específicos
  // (para evitar reiniciar filtros cuando venimos de un banner con productos específicos)
  useEffect(() => {
    if (
      productIds.length === 0 &&
      category !== "all" &&
      !visibleCategories.some((item) => item.slug === category)
    ) {
      setCategory("all");
    }
  }, [category, visibleCategories, productIds]);

  useEffect(() => {
    if (
      productIds.length === 0 &&
      linea !== "all" &&
      !visibleLineas.some((item) => item.id === linea)
    ) {
      setLinea("all");
    }
  }, [linea, visibleLineas, productIds]);

  useEffect(() => {
    if (
      productIds.length === 0 &&
      selectedSize !== "all" &&
      !visibleSizes.some(
        (sizeItem) =>
          sizeItem.id === selectedSize || sizeItem.codigo === selectedSize,
      )
    ) {
      setSelectedSize("all");
    }
  }, [selectedSize, visibleSizes, productIds]);

  const { productsToShow, searchWithoutMatches } = useMemo(() => {
    let products = [...allProducts];

    // Si hay IDs específicos de productos, filtrar solo esos
    if (productIds.length > 0) {
      products = products.filter((product) => productIds.includes(product.id));
    }

    if (category !== "all") {
      const selectedCategory = visibleCategories.find(
        (item) => item.slug === category,
      );
      const selectedSlug = normalizeStorefrontText(
        selectedCategory?.slug ?? category,
      );
      const selectedName = normalizeStorefrontText(
        selectedCategory?.name ?? category,
      );

      products = products.filter((product) => {
        const productCategory = normalizeStorefrontText(product.category);
        return (
          productCategory === selectedSlug || productCategory === selectedName
        );
      });
    }

    if (linea !== "all") {
      const selectedLine = normalizeStorefrontText(linea);
      products = products.filter((product) => {
        const productLineId = normalizeStorefrontText(product.lineId ?? "");
        const productLineName = normalizeStorefrontText(product.lineName ?? "");
        return (
          productLineId === selectedLine || productLineName === selectedLine
        );
      });
    }

    if (selectedSize !== "all") {
      const normalizedSize = normalizeStorefrontText(selectedSize);
      products = products.filter((product) =>
        (product.sizes ?? [])
          .map((size) => normalizeStorefrontText(size))
          .includes(normalizedSize),
      );
    }

    products = products.filter(
      (product) => (product.salePrice || product.price) <= priceRange[0],
    );

    if (tags.length > 0) {
      products = products.filter((product) =>
        tags.every((tag) => product.tags.includes(tag as "new" | "sale")),
      );
    }

    if (wishlistOnly) {
      products = products.filter((product) => wishlistIds.includes(product.id));
    }

    // Aplicar ordenamiento
    let sortedProducts = sortProducts(products, sort);

    // Aplicar límite de productos si está especificado
    if (productLimit && productLimit > 0) {
      sortedProducts = sortedProducts.slice(0, productLimit);
    }

    const normalizedQuery = normalizeStorefrontText(searchQuery);
    if (!normalizedQuery) {
      return {
        productsToShow: sortedProducts,
        searchWithoutMatches: false,
      };
    }

    const searchMatches = sortedProducts.filter((product) =>
      normalizeStorefrontText(
        `${product.name} ${product.description} ${product.category} ${product.lineName ?? ""}`,
      ).includes(normalizedQuery),
    );

    if (searchMatches.length === 0) {
      return {
        productsToShow: sortedProducts,
        searchWithoutMatches: true,
      };
    }

    return {
      productsToShow: searchMatches,
      searchWithoutMatches: false,
    };
  }, [
    allProducts,
    category,
    linea,
    priceRange,
    searchQuery,
    selectedSize,
    sort,
    tags,
    visibleCategories,
    wishlistIds,
    wishlistOnly,
    productIds,
    productLimit,
  ]);

  const activeFilters = [
    category !== "all"
      ? (visibleCategories.find((item) => item.slug === category)?.name ??
        category)
      : null,
    linea !== "all"
      ? (visibleLineas.find((item) => item.id === linea)?.nombre ?? linea)
      : null,
    selectedSize !== "all" ? `Talla ${selectedSize}` : null,
    priceRange[0] < maxCatalogPrice
      ? `Hasta $${priceRange[0].toLocaleString()}`
      : null,
    wishlistOnly ? "Favoritos" : null,
    ...tags.map((tag) => (tag === "new" ? "Novedades" : "Ofertas")),
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setSort("featured");
    setCategory("all");
    setLinea("all");
    setSelectedSize("all");
    setPriceRange([maxCatalogPrice]);
    setTags([]);
    setWishlistOnly(false);
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    setTags((currentTags) =>
      checked
        ? [...currentTags, tag]
        : currentTags.filter((item) => item !== tag),
    );
  };

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
          max={maxCatalogPrice}
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
              checked={tags.includes("new")}
              onCheckedChange={(checked) =>
                handleTagChange("new", Boolean(checked))
              }
            />
            <span className="ml-2">Novedades</span>
          </label>
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
          count={productsToShow.length}
          searchLabel={
            searchQuery ? `Resultados para "${searchQuery}"` : undefined
          }
          activeFilters={activeFilters}
          onClear={clearFilters}
          sort={sort}
          onSortChange={setSort}
          mobileFilters={<FilterDrawer>{filterControls}</FilterDrawer>}
        />

        {searchWithoutMatches && searchQuery ? (
          <div className="mt-4 rounded-[1.5rem] border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-warning">
            No hubo coincidencias para &quot;{searchQuery}&quot;. Mostrando
            todos los productos disponibles.
          </div>
        ) : null}

        <div className="mt-6">
          <ProductGrid products={productsToShow} />
        </div>
      </main>
    </div>
  );
}
