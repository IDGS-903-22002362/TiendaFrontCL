import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import type { Product } from "@/lib/types";

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Prueba con otra combinación de filtros o vuelve al catálogo completo."
        ctaLabel="Volver al catálogo"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
