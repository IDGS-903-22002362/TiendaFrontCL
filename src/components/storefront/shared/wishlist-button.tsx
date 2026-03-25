"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/hooks/use-storefront";

type WishlistButtonProps = {
  productId: string;
  className?: string;
};

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useStorefront();
  const active = isWishlisted(productId);

  return (
    <button
      type="button"
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleWishlist(productId);
      }}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[rgb(250_248_242_/_0.92)] text-foreground transition-all hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active && "border-primary bg-primary text-primary-foreground",
        className,
      )}
    >
      <Heart className={cn("h-4.5 w-4.5", active && "fill-current")} />
    </button>
  );
}
