import { formatCurrency } from "@/lib/storefront";
import type { CartPersonalizationDisplay } from "@/lib/cart-personalization";
import { cn } from "@/lib/utils";

type CartItemPersonalizationProps = {
  personalization: CartPersonalizationDisplay;
  quantity?: number;
  compact?: boolean;
  className?: string;
};

export function CartItemPersonalization({
  personalization,
  quantity = 1,
  compact = false,
  className,
}: CartItemPersonalizationProps) {
  const totalFee = personalization.feePerUnit * Math.max(quantity, 1);

  return (
    <div
      className={cn(
        "rounded-[1rem] border border-primary/20 bg-primary/5 px-3 py-2.5",
        !compact && "md:rounded-[1.2rem] md:px-4 md:py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
          Jersey personalizado
        </p>
        {personalization.feePerUnit > 0 ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            +{formatCurrency(personalization.feePerUnit)} / pieza
          </p>
        ) : null}
      </div>

      <p className="mt-1 text-sm font-medium text-foreground">
        {personalization.name} · {personalization.number}
      </p>

      {personalization.feePerUnit > 0 && quantity > 1 ? (
        <p className="mt-1 text-xs font-medium text-primary/90">
          Cargo personalización: +{formatCurrency(totalFee)}
        </p>
      ) : null}

      {!compact ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {personalization.note}
        </p>
      ) : null}
    </div>
  );
}