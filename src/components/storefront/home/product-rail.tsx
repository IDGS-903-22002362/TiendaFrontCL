"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { normalizeStorefrontText } from "@/lib/storefront";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { ProductCardMinimal } from "./product-card-minimal";

type ProductRailProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
  href?: string;
  hrefLabel?: string;
};

function getTabs(products: Product[]) {
  const tabMap = new Map<string, string>();

  products.forEach((product) => {
    const label = product.category || product.lineName || "Productos";
    const key = normalizeStorefrontText(label);

    if (!tabMap.has(key)) {
      tabMap.set(key, label);
    }
  });

  return Array.from(tabMap, ([key, label]) => ({ key, label })).slice(0, 5);
}

export function ProductRail({
  eyebrow,
  title,
  description,
  products,
  href,
  hrefLabel,
}: ProductRailProps) {
  const tabs = useMemo(() => getTabs(products), [products]);
  const defaultTab = tabs[0]?.key ?? "all";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [activeTab, defaultTab, tabs]);

  const filteredProducts = useMemo(() => {
    if (!activeTab || activeTab === "all") {
      return products;
    }

    return products.filter((product) => {
      const productKey = normalizeStorefrontText(product.category || product.lineName || "Productos");
      return productKey === activeTab;
    });
  }, [activeTab, products]);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="container">
      <div className="border-t border-black/12 pt-8 md:pt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? <p className="home-kicker text-primary/66">{eyebrow}</p> : null}
            <h2 className="mt-2 font-headline text-[2.15rem] font-semibold uppercase leading-[0.92] tracking-[0.03em] text-foreground md:text-[2.85rem]">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {description}
              </p>
            ) : null}
          </div>

          {href && hrefLabel ? (
            <Link
              href={href}
              className="inline-flex items-center gap-3 self-start border-b border-foreground pb-1 text-[1.05rem] font-semibold text-foreground transition-colors hover:text-primary hover:border-primary"
            >
              {hrefLabel}
            </Link>
          ) : null}
        </div>

        {tabs.length > 0 ? (
          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {tabs.map((tab) => (
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

        <div className="relative mt-8 md:mt-9">
          <Carousel
            opts={{ align: "start", loop: filteredProducts.length > 4 }}
            className="w-full"
          >
            <CarouselContent className="py-1">
              {filteredProducts.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="basis-[76%] sm:basis-[48%] lg:basis-[31%] xl:basis-1/4"
                >
                  <ProductCardMinimal product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-auto right-12 top-[36%] hidden translate-y-0 rounded-none border-black/14 bg-white text-foreground shadow-none hover:border-black md:inline-flex" />
            <CarouselNext className="right-0 top-[36%] hidden translate-y-0 rounded-none border-black/14 bg-white text-foreground shadow-none hover:border-black md:inline-flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
