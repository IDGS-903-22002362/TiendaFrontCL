import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceTag } from "./price-tag";
import {
  getEditorialProductCopy,
  getPrimaryProductBadge,
  getProductStockState,
} from "@/lib/storefront";
import { WishlistButton } from "@/components/storefront/shared/wishlist-button";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const primaryBadge = getPrimaryProductBadge(product);
  const stockState = getProductStockState(product);
  const secondaryImage = product.images[1] ?? product.images[0];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted/35">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          {secondaryImage !== product.images[0] ? (
            <Image
              src={secondaryImage}
              alt={`${product.name} imagen secundaria`}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(20,22,18,0.12))]" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            {primaryBadge ? (
              <Badge variant={primaryBadge.tone === "sale" ? "secondary" : primaryBadge.tone === "warning" ? "outline" : "default"}>
                {primaryBadge.label}
              </Badge>
            ) : null}
          </div>
          <div className="absolute right-3 top-3">
            <WishlistButton productId={product.id} />
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 md:px-5 md:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/72">
              {product.lineName || product.category}
            </p>
            <Link href={`/products/${product.id}`} className="mt-2 block">
              <h3 className="line-clamp-2 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em] text-foreground">
                {product.name}
              </h3>
            </Link>
          </div>
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {stockState.label}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {getEditorialProductCopy(product)}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <PriceTag price={product.price} salePrice={product.salePrice} className="gap-2" />
            <p className="mt-1 text-xs text-muted-foreground">{stockState.hint}</p>
          </div>
          <Button asChild className="h-10 rounded-full px-4">
            <Link href={`/products/${product.id}`}>Ver</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
