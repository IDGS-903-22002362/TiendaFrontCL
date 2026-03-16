import Link from "next/link";
import type { Product } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FocusCard } from "@/components/ui/focus-cards";
import { PriceTag } from "./price-tag";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const productImageId = product.images[0].split("/").slice(-3, -2)[0];
  const placeholder = PlaceHolderImages.find((p) =>
    p.imageUrl.includes(productImageId),
  );

  return (
    <article className="focus-card-item group flex h-full flex-col rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(28,28,28,0.92),rgba(20,20,20,0.98))] transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[var(--shadow-elevated)] md:rounded-[28px]">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative">
          <FocusCard
            card={{
              title: product.name,
              src: product.images[0],
              imageHint: placeholder?.imageHint,
            }}
            showTitleOverlay={false}
            className="rounded-b-none border-0"
          />
          {product.tags.length > 0 && (
            <Badge
              className="absolute right-2.5 top-2.5 z-20 capitalize md:right-3 md:top-3"
              variant={product.tags[0] === "sale" ? "secondary" : "default"}
            >
              {product.tags[0] === "new" ? "Nuevo" : "Oferta"}
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-grow flex-col p-4 md:p-5">
        <Link href={`/products/${product.id}`} className="block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary">
            {product.category}
          </p>
          <h3 className="mt-2 line-clamp-2 min-h-[3rem] font-headline text-base font-semibold text-foreground md:min-h-[3.4rem] md:text-lg">
            {product.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs text-text-secondary md:mt-2 md:text-sm">
            Pieza oficial con acabado premium para colección y matchday.
          </p>
        </Link>

        <div className="mt-auto flex flex-col items-start gap-3 pt-4 md:gap-4">
          <PriceTag price={product.price} salePrice={product.salePrice} />
          <Button asChild className="h-11 w-full">
            <Link href={`/products/${product.id}`}>Ver detalles</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
