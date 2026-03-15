import { Suspense } from "react";
import { ProductFilters } from "./product-filters";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await searchParams;

  const [products, categories, lineas, tallas] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
    lineasApi.getAll(),
    tallasApi.getAll(),
  ]);

  return (
    <div className="container py-5 md:py-8">
      <header className="mb-6 rounded-[26px] border border-border bg-card/90 p-5 shadow-[var(--shadow-card)] md:mb-10 md:rounded-[30px] md:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
          Catálogo
        </p>
        <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight md:text-4xl">
          Todos los Productos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary md:text-lg">
          Selección oficial con superficies oscuras, filtros rápidos y una
          navegación pensada para explorar por línea, talla y promociones.
        </p>
      </header>
      <Suspense fallback={<div>Cargando filtros...</div>}>
        <ProductFilters
          allProducts={products}
          categories={categories}
          lineas={lineas}
          tallas={tallas}
        />
      </Suspense>
    </div>
  );
}
