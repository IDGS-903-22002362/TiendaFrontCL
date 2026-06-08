import Link from "next/link";
import type { Product } from "@/lib/types";
import type { ProductOfferPricing } from "@/lib/ofertas-public";
import { HoverImagePreview } from "@/components/product/hover-image-preview";
import { WishlistButton } from "@/components/storefront/shared/wishlist-button";
import {
  formatCurrency,
  getPrimaryProductBadge,
  normalizeStorefrontText,
} from "@/lib/storefront";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: Product;
  pricingOferta?: ProductOfferPricing | null;
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

export function ProductCard({ product, pricingOferta }: ProductCardProps) {
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

  const offerLabel = pricingOferta?.ofertaTitulo || "Oferta";

  const badge = getCatalogBadge(product);
  const displayBadge = badge || (tieneOfertaBackend ? { label: "Oferta" } : null);

  const eyebrow = product.lineName || product.category;

  const imagePosition = normalizeStorefrontText(`${product.category} ${product.name}`).includes(
    "gorra",
  )
    ? "object-[center_18%]"
    : "object-center";

  const badgeTone =
    displayBadge?.label === "Agotado"
      ? "border-black bg-black text-white"
      : displayBadge?.label === "Oferta"
        ? "border-black bg-white text-black"
        : "border-black bg-black text-white";

  return (
    <article className="group flex h-full flex-col">
      <div className="relative">
        <Link href={`/products/${product.id}`} className="block">
          <HoverImagePreview
            images={product.images}
            alt={product.name}
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 34vw, (max-width: 1440px) 25vw, 20vw"
            className="aspect-square border border-black/12"
            imageClassName={cn("p-[12px] md:p-[16px] lg:p-[24px]", imagePosition)}
            overlay={
              displayBadge ? (
                <span
                  className={cn(
                    "absolute left-0 top-0 z-[1] inline-flex min-h-[36px] items-center border px-3 text-[var(--font-size-eyebrow)] font-semibold uppercase tracking-[0.18em]",
                    badgeTone,
                  )}
                >
                  {displayBadge.label}
                </span>
              ) : null
            }
          />
        </Link>

        <div className="absolute right-[10px] top-[10px] md:right-[12px] md:top-[12px] lg:right-[16px] lg:top-[16px]">
          <WishlistButton
            productId={product.id}
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-none border-black/12 bg-white text-foreground shadow-none hover:border-black hover:bg-white"
          />
        </div>
      </div>

      <div className="mt-[10px] md:mt-[12px] lg:mt-[16px] flex flex-1 flex-col">
        <div className="flex items-baseline gap-2.5">
          <p className="text-[var(--font-size-price-card-mobile)] font-semibold leading-none tracking-[-0.03em] text-foreground lg:text-[var(--font-size-price-card-desktop)]">
            {formatCurrency(finalPrice)}
          </p>
          {product.salePrice ? (
            <p className="text-[0.9rem] leading-none text-text-muted line-through md:text-[0.95rem]">
              {formatCurrency(product.price)}
            </p>
          </div>

          {tieneOfertaBackend ? (
            <span className="w-fit border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              {offerLabel}
            </span>
          ) : null}
        </div>

        <Link href={`/products/${product.id}`} className="mt-3 block">
          <h3 className="line-clamp-2 text-[var(--font-size-product-name-mobile)] font-medium leading-[var(--line-height-card)] text-foreground lg:text-[var(--font-size-product-name-desktop)]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-3 text-[var(--font-size-category-meta)] leading-[var(--line-height-body)] text-text-muted">{eyebrow}</p>
      </div>
    </article>
  );
}