"use client";

import { useEffect, useRef, useState } from "react";
import type { Product, CatalogProductCard } from "@/lib/types";
import { RecommendationCarousel } from "@/components/storefront/product/recommendation-carousel";
import { ProductCarouselSkeleton } from "@/components/storefront/catalog/product-carousel-skeleton";
import {
  mapRecommendationItems,
  trackRecommendationEvent,
  type RecommendationStrategy,
} from "@/lib/api/recommendations";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/hooks/use-auth";

type RecommendationSectionProps = {
  title: string;
  subtitle?: string;
  items?: CatalogProductCard[];
  products?: Product[];
  estrategia?: RecommendationStrategy;
  seccionId?: string;
  superficie?: "home" | "producto" | "carrito" | "cuenta" | "checkout";
  isLoading?: boolean;
  error?: string | null;
  contained?: boolean;
  className?: string;
};

export function RecommendationSection({
  title,
  subtitle,
  items,
  products,
  estrategia,
  seccionId,
  superficie = "home",
  isLoading,
  error,
  contained = true,
  className,
}: RecommendationSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const impressionSent = useRef(false);
  const { token } = useAuth();
  const [visibleProducts, setVisibleProducts] = useState<Product[]>(products ?? []);

  useEffect(() => {
    if (items?.length) {
      setVisibleProducts(mapRecommendationItems(items));
    } else if (products) {
      setVisibleProducts(products);
    }
  }, [items, products]);

  useEffect(() => {
    if (!sectionRef.current || impressionSent.current || visibleProducts.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || impressionSent.current) {
          return;
        }

        impressionSent.current = true;
        void trackRecommendationEvent({
          tipo: "impresion_recomendacion",
          productoIds: visibleProducts.map((product) => product.id),
          estrategia,
          superficie,
          seccionId,
          token,
        }).catch(() => undefined);
      },
      { threshold: 0.35 },
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [visibleProducts, estrategia, seccionId, superficie, token]);

  if (isLoading) {
    return (
      <section className={className} aria-busy="true" aria-label={title}>
        <div className="mb-4">
          <h2 className="font-headline text-2xl font-semibold uppercase tracking-wide">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <ProductCarouselSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className={className} aria-label={title}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </section>
    );
  }

  if (visibleProducts.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className={className} aria-label={title}>
      <RecommendationCarousel title={title} products={visibleProducts} contained={contained} />
      {subtitle ? <p className="sr-only">{subtitle}</p> : null}
    </section>
  );
}

export function getRecommendationErrorMessage(error: unknown) {
  return getApiErrorMessage(error);
}
