import { cn } from '@/lib/utils';

type PriceTagProps = {
  price: number;
  salePrice?: number;
  className?: string;
};

export function PriceTag({ price, salePrice, className }: PriceTagProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const finalPrice = salePrice || price;

  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <span
        className={cn(
          "font-headline text-3xl font-semibold uppercase leading-none tracking-[0.02em]",
          salePrice ? "text-primary" : "text-foreground",
        )}
      >
        {formatPrice(finalPrice)}
      </span>
      {salePrice && (
        <span className="text-sm text-text-muted line-through">
          {formatPrice(price)}
        </span>
      )}
    </div>
  );
}
