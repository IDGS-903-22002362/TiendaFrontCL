"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import {
  calcularPreciosOfertasPublicas,
  type ProductOfferPricing,
} from "@/lib/ofertas-public";
import type { Product } from "@/lib/types";

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  const [pricingOfertas, setPricingOfertas] = useState<
    Record<string, ProductOfferPricing>
  >({});

  const productIdsKey = useMemo(() => {
    return products.map((product) => product.id).join("|");
  }, [products]);

  useEffect(() => {
    let cancelled = false;

    async function cargarOfertas() {
      if (products.length === 0) {
        setPricingOfertas({});
        return;
      }

      const items = products.map((product) => ({
        productoId: product.id,
        cantidad: 1,
      }));

      const precios = await calcularPreciosOfertasPublicas(items);

      if (!cancelled) {
        setPricingOfertas(precios);
      }
    }

    cargarOfertas();

    return () => {
      cancelled = true;
    };
  }, [products, productIdsKey]);

  if (products.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Prueba con otra combinación de filtros o vuelve al catálogo completo."
        ctaLabel="Volver al catálogo"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          pricingOferta={pricingOfertas[product.id]}
        />
      ))}
    </div>
  );
}