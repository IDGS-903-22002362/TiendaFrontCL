"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import {
  filterVisibleHomeRailProducts,
  shouldShowHomeRail,
} from "@/lib/api/home-sections";
import { ProductRail } from "./product-rail";

type HomeRailSectionProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  showCategoryTabs?: boolean;
  enabled?: boolean;
  loadProducts: () => Promise<Product[]>;
  reloadKey?: string | number | boolean | null;
};

export function HomeRailSection({
  title,
  eyebrow,
  description,
  href,
  hrefLabel,
  showCategoryTabs,
  enabled = true,
  loadProducts,
  reloadKey,
}: HomeRailSectionProps) {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!enabled) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    setProducts(null);

    void loadProducts()
      .then((items) => {
        if (!cancelled) {
          setProducts(filterVisibleHomeRailProducts(items));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadProducts, reloadKey]);

  if (!enabled || products === null || !shouldShowHomeRail(products)) {
    return null;
  }

  return (
    <div className="home-section">
      <ProductRail
        eyebrow={eyebrow}
        title={title}
        description={description}
        products={products}
        href={href}
        hrefLabel={hrefLabel}
        showCategoryTabs={showCategoryTabs}
      />
    </div>
  );
}
