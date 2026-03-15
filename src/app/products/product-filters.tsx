"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductGrid } from "./product-grid";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product, Category, Linea, Talla } from "@/lib/types";
import { Filter, SlidersHorizontal } from "lucide-react";

type ProductFiltersProps = {
  allProducts: Product[];
  categories: Category[];
  lineas: Linea[];
  tallas: Talla[];
};

const normalizeCategoryValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const sortProducts = (products: Product[], sort: string) => {
  const sortable = [...products];

  switch (sort) {
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
};

export function ProductFilters({
  allProducts,
  categories,
  lineas,
  tallas,
}: ProductFiltersProps) {
  const router = useRouter();
  const initialSearchParams = useSearchParams();

  const maxCatalogPrice = useMemo(() => {
    const maxPrice = allProducts.reduce((currentMax, product) => {
      const effectivePrice = product.salePrice || product.price;
      return Math.max(currentMax, effectivePrice);
    }, 0);

    return Math.max(100, Math.ceil(maxPrice / 100) * 100);
  }, [allProducts]);

  const [sort, setSort] = useState(
    initialSearchParams.get("sort") || "relevance",
  );
  const [category, setCategory] = useState(
    initialSearchParams.get("category") || "all",
  );
  const [linea, setLinea] = useState(initialSearchParams.get("linea") || "all");
  const [selectedSize, setSelectedSize] = useState(
    initialSearchParams.get("size") || "all",
  );
  const [priceRange, setPriceRange] = useState<[number]>(() => {
    const maxPriceFromQuery = Number(initialSearchParams.get("maxPrice"));

    if (!Number.isFinite(maxPriceFromQuery) || maxPriceFromQuery <= 0) {
      return [maxCatalogPrice];
    }

    return [Math.min(maxPriceFromQuery, maxCatalogPrice)];
  });
  const [tags, setTags] = useState<string[]>(initialSearchParams.getAll("tag"));
  const searchQuery = initialSearchParams.get("q")?.trim() ?? "";

  const visibleCategories = useMemo(
    () =>
      categories.filter((cat) => {
        const normalized = normalizeCategoryValue(`${cat.name} ${cat.slug}`);
        return !normalized.includes("prueba") && !normalized.includes("test");
      }),
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

  const normalizeSearchValue = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  useEffect(() => {
    if (priceRange[0] > maxCatalogPrice) {
      setPriceRange([maxCatalogPrice]);
    }
  }, [maxCatalogPrice, priceRange]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (sort !== "relevance") params.set("sort", sort);
    if (category !== "all") params.set("category", category);
    if (linea !== "all") params.set("linea", linea);
    if (selectedSize !== "all") params.set("size", selectedSize);
    if (priceRange[0] < maxCatalogPrice) {
      params.set("maxPrice", priceRange[0].toString());
    }
    tags.forEach((tag) => params.append("tag", tag));

    router.replace(`/products?${params.toString()}`, { scroll: false });
  }, [
    searchQuery,
    sort,
    category,
    linea,
    selectedSize,
    priceRange,
    tags,
    router,
    maxCatalogPrice,
  ]);

  useEffect(() => {
    if (category === "all") {
      return;
    }

    const isVisibleCategory = visibleCategories.some(
      (cat) => cat.slug === category,
    );

    if (!isVisibleCategory) {
      setCategory("all");
    }
  }, [category, visibleCategories]);

  useEffect(() => {
    if (linea === "all") {
      return;
    }

    const isVisibleLinea = visibleLineas.some(
      (lineaItem) => lineaItem.id === linea,
    );

    if (!isVisibleLinea) {
      setLinea("all");
    }
  }, [linea, visibleLineas]);

  useEffect(() => {
    if (selectedSize === "all") {
      return;
    }

    const isVisibleSize = visibleSizes.some(
      (sizeItem) =>
        sizeItem.id === selectedSize || sizeItem.codigo === selectedSize,
    );

    if (!isVisibleSize) {
      setSelectedSize("all");
    }
  }, [selectedSize, visibleSizes]);

  const { productsToShow, searchWithoutMatches } = useMemo(() => {
    let products = [...allProducts];

    // Filter by category
    if (category !== "all") {
      const cat = visibleCategories.find((c) => c.slug === category);
      const selectedSlug = normalizeCategoryValue(cat?.slug ?? category);
      const selectedName = normalizeCategoryValue(cat?.name ?? category);

      products = products.filter((p) => {
        const productCategory = normalizeCategoryValue(p.category);

        return (
          productCategory === selectedSlug || productCategory === selectedName
        );
      });
    }

    if (linea !== "all") {
      products = products.filter((product) => {
        const productLineId = normalizeCategoryValue(product.lineId ?? "");
        const productLineName = normalizeCategoryValue(product.lineName ?? "");
        const selectedLineId = normalizeCategoryValue(linea);

        return (
          productLineId === selectedLineId || productLineName === selectedLineId
        );
      });
    }

    if (selectedSize !== "all") {
      const selectedSizeNormalized = normalizeCategoryValue(selectedSize);

      products = products.filter((product) => {
        const productSizes = (product.sizes ?? []).map((size) =>
          normalizeCategoryValue(size),
        );

        return productSizes.includes(selectedSizeNormalized);
      });
    }

    // Filter by price
    products = products.filter(
      (p) => (p.salePrice || p.price) <= priceRange[0],
    );

    // Filter by tags
    if (tags.length > 0) {
      products = products.filter((p) =>
        tags.every((tag) => p.tags.includes(tag as "new" | "sale")),
      );
    }

    const normalizedQuery = normalizeSearchValue(searchQuery);

    if (!normalizedQuery) {
      return {
        productsToShow: sortProducts(products, sort),
        searchWithoutMatches: false,
      };
    }

    const searchMatches = products.filter((product) => {
      const text = normalizeSearchValue(
        `${product.name} ${product.description} ${product.category}`,
      );
      return text.includes(normalizedQuery);
    });

    if (searchMatches.length === 0) {
      return {
        productsToShow: sortProducts(products, sort),
        searchWithoutMatches: true,
      };
    }

    return {
      productsToShow: sortProducts(searchMatches, sort),
      searchWithoutMatches: false,
    };
  }, [
    allProducts,
    category,
    visibleCategories,
    priceRange,
    searchQuery,
    sort,
    linea,
    selectedSize,
    tags,
  ]);

  const handleTagChange = (tag: string, checked: boolean) => {
    setTags((prev) =>
      checked ? [...prev, tag] : prev.filter((t) => t !== tag),
    );
  };

  const activeFilters = [
    category !== "all"
      ? visibleCategories.find((cat) => cat.slug === category)?.name ?? category
      : null,
    linea !== "all"
      ? visibleLineas.find((lineaItem) => lineaItem.id === linea)?.nombre ?? linea
      : null,
    selectedSize !== "all" ? `Talla ${selectedSize}` : null,
    priceRange[0] < maxCatalogPrice ? `Hasta $${priceRange[0].toLocaleString()}` : null,
    ...tags.map((tag) => (tag === "new" ? "Novedades" : "Ofertas")),
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setSort("relevance");
    setCategory("all");
    setLinea("all");
    setSelectedSize("all");
    setPriceRange([maxCatalogPrice]);
    setTags([]);
  };

  const FilterControls = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold text-foreground">Categoría</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="cat-all"
              checked={category === "all"}
              onCheckedChange={() => setCategory("all")}
            />
              <label htmlFor="cat-all" className="ml-2 text-sm text-text-secondary">
                Todos
              </label>
          </div>
          {visibleCategories.map((cat) => (
            <div key={cat.id} className="flex items-center">
              <Checkbox
                id={`cat-${cat.slug}`}
                checked={category === cat.slug}
                onCheckedChange={() => setCategory(cat.slug)}
              />
              <label htmlFor={`cat-${cat.slug}`} className="ml-2 text-sm text-text-secondary">
                {cat.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold text-foreground">Precio</h3>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number])}
          max={maxCatalogPrice}
          step={100}
        />
        <div className="mt-2 text-sm text-text-secondary">
          Hasta: ${priceRange[0].toLocaleString()}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold text-foreground">Líneas</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="linea-all"
              checked={linea === "all"}
              onCheckedChange={() => setLinea("all")}
            />
            <label htmlFor="linea-all" className="ml-2 text-sm text-text-secondary">
              Todas
            </label>
          </div>
          {visibleLineas.map((lineaItem) => (
            <div key={lineaItem.id} className="flex items-center">
              <Checkbox
                id={`linea-${lineaItem.id}`}
                checked={linea === lineaItem.id}
                onCheckedChange={() => setLinea(lineaItem.id)}
              />
              <label htmlFor={`linea-${lineaItem.id}`} className="ml-2 text-sm text-text-secondary">
                {lineaItem.nombre}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold text-foreground">Tallas</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="size-all"
              checked={selectedSize === "all"}
              onCheckedChange={() => setSelectedSize("all")}
            />
            <label htmlFor="size-all" className="ml-2 text-sm text-text-secondary">
              Todas
            </label>
          </div>
          {visibleSizes.map((sizeItem) => (
            <div key={sizeItem.id} className="flex items-center">
              <Checkbox
                id={`size-${sizeItem.id}`}
                checked={
                  selectedSize === sizeItem.id ||
                  selectedSize === sizeItem.codigo
                }
                onCheckedChange={() => setSelectedSize(sizeItem.codigo)}
              />
              <label htmlFor={`size-${sizeItem.id}`} className="ml-2 text-sm text-text-secondary">
                {sizeItem.codigo}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold text-foreground">Etiquetas</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="tag-new"
              checked={tags.includes("new")}
              onCheckedChange={(checked) => handleTagChange("new", !!checked)}
            />
            <label htmlFor="tag-new" className="ml-2 text-sm text-text-secondary">
              Novedades
            </label>
          </div>
          <div className="flex items-center">
            <Checkbox
              id="tag-sale"
              checked={tags.includes("sale")}
              onCheckedChange={(checked) => handleTagChange("sale", !!checked)}
            />
            <label htmlFor="tag-sale" className="ml-2 text-sm text-text-secondary">
              Ofertas
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:gap-8 md:grid-cols-[300px_minmax(0,1fr)]">
      {/* Desktop Filters */}
      <aside className="hidden md:block">
        <div className="sticky top-28 rounded-[30px] border border-border bg-card/92 p-6 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
            Refinar búsqueda
          </p>
          <h2 className="mb-6 mt-2 font-headline text-xl font-bold">Filtros</h2>
          <FilterControls />
        </div>
      </aside>

      {/* Products Grid */}
      <main>
        <div className="sticky top-[calc(var(--mobile-header-height)+0.5rem)] z-20 mb-4 space-y-3 rounded-[24px] border border-border bg-card/95 p-3 shadow-[var(--shadow-card)] backdrop-blur-xl md:static md:mb-6 md:flex md:flex-col md:gap-4 md:rounded-[28px] md:bg-card/88 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary">
                Exploración
              </p>
              <p className="mt-1 text-sm font-medium text-text-secondary">
                {productsToShow.length} productos
              </p>
            </div>
            {activeFilters.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-full px-3 text-xs"
                onClick={clearFilters}
              >
                Limpiar
              </Button>
            ) : null}
          </div>

          {activeFilters.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="inline-flex items-center whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
                >
                  {filter}
                </span>
              ))}
            </div>
          ) : null}

          {/* Mobile Filters Trigger */}
          <div className="flex gap-2 md:justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 flex-1 md:hidden">
                  <Filter className="mr-2 h-4 w-4" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="mobile-panel-height rounded-t-[28px] border-t border-border bg-background-deep px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
              >
                <SheetHeader className="text-left">
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Ajusta talla, línea, categoría, precio y promociones.
                  </SheetDescription>
                </SheetHeader>
                <div className="max-h-[65dvh] overflow-y-auto py-4">
                  <FilterControls />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex-1 md:flex-none">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-11 w-full md:w-[220px]">
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-text-muted" />
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevancia</SelectItem>
                  <SelectItem value="price-asc">Precio: Bajo a Alto</SelectItem>
                  <SelectItem value="price-desc">Precio: Alto a Bajo</SelectItem>
                  <SelectItem value="newest">Novedades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {searchWithoutMatches && searchQuery && (
          <div className="mb-4 rounded-[24px] border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-warning">
            No hubo coincidencias para &quot;{searchQuery}&quot;. Mostrando
            todos los productos.
          </div>
        )}
        <ProductGrid products={productsToShow} />
      </main>
    </div>
  );
}
