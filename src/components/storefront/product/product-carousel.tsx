import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/storefront/shared/section-heading";
import { cn } from "@/lib/utils";

type ProductCarouselProps = {
  eyebrow: string;
  title: string;
  description: string;
  products: Product[];
  href?: string;
  hrefLabel?: string;
  contained?: boolean;
  className?: string;
};

export function ProductCarousel({
  eyebrow,
  title,
  description,
  products,
  href,
  hrefLabel,
  contained = true,
  className,
}: ProductCarouselProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className={cn(contained && "container", className)}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          href && hrefLabel ? (
            <Button asChild variant="ghost" className="h-11 rounded-full px-4">
              <Link href={href}>
                {hrefLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="mt-6">
        <Carousel
          opts={{ align: "start", loop: products.length > 4 }}
          className="w-full"
        >
          <CarouselContent>
            {products.map((product) => (
              <CarouselItem
                key={product.id}
                className="basis-[82%] sm:basis-1/2 xl:basis-1/4"
              >
                <ProductCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3 top-3 translate-y-0" />
          <CarouselNext className="right-3 top-3 translate-y-0" />
        </Carousel>
      </div>
    </section>
  );
}
