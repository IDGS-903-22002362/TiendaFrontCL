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
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className="font-headline text-xl font-bold text-primary">
        {formatPrice(finalPrice)}
      </span>
      {salePrice && (
        <span className="text-sm text-muted-foreground line-through">
          {formatPrice(price)}
        </span>
      )}
    </div>
  );
}
