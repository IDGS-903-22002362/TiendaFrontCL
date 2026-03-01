import { fetchProductById, fetchProducts } from "@/lib/api/storefront";
import { notFound } from "next/navigation";
import { ProductDetailsClient } from "./product-details-client";
import { ProductCard } from "@/components/product/product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    notFound();
  }

  const allProducts = await fetchProducts();

  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 8);

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductDetailsClient product={product} />

      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t pt-12">
          <h2 className="mb-8 font-headline text-3xl font-bold tracking-tight">
            Productos Relacionados
          </h2>
          <Carousel
            opts={{
              align: "start",
            }}
            className="w-full"
          >
            <CarouselContent>
              {relatedProducts.map((relatedProduct) => (
                <CarouselItem
                  key={relatedProduct.id}
                  className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <div className="p-1">
                    <ProductCard product={relatedProduct} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </section>
      )}
    </div>
  );
}
