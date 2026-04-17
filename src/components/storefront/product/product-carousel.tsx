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
      <div className="rounded-[1.6rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.22))] px-4 py-5 shadow-[var(--shadow-card)] md:px-6 md:py-7">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            href && hrefLabel ? (
              <Link
                href={href}
                className="editorial-link text-foreground/72 hover:text-primary"
              >
                {hrefLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        />
        <div className="mt-7">
          <Carousel
            opts={{ align: "start", loop: products.length > 4 }}
            className="w-full"
          >
            <CarouselContent className="py-1">
              {products.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="basis-[75%] sm:basis-[45%] md:basis-[30%] lg:basis-1/4 xl:basis-1/5"
                >
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-auto right-12 top-[-4.4rem] hidden translate-y-0 md:inline-flex" />
            <CarouselNext className="right-0 top-[-4.4rem] hidden translate-y-0 md:inline-flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
