import { Suspense } from 'react';
import { ProductFilters } from './product-filters';
import { getCategories, getProducts } from '@/lib/mock-data';

export default function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const products = getProducts();
  const categories = getCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight">
          Todos los Productos
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Encuentra todo lo que necesitas para mostrar tu pasión por La Fiera.
        </p>
      </header>
      <Suspense fallback={<div>Cargando filtros...</div>}>
        <ProductFilters allProducts={products} categories={categories} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
