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
            imageClassName={cn("p-3 md:p-4", imagePosition)}
            overlay={
              displayBadge ? (
                <span
                  className={cn(
                    "absolute left-0 top-0 z-[1] inline-flex min-h-9 items-center border px-3 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    badgeTone,
                  )}
                >
                  {displayBadge.label}
                </span>
              ) : null
            }
          />
        </Link>

        <div className="absolute right-3 top-3 md:right-4 md:top-4">
          <WishlistButton
            productId={product.id}
            className="h-10 w-10 rounded-none border-black/12 bg-white text-foreground shadow-none hover:border-black hover:bg-white md:h-11 md:w-11"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col md:mt-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2.5">
            {originalPrice ? (
              <p className="text-[0.9rem] leading-none text-text-muted line-through md:text-[0.95rem]">
                {formatCurrency(originalPrice)}
              </p>
            ) : null}

            <p
              className={cn(
                "text-[1.45rem] font-semibold leading-none tracking-[-0.03em] md:text-[1.7rem]",
                tieneOfertaBackend || tieneOfertaLocal
                  ? "text-primary"
                  : "text-foreground",
              )}
            >
              {formatCurrency(finalPrice)}
            </p>
          </div>

          {tieneOfertaBackend ? (
            <span className="w-fit border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              {offerLabel}
            </span>
          ) : null}
        </div>

        <Link href={`/products/${product.id}`} className="mt-3 block">
          <h3 className="line-clamp-2 text-[1rem] font-medium leading-[1.28] text-foreground md:text-[1.08rem]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-3 text-[0.95rem] leading-5 text-text-muted">{eyebrow}</p>
      </div>
    </article>
  );
}