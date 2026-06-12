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
import {
  isCategoryVisible,
  normalizeStorefrontText,
} from "@/lib/storefront";
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
type ProductTag = NonNullable<Product["tags"]>[number];

const OFFER_COLLECTION_LIMIT = 5;
const OFFER_DISCOUNT_PAGE_SIZE = 4;

type OfferCollectionHighlight = {
  key: string;
  label: string;
  imageUrl: string | null;
  type: "category" | "linea";
  value: string;
  count: number;
};

type OfferDiscountHighlight = {
  percent: number;
  count: number;
};

function withoutSaleTag(tags: Product["tags"] | undefined): Product["tags"] {
  return ((tags ?? []) as ProductTag[]).filter(
    (tag): tag is Exclude<ProductTag, "sale"> => tag !== "sale",
  ) as Product["tags"];
}

function isProductSoldOut(product: Product): boolean {
  const stock = product.stockTotal ?? product.stock;

  return typeof stock === "number" && stock <= 0;
}

function getProductImageUrl(product: Product): string | null {
  const productRecord = product as unknown as Record<string, unknown>;

  const imageFields = [
    productRecord.imageUrl,
    productRecord.image,
    productRecord.image_url,
    productRecord.thumbnail,
    productRecord.fotoUrl,
    productRecord.foto,
  ];

  for (const field of imageFields) {
    if (typeof field === "string" && field.trim()) {
      return field;
    }
  }

  const images = Array.isArray(productRecord.images)
    ? productRecord.images
    : Array.isArray(productRecord.imagenes)
      ? productRecord.imagenes
      : [];

  const firstImage = images[0];

  if (typeof firstImage === "string" && firstImage.trim()) {
    return firstImage;
  }

  if (firstImage && typeof firstImage === "object") {
    const imageRecord = firstImage as Record<string, unknown>;

    if (typeof imageRecord.url === "string" && imageRecord.url.trim()) {
      return imageRecord.url;
    }

    if (typeof imageRecord.src === "string" && imageRecord.src.trim()) {
      return imageRecord.src;
    }
  }

  return null;
}

function hasActiveProductOffer(product: Product): boolean {
  const originalPrice = Number(product.price || 0);
  const salePrice = Number(product.salePrice || 0);

  return (
    !isProductSoldOut(product) &&
    originalPrice > 0 &&
    salePrice > 0 &&
    salePrice < originalPrice
  );
}

function getProductDiscountPercent(product: Product): number | null {
  if (!hasActiveProductOffer(product)) {
    return null;
  }

  const originalPrice = Number(product.price || 0);
  const salePrice = Number(product.salePrice || 0);

  if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
    return null;
  }

  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

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

const [productsWithOffers, setProductsWithOffers] = useState<Product[]>(() =>
  initialPage.items.map(mapCatalogProductToProductCardViewModel),
);

const [offerDiscountPage, setOfferDiscountPage] = useState(0);

const [selectedOfferPercent, setSelectedOfferPercent] = useState<number | null>(
  () => {
    const value = Number(searchParams.get("offerPercent"));
    return Number.isFinite(value) && value > 0 ? value : null;
  },
);

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

setProductsWithOffers((current) =>
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

  const productsOnSale = useMemo(
  () => productsWithOffers.filter((product) => hasActiveProductOffer(product)),
  [productsWithOffers],
);

const offerCollections = useMemo<OfferCollectionHighlight[]>(() => {
  if (productsOnSale.length === 0) {
    return [];
  }

  const categoryHighlights = visibleCategories
    .map((categoryItem) => {
      const selectedSlug = normalizeStorefrontText(categoryItem.slug);
      const selectedName = normalizeStorefrontText(categoryItem.name);

      const matchingProducts = productsOnSale.filter((product) => {
        const productCategory = normalizeStorefrontText(product.category);

        return (
          productCategory === selectedSlug || productCategory === selectedName
        );
      });

      if (matchingProducts.length === 0) {
        return null;
      }

      return {
        key: `category-${categoryItem.id}`,
        label: categoryItem.name,
        imageUrl: getProductImageUrl(matchingProducts[0]),
        type: "category" as const,
        value: categoryItem.slug,
        count: matchingProducts.length,
      };
    })
    .filter(Boolean) as OfferCollectionHighlight[];

  const lineaHighlights = visibleLineas
    .map((lineaItem) => {
      const selectedId = normalizeStorefrontText(lineaItem.id);
      const selectedName = normalizeStorefrontText(lineaItem.nombre);

      const matchingProducts = productsOnSale.filter((product) => {
        const productLineId = normalizeStorefrontText(product.lineId ?? "");
        const productLineName = normalizeStorefrontText(product.lineName ?? "");

        return (
          productLineId === selectedId ||
          productLineName === selectedId ||
          productLineId === selectedName ||
          productLineName === selectedName
        );
      });

      if (matchingProducts.length === 0) {
        return null;
      }

      return {
        key: `linea-${lineaItem.id}`,
        label: lineaItem.nombre,
        imageUrl: getProductImageUrl(matchingProducts[0]),
        type: "linea" as const,
        value: lineaItem.id,
        count: matchingProducts.length,
      };
    })
    .filter(Boolean) as OfferCollectionHighlight[];

  return [...lineaHighlights, ...categoryHighlights].slice(
  0,
  OFFER_COLLECTION_LIMIT,
);
}, [productsOnSale, visibleCategories, visibleLineas]);

const offerDiscounts = useMemo<OfferDiscountHighlight[]>(() => {
  const discountMap = new Map<number, number>();

  productsOnSale.forEach((product) => {
    const percent = getProductDiscountPercent(product);

    if (!percent) {
      return;
    }

    discountMap.set(percent, (discountMap.get(percent) ?? 0) + 1);
  });

  return Array.from(discountMap.entries())
    .map(([percent, count]) => ({ percent, count }))
    .sort((a, b) => b.percent - a.percent);
}, [productsOnSale]);

const hasOfferShowcase =
  offerCollections.length > 0 || offerDiscounts.length > 0;

const isOfferView =
  onlyOffers ||
  searchParams.get("tag") === "sale" ||
  searchParams.get("tags")?.split(",").includes("sale");

const shouldShowOfferShowcase = Boolean(isOfferView && hasOfferShowcase);
const totalOfferDiscountPages = Math.max(
  1,
  Math.ceil(offerDiscounts.length / OFFER_DISCOUNT_PAGE_SIZE),
);

const visibleOfferDiscounts = useMemo(() => {
  const start = offerDiscountPage * OFFER_DISCOUNT_PAGE_SIZE;
  const end = start + OFFER_DISCOUNT_PAGE_SIZE;

  return offerDiscounts.slice(start, end);
}, [offerDiscounts, offerDiscountPage]);

const canSlideOfferDiscounts =
  offerDiscounts.length > OFFER_DISCOUNT_PAGE_SIZE;

const handlePrevOfferDiscounts = () => {
  setOfferDiscountPage((currentPage) => Math.max(0, currentPage - 1));
};

const handleNextOfferDiscounts = () => {
  setOfferDiscountPage((currentPage) =>
    Math.min(totalOfferDiscountPages - 1, currentPage + 1),
  );
};

useEffect(() => {
  setOfferDiscountPage((currentPage) =>
    Math.min(currentPage, totalOfferDiscountPages - 1),
  );
}, [totalOfferDiscountPages]);

const handleOfferCollectionClick = (highlight: OfferCollectionHighlight) => {
  if (highlight.type === "category") {
    setCategory(highlight.value);
    setLinea("all");
  } else {
    setLinea(highlight.value);
    setCategory("all");
  }

  setOnlyOffers(true);
  setSelectedOfferPercent(null);
  setOfferDiscountPage(0);
};

const handleOfferDiscountClick = (percent: number) => {
  setSelectedOfferPercent((currentPercent: number | null) =>
    currentPercent === percent ? null : percent,
  );

  setOnlyOffers(true);
};

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
if (selectedOfferPercent) {
  params.set("offerPercent", String(selectedOfferPercent));
}
if (!onlyAvailable) params.set("onlyAvailable", "false");

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
    selectedOfferPercent,
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
selectedOfferPercent ? `${selectedOfferPercent}% descuento` : null,
!onlyAvailable ? "Incluye agotados" : null,
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
setSelectedOfferPercent(null);
setOfferDiscountPage(0);
setOnlyAvailable(true);
setWishlistOnly(false);
  };

const productsBase = wishlistOnly
  ? items.filter((product) => wishlistIds.includes(product.id))
  : items;

const productsToShow = selectedOfferPercent
  ? productsBase.filter(
      (product) => getProductDiscountPercent(product) === selectedOfferPercent,
    )
  : productsBase;

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
  {shouldShowOfferShowcase ? (
    <section className="mb-8 border border-primary/15 bg-background px-5 py-8 shadow-sm md:px-8 md:py-10">
      <div className="text-center">
        <p className="font-headline text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
          Promociones activas
        </p>
        <h2 className="mt-3 font-headline text-3xl font-semibold uppercase tracking-[0.22em] text-primary md:text-4xl">
          Rebajas Club León
        </h2>
      </div>

      {offerCollections.length > 0 ? (
        <div className="mt-9 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {offerCollections.map((highlight) => (
            <button
              key={highlight.key}
              type="button"
              onClick={() => handleOfferCollectionClick(highlight)}
              className="group flex flex-col items-center text-center"
            >
              <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted transition-transform duration-300 group-hover:scale-105 md:h-28 md:w-28">
                {highlight.imageUrl ? (
                  <img
                    src={highlight.imageUrl}
                    alt={highlight.label}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-headline text-2xl font-semibold uppercase text-primary">
                    {highlight.label.slice(0, 1)}
                  </span>
                )}
              </span>

              <span className="mt-4 border-b border-primary font-headline text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                {highlight.label}
              </span>

              <span className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {highlight.count} producto{highlight.count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {offerDiscounts.length > 0 ? (
  <div className="mt-8">
    <div className="flex items-center gap-3">
      {canSlideOfferDiscounts ? (
        <button
          type="button"
          onClick={handlePrevOfferDiscounts}
          disabled={offerDiscountPage === 0}
          className="flex h-12 w-12 shrink-0 items-center justify-center border border-primary text-xl font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Ver descuentos anteriores"
        >
          ‹
        </button>
      ) : null}

      <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
        {visibleOfferDiscounts.map((discount) => (
          <button
            key={discount.percent}
            type="button"
            onClick={() => handleOfferDiscountClick(discount.percent)}
            className={`border px-5 py-3 text-center font-headline text-lg font-semibold uppercase tracking-[0.16em] transition-colors ${
              selectedOfferPercent === discount.percent
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {discount.percent}%
          </button>
        ))}
      </div>

      {canSlideOfferDiscounts ? (
        <button
          type="button"
          onClick={handleNextOfferDiscounts}
          disabled={offerDiscountPage >= totalOfferDiscountPages - 1}
          className="flex h-12 w-12 shrink-0 items-center justify-center border border-primary text-xl font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-30"
          aria-label="Ver más descuentos"
        >
          ›
        </button>
      ) : null}
    </div>

    {canSlideOfferDiscounts ? (
      <p className="mt-3 text-center text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {offerDiscountPage + 1} / {totalOfferDiscountPages}
      </p>
    ) : null}
  </div>
) : null}
    </section>
  ) : null}

  
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
