"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/storefront";

type AddToCartBarProps = {
  price: number;
  disabled: boolean;
  quantity: number;
  label?: string;
  onAdd: () => void;
};

export function AddToCartBar({
  price,
  disabled,
  quantity,
  label,
  onAdd,
}: AddToCartBarProps) {
  return (
    <div className="fixed inset-x-4 z-30 rounded-[1.5rem] border border-border bg-[rgb(251_249_243_/_0.96)] p-3 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:hidden mobile-bottom-offset">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
            Precio final
          </p>
          <p className="mt-1 font-headline text-3xl font-semibold uppercase leading-none tracking-[0.02em] text-foreground">
            {formatCurrency(price)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {quantity} {quantity === 1 ? "pieza" : "piezas"}
        </p>
      </div>
      <Button className="h-12 w-full rounded-full" disabled={disabled} onClick={onAdd}>
        {label ?? (disabled ? "Selecciona una talla" : "Añadir al carrito")}
      </Button>
    </div>
  );
}
