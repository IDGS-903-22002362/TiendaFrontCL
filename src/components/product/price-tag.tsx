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
          "font-headline text-2xl font-bold tracking-tight",
          salePrice ? "text-secondary" : "text-foreground",
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
