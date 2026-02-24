import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/lib/types';
import { Frown } from 'lucide-react';

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-12 text-center">
        <Frown className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 font-headline text-2xl font-semibold">
          No se encontraron productos
        </h2>
        <p className="mt-2 text-muted-foreground">
          Intenta ajustar tus filtros o buscar algo diferente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
