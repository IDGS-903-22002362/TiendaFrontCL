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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product, Category, Linea, Talla } from "@/lib/types";
import { Filter } from "lucide-react";

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

  const FilterControls = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Categoría</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="cat-all"
              checked={category === "all"}
              onCheckedChange={() => setCategory("all")}
            />
            <label htmlFor="cat-all" className="ml-2 text-sm">
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
              <label htmlFor={`cat-${cat.slug}`} className="ml-2 text-sm">
                {cat.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Precio</h3>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number])}
          max={maxCatalogPrice}
          step={100}
        />
        <div className="mt-2 text-sm text-muted-foreground">
          Hasta: ${priceRange[0].toLocaleString()}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Líneas</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="linea-all"
              checked={linea === "all"}
              onCheckedChange={() => setLinea("all")}
            />
            <label htmlFor="linea-all" className="ml-2 text-sm">
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
              <label htmlFor={`linea-${lineaItem.id}`} className="ml-2 text-sm">
                {lineaItem.nombre}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Tallas</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="size-all"
              checked={selectedSize === "all"}
              onCheckedChange={() => setSelectedSize("all")}
            />
            <label htmlFor="size-all" className="ml-2 text-sm">
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
              <label htmlFor={`size-${sizeItem.id}`} className="ml-2 text-sm">
                {sizeItem.codigo}
              </label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-headline text-lg font-semibold">Etiquetas</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <Checkbox
              id="tag-new"
              checked={tags.includes("new")}
              onCheckedChange={(checked) => handleTagChange("new", !!checked)}
            />
            <label htmlFor="tag-new" className="ml-2 text-sm">
              Novedades
            </label>
          </div>
          <div className="flex items-center">
            <Checkbox
              id="tag-sale"
              checked={tags.includes("sale")}
              onCheckedChange={(checked) => handleTagChange("sale", !!checked)}
            />
            <label htmlFor="tag-sale" className="ml-2 text-sm">
              Ofertas
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      {/* Desktop Filters */}
      <aside className="hidden md:block">
        <h2 className="mb-6 font-headline text-xl font-bold">Filtros</h2>
        <FilterControls />
      </aside>

      {/* Products Grid */}
      <main className="md:col-span-3">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {productsToShow.length} productos
          </p>

          {/* Mobile Filters Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden">
                <Filter className="mr-2 h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <FilterControls />
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px]">
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
        {searchWithoutMatches && searchQuery && (
          <div className="mb-4 rounded-md border border-amber-400/60 bg-amber-100/50 px-4 py-3 text-sm text-amber-900">
            No hubo coincidencias para &quot;{searchQuery}&quot;. Mostrando
            todos los productos.
          </div>
        )}
        <ProductGrid products={productsToShow} />
      </main>
    </div>
  );
}
