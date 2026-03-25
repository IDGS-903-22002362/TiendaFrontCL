import { Suspense } from "react";
import { ProductFilters } from "./product-filters";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";
import { isProductVisible } from "@/lib/storefront";

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
      <Suspense fallback={<div>Cargando catálogo...</div>}>
        <ProductFilters
          allProducts={products.filter(isProductVisible)}
          categories={categories}
          lineas={lineas}
          tallas={tallas}
        />
      </Suspense>
    </div>
  );
}
