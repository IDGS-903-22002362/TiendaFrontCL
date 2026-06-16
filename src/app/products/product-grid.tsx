"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

function productHasActiveOffer(
  product: Product,
  pricingOferta?: ProductOfferPricing
) {
  if (!pricingOferta) {
    return false;
  }

  const precioOriginal = Number(pricingOferta.precioOriginal || product.price || 0);
  const precioFinal = Number(pricingOferta.precioFinal || 0);

  return (
    Boolean(pricingOferta.ofertaAplicadaId || pricingOferta.ofertaTitulo) &&
    precioFinal > 0 &&
    precioFinal < precioOriginal
  );
}

function getOfferDiscountPercent(
  product: Product,
  pricingOferta?: ProductOfferPricing,
) {
  if (!pricingOferta) {
    return 0;
  }

  const precioOriginal = Number(
    pricingOferta.precioOriginal || product.price || 0,
  );

  const precioFinal = Number(pricingOferta.precioFinal || 0);

  if (!precioOriginal || !precioFinal || precioFinal >= precioOriginal) {
    return 0;
  }

  return Math.round(((precioOriginal - precioFinal) / precioOriginal) * 100);
}

export function ProductGrid({ products }: ProductGridProps) {
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag");

const mostrarSoloOfertas =
  tag === "sale" || searchParams.get("onlyOffers") === "true";

const discountParam = Number(searchParams.get("discount") || 0);

const selectedDiscount = Number.isFinite(discountParam)
  ? discountParam
  : 0;
  const [pricingOfertas, setPricingOfertas] = useState<
    Record<string, ProductOfferPricing>
  >({});
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  const productIdsKey = useMemo(() => {
    return products.map((product) => product.id).join("|");
  }, [products]);

  useEffect(() => {
    let cancelled = false;

    async function cargarOfertas() {
      if (products.length === 0) {
        setPricingOfertas({});
        setIsLoadingOffers(false);
        return;
      }

      try {
        setIsLoadingOffers(true);

        const items = products.map((product) => ({
          productoId: product.id,
          cantidad: 1,
        }));

        const precios = await calcularPreciosOfertasPublicas(items);

        if (!cancelled) {
          setPricingOfertas(precios);
        }
      } catch (error) {
        console.error("Error cargando precios de ofertas:", error);

        if (!cancelled) {
          setPricingOfertas({});
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOffers(false);
        }
      }
    }

    cargarOfertas();

    return () => {
      cancelled = true;
    };
  }, [products, productIdsKey]);

  const productsToRender = useMemo(() => {
    if (!mostrarSoloOfertas) {
      return products;
    }

    return products.filter((product) =>
      productHasActiveOffer(product, pricingOfertas[product.id])
    );
  }, [products, pricingOfertas, mostrarSoloOfertas]);

  if (products.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Prueba con otra combinación de filtros o vuelve al catálogo completo."
        ctaLabel="Volver al catálogo"
      />
    );
  }

  if (mostrarSoloOfertas && isLoadingOffers) {
    return (
      <div className="border border-black/14 bg-white p-6 text-sm text-muted-foreground">
        Cargando ofertas disponibles...
      </div>
    );
  }

  if (productsToRender.length === 0) {
    return (
      <EmptyState
        title="Sin ofertas disponibles"
        description="Por ahora no hay productos con descuentos activos."
        ctaLabel="Volver al catálogo"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 xl:grid-cols-4 xl:gap-x-6 xl:gap-y-10">
      {productsToRender.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          pricingOferta={pricingOfertas[product.id]}
        />
      ))}
    </div>
  );
}