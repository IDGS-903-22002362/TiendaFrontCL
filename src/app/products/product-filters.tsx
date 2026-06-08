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
import {
  calcularPreciosOfertasPublicas,
  type ProductOfferPricing,
} from "@/lib/ofertas-public";
type ProductFiltersProps = {
  allProducts: Product[];
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
  const [productsWithOffers, setProductsWithOffers] =
  useState<Product[]>(allProducts);

const [isCalculatingOffers, setIsCalculatingOffers] = useState(true);

    const maxCatalogPrice = useMemo(() => {
    const maxPrice = productsWithOffers.reduce((currentMax, product) => {
      const effectivePrice = product.salePrice || product.price;
      return Math.max(currentMax, effectivePrice);
    }, 0);

    return Math.max(100, Math.ceil(maxPrice / 100) * 100);
  }, [productsWithOffers]);

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
const [selectedOfferPercent, setSelectedOfferPercent] = useState<number | null>(
  () => {
    const discountParam = Number(searchParams.get("discount"));

    return Number.isFinite(discountParam) && discountParam > 0
      ? discountParam
      : null;
  },
);

const [offerDiscountPage, setOfferDiscountPage] = useState(0);

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
useEffect(() => {
  let cancelled = false;

  async function loadOfferPrices() {
    setIsCalculatingOffers(true);

    try {
      if (allProducts.length === 0) {
        if (!cancelled) {
          setProductsWithOffers([]);
        }

        return;
      }

      const offerItems = allProducts.map((product) => ({
        productoId: product.id,
        cantidad: 1,
      }));

      const precios: Record<string, ProductOfferPricing> =
        await calcularPreciosOfertasPublicas(offerItems);

      const nextProducts: Product[] = allProducts.map((product) => {
        const pricingOferta = precios[product.id];

        const precioOriginal = Number(
          pricingOferta?.precioOriginal || product.price || 0,
        );

        const precioFinal = Number(pricingOferta?.precioFinal || 0);

        const tieneOferta =
          !isProductSoldOut(product) &&
          Boolean(pricingOferta?.ofertaAplicadaId || pricingOferta?.ofertaTitulo) &&
          precioOriginal > 0 &&
          precioFinal > 0 &&
          precioFinal < precioOriginal;

        const baseTags = withoutSaleTag(product.tags);

        return {
          ...product,
          salePrice: tieneOferta ? precioFinal : undefined,
          tags: tieneOferta
            ? ([...baseTags, "sale"] as Product["tags"])
            : baseTags,
        };
      });

      if (!cancelled) {
        setProductsWithOffers(nextProducts);
      }
    } catch (error) {
      console.error("Error calculando ofertas para catálogo:", error);

      if (!cancelled) {
        const productsWithoutOffers: Product[] = allProducts.map((product) => ({
          ...product,
          salePrice: undefined,
          tags: withoutSaleTag(product.tags),
        }));

        setProductsWithOffers(productsWithoutOffers);
      }
    } finally {
      if (!cancelled) {
        setIsCalculatingOffers(false);
      }
    }
  }

  void loadOfferPrices();

  return () => {
    cancelled = true;
  };
}, [allProducts]);

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

const shouldShowOfferShowcase = tags.includes("sale") && hasOfferShowcase;

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
if (selectedOfferPercent) {
  params.set("discount", selectedOfferPercent.toString());
}
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
    selectedOfferPercent,
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
    let products = [...productsWithOffers];

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
  products = products.filter((product) => {
    const matchesTags = tags.every((tag) =>
      product.tags.includes(tag as "new" | "sale"),
    );

    if (!matchesTags) return false;

    if (tags.includes("sale") && isProductSoldOut(product)) {
      return false;
    }

    return true;
  });
}

if (selectedOfferPercent) {
  products = products.filter(
    (product) => getProductDiscountPercent(product) === selectedOfferPercent,
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
    productsWithOffers,
    category,
    linea,
    priceRange,
    searchQuery,
    selectedOfferPercent,
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
selectedOfferPercent ? `${selectedOfferPercent}% de descuento` : null,
...tags.map((tag) => (tag === "new" ? "Novedades" : "Ofertas")),
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setSort("featured");
    setCategory("all");
    setLinea("all");
    setSelectedSize("all");
    setPriceRange([maxCatalogPrice]);
    setTags([]);
    setSelectedOfferPercent(null);
    setWishlistOnly(false);
  };

 const handleTagChange = (tag: string, checked: boolean) => {
  if (tag === "sale" && !checked) {
    setSelectedOfferPercent(null);
  }

  setTags((currentTags) =>
    checked
      ? [...currentTags, tag]
      : currentTags.filter((item) => item !== tag),
  );
};

const enableSaleTag = () => {
  setTags((currentTags) =>
    currentTags.includes("sale") ? currentTags : [...currentTags, "sale"],
  );
};

const handleOfferCollectionClick = (highlight: OfferCollectionHighlight) => {
  enableSaleTag();
  setSelectedOfferPercent(null);
  setSelectedSize("all");
  setWishlistOnly(false);
  setPriceRange([maxCatalogPrice]);

  if (highlight.type === "category") {
    setCategory(highlight.value);
    setLinea("all");
    return;
  }

  setLinea(highlight.value);
  setCategory("all");
};

const handleOfferDiscountClick = (percent: number) => {
  enableSaleTag();
  setSelectedOfferPercent(percent);
  setCategory("all");
  setLinea("all");
  setSelectedSize("all");
  setWishlistOnly(false);
  setPriceRange([maxCatalogPrice]);
};

  const filterControls = (
    <div className="space-y-7">
      <div>
        <h3 className="mb-4 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
          Categoría
        </h3>
        <div className="space-y-2">
          <label className="flex items-center text-sm text-muted-foreground">
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
        <h3 className="mb-4 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
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
        <h3 className="mb-4 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
          Líneas
        </h3>
        <div className="space-y-2">
          <label className="flex items-center text-sm text-muted-foreground">
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
        <h3 className="mb-4 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
          Tallas
        </h3>
        <div className="space-y-2">
          <label className="flex items-center text-sm text-muted-foreground">
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
        <h3 className="mb-4 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
          Etiquetas
        </h3>
        <div className="space-y-2">
          <label className="flex items-center text-sm text-muted-foreground">
            <Checkbox
              checked={tags.includes("new")}
              onCheckedChange={(checked) =>
                handleTagChange("new", Boolean(checked))
              }
            />
            <span className="ml-2">Novedades</span>
          </label>
          <label className="flex items-center text-sm text-muted-foreground">
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
        <h3 className="mb-4 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
          Favoritos
        </h3>
        <label className="flex items-center text-sm text-muted-foreground">
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-8">
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
  count={isCalculatingOffers ? productsWithOffers.length : productsToShow.length}
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
  {isCalculatingOffers ? (
    <div className="flex min-h-[360px] items-center justify-center border border-primary/10 bg-background px-6 py-16 text-center shadow-sm">
      <div>
        <p className="font-headline text-2xl font-semibold uppercase tracking-[0.18em] text-primary">
          Cargando catálogo
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Estamos actualizando precios, descuentos y promociones disponibles.
        </p>
      </div>
    </div>
  ) : (
    <ProductGrid products={productsToShow} />
  )}
</div>
      </main>
    </div>
  );
}
