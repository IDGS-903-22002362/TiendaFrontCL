import { getProduct, getProducts } from '@/lib/mock-data';
import { notFound } from 'next/navigation';
import { ProductDetailsClient } from './product-details-client';
import { ProductCard } from '@/components/product/product-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getProduct(params.id);

  if (!product) {
    notFound();
  }

  const relatedProducts = getProducts()
    .filter(p => p.category === product.category && p.id !== product.id)
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
              align: 'start',
            }}
            className="w-full"
          >
            <CarouselContent>
              {relatedProducts.map(relatedProduct => (
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
