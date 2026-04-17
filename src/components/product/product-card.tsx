import Link from "next/link";
import type { Product } from "@/lib/types";
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

export function ProductCard({ product }: ProductCardProps) {
  const badge = getCatalogBadge(product);
  const eyebrow = product.lineName || product.category;
  const finalPrice = product.salePrice || product.price;
  const imagePosition = normalizeStorefrontText(`${product.category} ${product.name}`).includes(
    "gorra",
  )
    ? "object-[center_18%]"
    : "object-center";
  const badgeTone =
    badge?.label === "Agotado"
      ? "border-black bg-black text-white"
      : badge?.label === "Oferta"
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
              badge ? (
                <span
                  className={cn(
                    "absolute left-0 top-0 z-[1] inline-flex min-h-9 items-center border px-3 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    badgeTone,
                  )}
                >
                  {badge.label}
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
        <div className="flex items-baseline gap-2.5">
          <p className="text-[1.45rem] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[1.7rem]">
            {formatCurrency(finalPrice)}
          </p>
          {product.salePrice ? (
            <p className="text-[0.9rem] leading-none text-text-muted line-through md:text-[0.95rem]">
              {formatCurrency(product.price)}
            </p>
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
