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
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight">
          Todos los Productos
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Encuentra todo lo que necesitas para tu próxima aventura.
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
