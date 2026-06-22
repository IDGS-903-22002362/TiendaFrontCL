"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Card, Carousel } from "@/components/ui/apple-cards-carousel";
import { formatCurrency } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { trackProductClick } from "@/lib/analytics/product-events";
import {
  filterVisibleHomeRailProducts,
  loadOfertasMasCompradasRailProducts,
  loadOfertasPopularesRailProducts,
  loadOfertasRecientesRailProducts,
} from "@/lib/api/home-sections";

const OFERTAS_TABS = [
  {
    key: "populares",
    label: "Más vistas",
    loadProducts: loadOfertasPopularesRailProducts,
  },
  {
    key: "mas_compradas",
    label: "Más compradas",
    loadProducts: loadOfertasMasCompradasRailProducts,
  },
  {
    key: "recientes",
    label: "Recién agregadas",
    loadProducts: loadOfertasRecientesRailProducts,
  },
] as const;

const EMPTY_TAB_PRODUCTS = Object.fromEntries(
  OFERTAS_TABS.map((tab) => [tab.key, [] as Product[]]),
) as Record<string, Product[]>;

function getDiscountPercent(product: Product): number | null {
  if (!product.salePrice || product.salePrice >= product.price) {
    return null;
  }

  return Math.round((1 - product.salePrice / product.price) * 100);
}

function buildProductBadge(product: Product) {
  const discount = getDiscountPercent(product);

  if (discount) {
    return (
      <span className="inline-flex min-h-8 min-w-[3.25rem] items-center justify-center rounded-full border border-secondary/45 bg-primary px-3.5 text-xs font-semibold tabular-nums tracking-[0.04em] text-secondary shadow-[0_8px_18px_-12px_rgb(13_75_56_/_0.65)]">
        −{discount}%
      </span>
    );
  }

  if (product.tags.includes("sale")) {
    return (
      <span className="inline-flex min-h-8 min-w-[3.25rem] items-center justify-center rounded-full border border-secondary/45 bg-primary px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
        Oferta
      </span>
    );
  }

  return null;
}

function buildProductFooter(product: Product) {
  const finalPrice = product.salePrice ?? product.price;

  return (
    <div className="flex items-baseline gap-2.5">
      <span className="text-[1.15rem] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[1.28rem]">
        {formatCurrency(finalPrice)}
      </span>
      {product.salePrice ? (
        <span className="text-[0.88rem] leading-none text-text-muted line-through md:text-[0.94rem]">
          {formatCurrency(product.price)}
        </span>
      ) : null}
    </div>
  );
}

export function HomeOfertasSection() {
  const [tabProducts, setTabProducts] =
    useState<Record<string, Product[]>>(EMPTY_TAB_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void Promise.all(
      OFERTAS_TABS.map(async (tab) => {
        try {
          const products = filterVisibleHomeRailProducts(await tab.loadProducts());
          return [tab.key, products] as const;
        } catch {
          return [tab.key, []] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      setTabProducts(Object.fromEntries(entries));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTabs = useMemo(
    () =>
      OFERTAS_TABS.filter((tab) => (tabProducts[tab.key]?.length ?? 0) > 0).map((tab) => ({
        key: tab.key,
        label: tab.label,
        products: tabProducts[tab.key] ?? [],
      })),
    [tabProducts],
  );

  const resolveDefaultTab = useCallback((tabs: typeof visibleTabs) => {
    if (tabs.some((tab) => tab.key === "populares")) {
      return "populares";
    }

    return tabs[0]?.key ?? "populares";
  }, []);

  const [activeTab, setActiveTab] = useState("populares");

  useEffect(() => {
    if (visibleTabs.length === 0) {
      return;
    }

    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(resolveDefaultTab(visibleTabs));
    }
  }, [activeTab, resolveDefaultTab, visibleTabs]);

  const activeProducts = useMemo(
    () => visibleTabs.find((tab) => tab.key === activeTab)?.products ?? [],
    [activeTab, visibleTabs],
  );

  const carouselItems = useMemo(
    () =>
      activeProducts.map((product, index) => (
        <Card
          key={product.id}
          index={index}
          variant="sale"
          href={`/products/${product.id}`}
          onClick={() => trackProductClick(product.id, "home")}
          badge={buildProductBadge(product)}
          footer={buildProductFooter(product)}
          imageClassName="p-4 md:p-6"
          card={{
            src: product.images[0] ?? "",
            title: product.name,
            category: product.lineName || product.category || "Oferta",
          }}
        />
      )),
    [activeProducts],
  );

  if (isLoading || visibleTabs.length === 0 || activeProducts.length === 0) {
    return null;
  }

  return (
    <div className="home-section">
      <section className="container">
        <div className="border-t border-black/12 pt-8 md:pt-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="home-kicker text-primary/72">Descuentos activos</p>
              <h2 className="mt-2 font-headline text-[2.15rem] font-semibold uppercase leading-[0.92] tracking-[0.03em] text-foreground md:text-[2.85rem]">
                Ofertas
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Selección con descuento en La Guarida, curada por interés y demanda.
              </p>
            </div>

            <Link
              href="/products?onlyOffers=true"
              className="inline-flex items-center gap-3 self-start border-b border-foreground pb-1 text-[1.05rem] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Ver ofertas
            </Link>
          </div>

          {visibleTabs.length > 1 ? (
            <div className="mt-7 flex items-center justify-between gap-4">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "inline-flex h-12 shrink-0 items-center border border-black/14 bg-white px-4 text-[1.02rem] font-medium text-foreground transition-[background-color,color,border-color] duration-200",
                      activeTab === tab.key
                        ? "border-foreground bg-foreground text-background"
                        : "hover:border-black/28",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "ofertas-apple-carousel relative -mx-4 md:mx-0",
              "[&>div>div:first-child]:py-6 [&>div>div:first-child]:md:py-10",
              "[&>div>div:last-child]:mr-0 [&>div>div:last-child]:pr-4 md:[&>div>div:last-child]:pr-0",
              "[&_button]:h-10 [&_button]:w-10 [&_button]:rounded-none [&_button]:border [&_button]:border-black/14 [&_button]:bg-white [&_button]:shadow-none",
              "[&_button:not(:disabled):hover]:border-black [&_button_svg]:text-foreground",
            )}
          >
            <Carousel key={activeTab} items={carouselItems} />
          </div>
        </div>
      </section>
    </div>
  );
}
