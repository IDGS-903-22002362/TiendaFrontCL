"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/hooks/use-storefront";

type WishlistButtonProps = {
  productId: string;
  className?: string;
};

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useStorefront();
  const [isPending, setIsPending] = useState(false);
  const active = isWishlisted(productId);

  return (
    <button
      type="button"
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isPending) {
          return;
        }

        setIsPending(true);
        void toggleWishlist(productId).finally(() => setIsPending(false));
      }}
      disabled={isPending}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/14 bg-white text-foreground shadow-[0_10px_24px_-22px_rgb(10_14_11_/_0.22)] transition-[color,background-color,border-color,transform,opacity] hover:-translate-y-px hover:border-black hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-70",
        active && "border-primary bg-primary text-primary-foreground",
        className,
      )}
    >
      <Heart className={cn("h-4.5 w-4.5", active && "fill-current")} />
    </button>
  );
}
