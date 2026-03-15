import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/lib/types';
import { Frown } from 'lucide-react';

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-card/90 p-8 text-center shadow-[var(--shadow-card)] md:rounded-[32px] md:p-12">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted/55">
          <Frown className="h-10 w-10 text-text-muted" />
        </div>
        <h2 className="mt-6 font-headline text-2xl font-semibold">
          No se encontraron productos
        </h2>
        <p className="mt-2 max-w-md text-text-secondary">
          Intenta ajustar tus filtros o buscar algo diferente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
