"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import { ProductGridSkeleton } from "@/components/storefront/catalog/product-grid-skeleton";
import type { ActiveFilterChip } from "@/components/storefront/catalog/active-filter-chips";
import { useStorefront } from "@/hooks/use-storefront";
import {
  isCategoryVisible,
  normalizeStorefrontText,
} from "@/lib/storefront";
import {
  DESTACADOS_CATALOG_FETCH_LIMIT,
  fetchCatalogPage,
  getCatalogQueryForSort,
  getOfertasSortLabel,
  getProductEffectiveCatalogPrice,
  isAggregateCatalogSort,
  isOfertasCatalogSort,
  mapCatalogProductToProductCardViewModel,
  mapCatalogSortForOffersView,
  resolveCatalogOnlyAvailable,
} from "@/lib/api/storefront";
import {
  applyCatalogOfferPricingToProducts,
  catalogItemsNeedOfferPricingFallback,
  enrichCatalogProductsWithOfferPricing,
  getOfferDiscountPercent,
  hasActiveOfferFromPricing,
  type ProductOfferPricing,
} from "@/lib/ofertas-public";
import { useAuth } from "@/hooks/use-auth";
import {
  getFavorites,
  mapFavoriteProductToProductCard,
} from "@/lib/api/favorites";

type ProductFiltersProps = {
  initialPage: CatalogResponse;
  initialProducts?: Product[];
  initialOfferPricing?: Record<string, ProductOfferPricing>;
  categories: Category[];
  lineas: Linea[];
  tallas: Talla[];
};
type ProductTag = NonNullable<Product["tags"]>[number];

const OFFER_DISCOUNT_PAGE_SIZE = 5;


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

function productHasActiveOffer(
  product: Product,
  pricing?: ProductOfferPricing,
): boolean {
  return (
    hasActiveOfferFromPricing(product, pricing) || hasActiveProductOffer(product)
  );
}

function resolveProductDiscountPercent(
  product: Product,
  pricing?: ProductOfferPricing,
): number | null {
  return getOfferDiscountPercent(product, pricing);
}

const DEFAULT_MAX_PRICE = 5000;
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

function isLegacySaleRoute(searchParams: URLSearchParams): boolean {
  const tag = searchParams.get("tag");
  const tags = searchParams.get("tags")?.split(",") ?? [];

  return (
    searchParams.get("onlyOffers") === "true" ||
    tag === "sale" ||
    tags.includes("sale")
  );
}

function resolveInitialOnlyOffers(searchParams: URLSearchParams): boolean {
  if (isLegacySaleRoute(searchParams)) {
    return true;
  }

  if (isOfertasCatalogSort(resolveInitialCatalogSort(searchParams))) {
    return true;
  }

  const discountParam =
    searchParams.get("offerPercent")?.trim() ||
    searchParams.get("discount")?.trim();

  if (discountParam) {
    const parsed = Number(discountParam);
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
}

function buildCatalogSearchParams(input: {
  category: string;
  linea: string;
  selectedSize: string;
  priceRange: [number];
  sort: CatalogSort;
  searchQuery: string;
  selectedOfferPercent: number | null;
  onlyAvailable: boolean;
  onlyOffers: boolean;
  wishlistOnly: boolean;
}) {
  const params = new URLSearchParams();

  if (input.category !== "all") params.set("category", input.category);
  if (input.linea !== "all") params.set("line", input.linea);
  if (input.selectedSize !== "all") params.set("talla", input.selectedSize);

  if (input.priceRange[0] < DEFAULT_MAX_PRICE) {
    params.set("maxPrice", String(input.priceRange[0]));
  }

  if (input.sort !== "destacados") params.set("sort", input.sort);
  if (input.searchQuery) params.set("q", input.searchQuery);

  if (input.selectedOfferPercent) {
    params.set("offerPercent", String(input.selectedOfferPercent));
  }

  if (input.onlyAvailable) params.set("onlyAvailable", "true");
  if (input.onlyOffers) params.set("onlyOffers", "true");
  if (input.wishlistOnly) params.set("wishlist", "1");

  return params;
}

function normalizeCatalogQueryString(query: string) {
  const params = new URLSearchParams(query);
  const offerPercent =
    params.get("offerPercent")?.trim() || params.get("discount")?.trim();

  params.delete("discount");

  if (offerPercent) {
    params.set("offerPercent", offerPercent);
  } else {
    params.delete("offerPercent");
  }

  return params.toString();
}

function getDefaultCatalogSort(): CatalogSort {
  return "recientes";
}

function resolveInitialCatalogSort(searchParams: URLSearchParams): CatalogSort {
  const sortParam = searchParams.get("sort");

  if (sortParam && CATALOG_SORTS.includes(sortParam as CatalogSort)) {
    return sortParam as CatalogSort;
  }

  return getDefaultCatalogSort();
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

function resolveCategoryFilterValue(value: string, categories: Category[]) {
  if (!value || value === "all") {
    return "all";
  }

  const normalizedValue = normalizeStorefrontText(value);

  const matchedCategory = categories.find((category) => {
    return [
      category.id,
      category.slug,
      category.name,
    ].some((item) => normalizeStorefrontText(item) === normalizedValue);
  });

  return matchedCategory?.id ?? value;
}

function resolveLineFilterValue(value: string, lineas: Linea[]) {
  if (!value || value === "all") {
    return "all";
  }

  const normalizedValue = normalizeStorefrontText(value);

  const matchedLine = lineas.find((linea) => {
    const lineaRecord = linea as unknown as Record<string, unknown>;

    return [
      linea.id,
      linea.nombre,
      typeof lineaRecord.slug === "string" ? lineaRecord.slug : "",
    ].some((item) => normalizeStorefrontText(item) === normalizedValue);
  });

  return matchedLine?.id ?? value;
}

function resolveTallaFilterValue(value: string, tallas: Talla[]) {
  if (!value || value === "all") {
    return "all";
  }

  const normalizedValue = normalizeStorefrontText(value);

  const matchedTalla = tallas.find((talla) => {
    return [
      talla.id,
      talla.codigo,
      talla.descripcion,
    ].some((item) => normalizeStorefrontText(item) === normalizedValue);
  });

  return matchedTalla?.codigo ?? value;
}

export function ProductFilters({
  initialPage,
  initialProducts: initialProductsProp,
  initialOfferPricing = {},
  categories,
  lineas,
  tallas,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wishlistIds } = useStorefront();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const initialProducts = useMemo(() => {
    if (initialProductsProp?.length) {
      return initialProductsProp;
    }

    const mapped = initialPage.items.map(mapCatalogProductToProductCardViewModel);

    if (Object.keys(initialOfferPricing).length === 0) {
      return mapped;
    }

    return applyCatalogOfferPricingToProducts(mapped, initialOfferPricing);
  }, [initialOfferPricing, initialPage.items, initialProductsProp]);

  const [offerPricing, setOfferPricing] =
    useState<Record<string, ProductOfferPricing>>(initialOfferPricing);

  const [productsWithOffers, setProductsWithOffers] = useState<Product[]>(() =>
    initialProducts.filter((product) =>
      productHasActiveOffer(product, initialOfferPricing[product.id]),
    ),
  );

  const [offerDiscountPage, setOfferDiscountPage] = useState(0);

  const [selectedOfferPercent, setSelectedOfferPercent] = useState<number | null>(
    () => {
      const value = Number(
        searchParams.get("offerPercent") ?? searchParams.get("discount"),
      );

      return Number.isFinite(value) && value > 0 ? value : null;
    },
  );

  const [items, setItems] = useState<Product[]>(() => initialProducts);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialPage.nextCursor,
  );
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<CatalogSort>(() =>
    resolveInitialCatalogSort(searchParams),
  );
  const [category, setCategory] = useState(() =>
    resolveCategoryFilterValue(
      getUrlParam(searchParams, "category", "all"),
      categories,
    ),
  );

  const [linea, setLinea] = useState(() =>
    resolveLineFilterValue(
      getUrlParam(searchParams, "line", getUrlParam(searchParams, "linea", "all")),
      lineas,
    ),
  );

  const [selectedSize, setSelectedSize] = useState(() =>
    resolveTallaFilterValue(
      getUrlParam(searchParams, "talla", getUrlParam(searchParams, "size", "all")),
      tallas,
    ),
  );
  const [priceRange, setPriceRange] = useState<[number]>(() => [
    getUrlNumber(searchParams, "maxPrice", DEFAULT_MAX_PRICE),
  ]);
  const [searchQuery, setSearchQuery] = useState(() =>
    getUrlParam(searchParams, "q"),
  );
  const [onlyAvailable, setOnlyAvailable] = useState(() =>
    resolveCatalogOnlyAvailable(searchParams.get("onlyAvailable")),
  );
  const [onlyOffers, setOnlyOffers] = useState(() =>
    resolveInitialOnlyOffers(searchParams),
  );
  const [wishlistOnly, setWishlistOnly] = useState(
    () => searchParams.get("wishlist") === "1",
  );
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [favoritesReloadKey, setFavoritesReloadKey] = useState(0);

  const initialRender = useRef(true);

  const isOfferView = onlyOffers || isOfertasCatalogSort(sort);

  const visibleCategories = useMemo(
    () => categories.filter(isCategoryVisible),
    [categories],
  );
  const visibleLineas = useMemo(() => lineas, [lineas]);
  const visibleSizes = useMemo(() => tallas, [tallas]);

  const catalogQuery = useCallback(
    (cursor?: string | null): CatalogQuery => {
      const offerViewSort = isOfferView
        ? mapCatalogSortForOffersView(sort)
        : sort;
      const shouldSendPriceSort =
        !isOfferView &&
        priceRange[0] < DEFAULT_MAX_PRICE &&
        sort !== "precio_asc" &&
        sort !== "precio_desc";
      const pageLimit = DESTACADOS_CATALOG_FETCH_LIMIT;
      const aggregateBase =
        isAggregateCatalogSort(offerViewSort) && !shouldSendPriceSort
          ? getCatalogQueryForSort(offerViewSort, pageLimit, { onlyOffers })
          : {
              limit: pageLimit,
              onlyAvailable,
              onlyOffers,
              sort: offerViewSort,
            };
      const apiMaxPrice =
        !isOfferView && priceRange[0] < DEFAULT_MAX_PRICE
          ? priceRange[0]
          : undefined;

      return {
        ...aggregateBase,
        cursor: cursor || undefined,
        category: category !== "all" ? category : undefined,
        line: linea !== "all" ? linea : undefined,
        talla: selectedSize !== "all" ? selectedSize : undefined,
        maxPrice: apiMaxPrice,
        sort: shouldSendPriceSort ? "precio_asc" : offerViewSort,
        q: searchQuery || undefined,
        onlyAvailable,
        onlyOffers,
      };
    },
    [
      category,
      isOfferView,
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
        const mappedProducts = response.items.map(
          mapCatalogProductToProductCardViewModel,
        );
        const { products: newProducts, pricing } =
          await enrichCatalogProductsWithOfferPricing(
            mappedProducts,
            response.items,
          );

        setOfferPricing((current) =>
          cursor ? { ...current, ...pricing } : pricing,
        );

        setItems((current) =>
          cursor ? [...current, ...newProducts] : newProducts,
        );

        const newProductsWithActiveOffers = newProducts.filter((product) =>
          productHasActiveOffer(product, pricing[product.id]),
        );

        setProductsWithOffers((current) => {
          if (cursor) {
            return newProductsWithActiveOffers.length > 0
              ? [...current, ...newProductsWithActiveOffers]
              : current;
          }

          return newProductsWithActiveOffers;
        });

        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (loadError) {
        console.error("Failed to load catalog page", loadError);
        if (!cursor) {
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
    () =>
      productsWithOffers.filter((product) =>
        productHasActiveOffer(product, offerPricing[product.id]),
      ),
    [offerPricing, productsWithOffers],
  );

  const offerDiscounts = useMemo<OfferDiscountHighlight[]>(() => {
    const discountMap = new Map<number, number>();

    productsOnSale.forEach((product) => {
      const percent = resolveProductDiscountPercent(
        product,
        offerPricing[product.id],
      );

      if (!percent) {
        return;
      }

      discountMap.set(percent, (discountMap.get(percent) ?? 0) + 1);
    });

    return Array.from(discountMap.entries())
      .map(([percent, count]) => ({ percent, count }))
      .sort((a, b) => b.percent - a.percent);
  }, [offerPricing, productsOnSale]);

  const hasOfferShowcase = offerDiscounts.length > 0;

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


  const handleOfferDiscountClick = (percent: number) => {
    const nextPercent = selectedOfferPercent === percent ? null : percent;

    setSelectedOfferPercent(nextPercent);

    // Percent filter is client-side only; avoid refetch when already in offers view.
    if (nextPercent !== null && !isOfferView) {
      if (!onlyOffers) {
        setOnlyOffers(true);
      }

      if (!isOfertasCatalogSort(sort)) {
        setSort("ofertas_populares");
      }
    }
  };

  useEffect(() => {
    if (!wishlistOnly) {
      setFavoriteProducts([]);
      setFavoritesError(null);
      setFavoritesLoading(false);
      return;
    }

    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setFavoriteProducts(
        items.filter((product) => wishlistIds.includes(product.id)),
      );
      setFavoritesError(null);
      setFavoritesLoading(false);
      return;
    }

    let cancelled = false;
    setFavoritesLoading(true);
    setFavoritesError(null);

    void getFavorites()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setFavoriteProducts(
          response.data
            .map((favorite) => favorite.producto)
            .filter(Boolean)
            .map(mapFavoriteProductToProductCard),
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setFavoriteProducts([]);
        setFavoritesError("No se pudieron cargar tus favoritos. Intenta de nuevo.");
      })
      .finally(() => {
        if (!cancelled) {
          setFavoritesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [wishlistOnly, isAuthenticated, isAuthLoading, items, wishlistIds, favoritesReloadKey]);

  useEffect(() => {
    const params = buildCatalogSearchParams({
      category,
      linea,
      selectedSize,
      priceRange,
      sort,
      searchQuery,
      selectedOfferPercent,
      onlyAvailable,
      onlyOffers,
      wishlistOnly,
    });

    const nextQuery = params.toString();
    const currentQuery = normalizeCatalogQueryString(searchParams.toString());

    if (nextQuery !== currentQuery) {
      const nextUrl = nextQuery ? `/products?${nextQuery}` : "/products";
      router.replace(nextUrl, { scroll: false });
    }
  }, [
    category,
    linea,
    onlyAvailable,
    onlyOffers,
    priceRange,
    router,
    searchParams,
    searchQuery,
    selectedOfferPercent,
    selectedSize,
    sort,
    wishlistOnly,
  ]);

  useEffect(() => {
    if (wishlistOnly) {
      return;
    }

    if (
      !catalogItemsNeedOfferPricingFallback(
        initialProducts,
        initialPage.items,
        initialOfferPricing,
      )
    ) {
      return;
    }

    let cancelled = false;

    void enrichCatalogProductsWithOfferPricing(
      initialProducts,
      initialPage.items,
    )
      .then(({ products, pricing }) => {
        if (cancelled) {
          return;
        }

        setOfferPricing((current) => ({ ...current, ...pricing }));
        setItems(products);

        const withOffers = products.filter((product) =>
          productHasActiveOffer(product, pricing[product.id]),
        );

        setProductsWithOffers(withOffers);
      })
      .catch((error) => {
        console.error("Error enriqueciendo ofertas del catálogo", error);
      });

    return () => {
      cancelled = true;
    };
  }, [initialOfferPricing, initialPage.items, initialProducts, wishlistOnly]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    if (!wishlistOnly) {
      void loadPage(null);
    }
  }, [
    category,
    linea,
    loadPage,
    onlyAvailable,
    onlyOffers,
    priceRange,
    searchQuery,
    selectedSize,
    sort,
    wishlistOnly,
  ]);

  const activeFilters: ActiveFilterChip[] = [];

  if (category !== "all") {
    activeFilters.push({
      id: "category",
      label:
        visibleCategories.find((item) => item.id === category)?.name ?? category,
      onRemove: () => setCategory("all"),
    });
  }

  if (linea !== "all") {
    activeFilters.push({
      id: "linea",
      label: visibleLineas.find((item) => item.id === linea)?.nombre ?? linea,
      onRemove: () => setLinea("all"),
    });
  }

  if (selectedSize !== "all") {
    activeFilters.push({
      id: "talla",
      label: `Talla ${selectedSize}`,
      onRemove: () => setSelectedSize("all"),
    });
  }

  if (priceRange[0] < DEFAULT_MAX_PRICE) {
    activeFilters.push({
      id: "precio",
      label: `Hasta $${priceRange[0].toLocaleString("es-MX")}`,
      onRemove: () => setPriceRange([DEFAULT_MAX_PRICE]),
    });
  }

  if (selectedOfferPercent) {
    activeFilters.push({
      id: "offerPercent",
      label: `${selectedOfferPercent}% descuento`,
      onRemove: () => setSelectedOfferPercent(null),
    });
  }

  if (onlyAvailable) {
    activeFilters.push({
      id: "soloDisponibles",
      label: "Solo disponibles",
      onRemove: () => setOnlyAvailable(false),
    });
  }

  if (onlyOffers) {
    activeFilters.push({
      id: "soloOfertas",
      label: "Solo ofertas",
      onRemove: () => setOnlyOffers(false),
    });
  }

  if (wishlistOnly) {
    activeFilters.push({
      id: "favoritos",
      label: "Favoritos",
      onRemove: () => setWishlistOnly(false),
    });
  }

  const clearFilters = () => {
    setSort("recientes");
    setCategory("all");
    setLinea("all");
    setSelectedSize("all");
    setPriceRange([DEFAULT_MAX_PRICE]);
    setSearchQuery("");
    setSelectedOfferPercent(null);
    setOfferDiscountPage(0);
    setOnlyAvailable(false);
    setOnlyOffers(false);
    setWishlistOnly(false);
  };

  const productsBase = wishlistOnly ? favoriteProducts : items;

  const productsToShow = useMemo(() => {
    const filteredByDiscount = selectedOfferPercent
      ? productsBase.filter((product) => {
          return (
            resolveProductDiscountPercent(
              product,
              offerPricing[product.id],
            ) === selectedOfferPercent
          );
        })
      : productsBase;

    const trustBackendOfferFilter =
      onlyOffers || isOfertasCatalogSort(sort);

    let result =
      !isOfferView ||
      wishlistOnly ||
      selectedOfferPercent ||
      trustBackendOfferFilter
        ? filteredByDiscount
        : filteredByDiscount.filter(hasActiveProductOffer);

    if (isOfferView && priceRange[0] < DEFAULT_MAX_PRICE) {
      result = result.filter(
        (product) =>
          getProductEffectiveCatalogPrice(product) <= priceRange[0],
      );
    }

    if (isOfferView && (sort === "precio_asc" || sort === "precio_desc")) {
      result = [...result].sort((left, right) => {
        const leftPrice = getProductEffectiveCatalogPrice(left);
        const rightPrice = getProductEffectiveCatalogPrice(right);

        return sort === "precio_asc"
          ? leftPrice - rightPrice
          : rightPrice - leftPrice;
      });
    }

    return result;
  }, [
    isOfferView,
    offerPricing,
    onlyOffers,
    priceRange,
    productsBase,
    selectedOfferPercent,
    sort,
    wishlistOnly,
  ]);

  const filterControls = (
    <div className="divide-y divide-black/8 [&>div]:py-6 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
      <div>
        <h3 className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-foreground">
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
        <h3 className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-foreground">
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
        <h3 className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-foreground">
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
        <h3 className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-foreground">
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
        <h3 className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-foreground">
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
        <h3 className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.18em] text-foreground">
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
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/72">
            Filtros
          </p>
          {activeFilters.length > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="mt-5">{filterControls}</div>
      </FilterSidebar>

      <main>
        <ProductToolbar
          count={productsToShow.length}
          searchLabel={
            searchQuery
              ? `Resultados para "${searchQuery}"`
              : onlyOffers
                ? "Ofertas"
                : isOfertasCatalogSort(sort)
                  ? getOfertasSortLabel(sort)
                  : undefined
          }
          activeFilters={activeFilters}
          onClear={clearFilters}
          sort={sort}
          onSortChange={(value) => setSort(value as CatalogSort)}
          mobileFilters={
            <FilterDrawer activeCount={activeFilters.length}>
              {filterControls}
            </FilterDrawer>
          }
        />

        {shouldShowOfferShowcase ? (
          <section className="mt-6 mb-8 border border-black/10 bg-white px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto max-w-6xl text-center">
              <p className="font-headline text-[10px] font-semibold uppercase tracking-[0.34em] text-primary/70">
                Promociones activas
              </p>

              <h2 className="mt-2 font-headline text-2xl font-semibold uppercase tracking-[0.24em] text-primary md:text-3xl">
                OFERTAS
              </h2>

              {offerDiscounts.length > 0 ? (
                <div className="mx-auto mt-8 max-w-6xl">
                  <div className="flex items-center justify-center gap-3 md:gap-5">
                    {canSlideOfferDiscounts ? (
                      <button
                        type="button"
                        onClick={handlePrevOfferDiscounts}
                        disabled={offerDiscountPage === 0}
                        className="offer-discount-circle flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary text-2xl font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-30"
                        aria-label="Ver descuentos anteriores"
                      >
                        ‹
                      </button>
                    ) : null}

                    <div className="grid flex-1 grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-5">
                      {visibleOfferDiscounts.map((discount) => (
                        <button
                          key={discount.percent}
                          type="button"
                          onClick={() => handleOfferDiscountClick(discount.percent)}
                          className="group flex flex-col items-center justify-center text-center !border-0 !bg-transparent p-0 !shadow-none outline-none appearance-none"  >
                          <span
                            className={`offer-discount-circle flex h-28 w-28 min-h-[7rem] min-w-[7rem] max-h-[7rem] max-w-[7rem] shrink-0 items-center justify-center overflow-hidden rounded-full border text-center font-headline text-2xl font-semibold uppercase tracking-[0.08em] transition-all md:h-36 md:w-36 md:min-h-[9rem] md:min-w-[9rem] md:max-h-[9rem] md:max-w-[9rem] md:text-3xl ${selectedOfferPercent === discount.percent
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary/20 bg-neutral-50 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
                              }`}
                          >
                            {discount.percent}%
                          </span>

                          <span className="mt-3 font-headline text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                            Descuento
                          </span>
                        </button>
                      ))}
                    </div>

                    {canSlideOfferDiscounts ? (
                      <button
                        type="button"
                        onClick={handleNextOfferDiscounts}
                        disabled={offerDiscountPage >= totalOfferDiscountPages - 1}
                        className="offer-discount-circle flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary text-2xl font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-30"
                        aria-label="Ver más descuentos"
                      >
                        ›
                      </button>
                    ) : null}
                  </div>

                  {canSlideOfferDiscounts ? (
                    <p className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {offerDiscountPage + 1} / {totalOfferDiscountPages}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {favoritesError ? (
          <div className="mt-6 border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p>{favoritesError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-[44px]"
              onClick={() => {
                setFavoritesError(null);
                setFavoritesReloadKey((current) => current + 1);
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

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

        {wishlistOnly && !isAuthLoading && !isAuthenticated && wishlistIds.length === 0 ? (
          <div className="mt-6 border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <p>Inicia sesión para guardar y ver tus productos favoritos.</p>
            <Button asChild className="mt-4 min-h-[44px]">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        ) : null}

        {(wishlistOnly ? favoritesLoading : loading) ? (
          <div className="mt-6" role="status" aria-live="polite">
            <span className="sr-only">Cargando catálogo…</span>
            <ProductGridSkeleton />
          </div>
        ) : (
          <div className="mt-6">
            <ProductGrid products={productsToShow} offerPricing={offerPricing} />

            {wishlistOnly &&
            !favoritesLoading &&
            !favoritesError &&
            productsToShow.length === 0 ? (
              <div className="mt-8 border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                <p>
                  {isAuthenticated
                    ? "Aún no tienes productos en favoritos."
                    : "No encontramos favoritos en el catálogo cargado. Inicia sesión para ver tu lista completa."}
                </p>
              </div>
            ) : null}

            {hasMore && !error && !wishlistOnly ? (
              <div className="mt-10 flex flex-col items-center gap-3 border-t border-black/8 pt-8">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  aria-live="polite"
                >
                  Mostrando {productsToShow.length}
                  {productsToShow.length === 1 ? " producto" : " productos"}
                </p>
                <Button
                  onClick={() => void loadPage(nextCursor)}
                  disabled={loadingMore}
                  variant="outline"
                  className="min-h-[44px] min-w-[220px]"
                >
                  {loadingMore ? "Cargando…" : "Cargar más"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
