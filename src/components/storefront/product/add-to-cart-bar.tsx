"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/storefront";
import { cn } from "@/lib/utils";

type AddToCartBarProps = {
  price: number;
  disabled: boolean;
  quantity: number;
  label?: string;
  onAdd: () => void;
  onTryOn?: () => void;
  personalizationFee?: number;
};

export function AddToCartBar({
  price,
  disabled,
  quantity,
  label,
  onAdd,
  onTryOn,
  personalizationFee = 0,
}: AddToCartBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const barElement = barRef.current;
    if (!barElement || typeof document === "undefined") {
      return;
    }

    const updateRuntimeHeight = () => {
      const nextHeight = Math.ceil(barElement.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--product-mobile-cta-runtime-height",
        `${nextHeight}px`,
      );
    };

    updateRuntimeHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateRuntimeHeight();
      });
      resizeObserver.observe(barElement);
    }

    window.addEventListener("resize", updateRuntimeHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateRuntimeHeight);
      document.documentElement.style.removeProperty(
        "--product-mobile-cta-runtime-height",
      );
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.35rem)] z-30 rounded-[1.3rem] border border-black/14 bg-[rgb(255_255_255_/_0.97)] p-3 shadow-[0_22px_42px_-30px_rgb(8_12_10_/_0.18)] backdrop-blur-md lg:hidden"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="editorial-label text-primary/74">Precio final</p>
          <p className="mt-2 font-headline text-[var(--font-size-price-card-mobile)] font-semibold uppercase leading-none tracking-[0.02em] text-foreground lg:text-[var(--font-size-price-card-desktop)]">
            {formatCurrency(price)}
          </p>
          {personalizationFee > 0 ? (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Incluye +{formatCurrency(personalizationFee)} personalización
            </p>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {quantity} {quantity === 1 ? "pieza" : "piezas"}
        </p>
      </div>
      <div
        className={cn("grid gap-2", onTryOn ? "grid-cols-2" : "grid-cols-1")}
      >
        {onTryOn ? (
          <Button
            variant="outline"
            type="button"
            className="h-[52px] min-h-[44px] min-w-[44px] lg:h-[56px] rounded-[1rem] border-primary/30 text-primary hover:bg-primary/10"
            onClick={onTryOn}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Pruebatelo
          </Button>
        ) : null}
        <Button
          className="h-[52px] min-h-[44px] min-w-[44px] lg:h-[56px] rounded-[1rem]"
          disabled={disabled}
          onClick={onAdd}
        >
          {label ?? (disabled ? "Selecciona una talla" : "Añadir al carrito")}
        </Button>
      </div>
    </div>
  );
}
