"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import type { ProductOfferPricing } from "@/lib/ofertas-public";
import { HoverImagePreview } from "@/components/product/hover-image-preview";
import { WishlistButton } from "@/components/storefront/shared/wishlist-button";
import {
  formatCurrency,
  getPrimaryProductBadge,
  getStorefrontBadgeClasses,
  normalizeStorefrontText,
} from "@/lib/storefront";
import type { StorefrontProductBadge } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";
import { trackProductClick } from "@/lib/analytics/product-events";

type ProductCardProps = {
  product: Product;
  pricingOferta?: ProductOfferPricing | null;
  trackingSurface?: "home" | "producto" | "carrito" | "cuenta" | "checkout";
};

function getCatalogBadge(product: Product) {
  const badge = getPrimaryProductBadge(product);

  if (!badge) {
    return null;
  }

  if (badge.label === "Nuevo") {
    return null;
  }

  return badge;
}

function isProductSoldOut(product: Product): boolean {
  const stock = product.stockTotal ?? product.stock;

  return typeof stock === "number" && stock <= 0;
}

export function ProductCard({
  product,
  pricingOferta,
  trackingSurface = "producto",
}: ProductCardProps) {
  const estaAgotado = isProductSoldOut(product);

  const precioOriginalOferta = Number(pricingOferta?.precioOriginal || product.price || 0);
  const precioFinalOferta = Number(pricingOferta?.precioFinal || 0);

  const tieneOfertaBackend =
  !estaAgotado &&
  Boolean(pricingOferta?.ofertaAplicadaId || pricingOferta?.ofertaTitulo) &&
  precioFinalOferta > 0 &&
  precioFinalOferta < precioOriginalOferta;

  const tieneOfertaLocal =
  !estaAgotado &&
  !tieneOfertaBackend &&
  typeof product.salePrice === "number" &&
  product.salePrice > 0 &&
  product.salePrice < product.price;

  const finalPrice = tieneOfertaBackend
    ? precioFinalOferta
    : product.salePrice || product.price;

  const originalPrice = tieneOfertaBackend
    ? precioOriginalOferta
    : tieneOfertaLocal
      ? product.price
      : null;

  const hasOffer = tieneOfertaBackend || tieneOfertaLocal;
  const discountPercent =
    hasOffer && originalPrice && originalPrice > finalPrice
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : 0;

  let displayBadge: StorefrontProductBadge | null = getCatalogBadge(product);

  if (estaAgotado) {
    displayBadge = { label: "Agotado", tone: "warning" };
  } else if (hasOffer) {
    displayBadge = {
      label: discountPercent > 0 ? `-${discountPercent}%` : "Oferta",
      tone: "sale",
    };
  }

  const eyebrow = product.lineName || product.category;

  const imagePosition = normalizeStorefrontText(`${product.category} ${product.name}`).includes(
    "gorra",
  )
    ? "object-[center_18%]"
    : "object-center";

  const handleProductClick = () => {
    trackProductClick(product.id, trackingSurface);
  };

  return (
    <article className="group flex h-full flex-col">
      <div className="relative overflow-hidden border border-black/10">
        <Link href={`/products/${product.id}`} className="block" onClick={handleProductClick}>
          <HoverImagePreview
            images={product.images}
            alt={product.name}
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 34vw, (max-width: 1440px) 25vw, 20vw"
            className={cn(
              "aspect-square transition-opacity duration-300",
              estaAgotado && "opacity-[0.78]",
            )}
            imageClassName={cn("p-5 sm:p-6 lg:p-7", imagePosition)}
            overlay={
              displayBadge ? (
                <span
                  className={cn(
                    "absolute left-3 top-3 z-[1] inline-flex items-center border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-sm",
                    getStorefrontBadgeClasses(displayBadge.tone),
                  )}
                >
                  {displayBadge.label}
                </span>
              ) : null
            }
          />
        </Link>

        <div className="absolute right-3 top-3">
          <WishlistButton
            productId={product.id}
            className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-none border-black/10 bg-white/92 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-black hover:bg-white"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col md:mt-3.5">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <p className="text-[var(--font-size-price-card-mobile)] font-semibold leading-none tracking-[-0.03em] text-foreground lg:text-[var(--font-size-price-card-desktop)]">
            {formatCurrency(finalPrice)}
          </p>

          {originalPrice ? (
            <p className="text-[0.85rem] leading-none text-text-muted line-through md:text-[0.9rem]">
              {formatCurrency(originalPrice)}
            </p>
          ) : null}
        </div>

        <Link href={`/products/${product.id}`} className="mt-2 block" onClick={handleProductClick}>
          <h3 className="line-clamp-2 min-h-[2.5em] text-[var(--font-size-product-name-mobile)] font-medium leading-[var(--line-height-card)] text-foreground transition-colors group-hover:text-primary lg:text-[var(--font-size-product-name-desktop)]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1.5 text-[var(--font-size-category-meta)] uppercase leading-[var(--line-height-body)] tracking-[0.08em] text-text-muted">
          {eyebrow}
        </p>
      </div>
    </article>
  );
}