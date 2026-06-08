import { cn } from '@/lib/utils';

type PriceTagProps = {
  price: number;
  salePrice?: number | null;
  offerLabel?: string | null;
  className?: string;
};

export function PriceTag({
  price,
  salePrice,
  offerLabel,
  className,
}: PriceTagProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const hasSale =
    typeof salePrice === 'number' &&
    salePrice > 0 &&
    salePrice < price;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {hasSale ? (
        <>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-sm font-semibold text-muted-foreground line-through">
              {formatPrice(price)}
            </span>

            <span className="font-headline text-lg font-semibold uppercase leading-none tracking-[0.015em] text-primary md:text-xl">
              {formatPrice(salePrice)}
            </span>
          </div>

          <span className="w-fit border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {offerLabel || 'Oferta'}
          </span>
        </>
      ) : (
        <span className="font-headline text-lg font-semibold uppercase leading-none tracking-[0.015em] text-foreground md:text-xl">
          {formatPrice(price)}
        </span>
      )}
    </div>
  );
}