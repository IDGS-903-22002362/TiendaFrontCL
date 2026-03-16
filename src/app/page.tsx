import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import { CategoryMarquee } from "@/components/home/category-marquee";
import { ProductCard } from "@/components/product/product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const normalizeCategoryValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export default async function Home() {
  const [products, categories] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
  ]);

  const visibleCategories = categories.filter((category) => {
    const normalized = normalizeCategoryValue(
      `${category.name} ${category.slug}`,
    );
    return !normalized.includes("prueba") && !normalized.includes("test");
  });

  const featuredProducts = products.slice(0, 8);
  const newArrivals = products
    .filter((p) => p.tags.includes("new"))
    .slice(0, 8);
  const heroImage = PlaceHolderImages.find((img) => img.id === "hero-banner-1");

  return (
    <div className="space-y-10 pb-6 md:space-y-18 lg:space-y-24">
      {/* Hero Section */}
      <section className="container">
        <div className="relative isolate overflow-hidden rounded-[30px] border border-border bg-background-deep text-white shadow-[var(--shadow-elevated)] md:rounded-[36px]">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              data-ai-hint={heroImage.imageHint}
              fill
              className="object-cover opacity-45"
              priority
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,5,5,0.96),rgba(5,5,5,0.72)_52%,rgba(10,130,66,0.42))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(237,205,18,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(10,130,66,0.28),transparent_32%)]" />
          <div className="relative z-10 grid min-h-[460px] items-center gap-6 px-5 py-10 md:min-h-[560px] md:gap-12 md:px-12 md:py-16 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:px-16">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-5">
                Nueva Colección 2024/2025
              </Badge>
              <h1 className="font-headline text-3xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
                Futbol premium con la fuerza visual del Club León
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/76 md:mt-5 md:max-w-2xl md:text-lg">
                Jerseys, accesorios y piezas destacadas con estética oficial,
                contraste impecable y una experiencia de compra moderna.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12">
                  <Link href="/products">
                    Comprar ahora <ArrowRight className="ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 md:inline-flex">
                  <Link href="/products?tag=new">Ver novedades</Link>
                </Button>
              </div>
            </div>

            <div className="flex snap-x gap-3 overflow-x-auto pb-1 text-left md:grid md:gap-3 md:overflow-visible md:pb-0">
              {[
                ["Drop oficial", "Jerseys y accesorios con identidad de alto contraste"],
                ["Promos clave", "Acentos dorados para ofertas y lanzamientos"],
                ["Experiencia premium", "Superficies oscuras, limpias y enfocadas en producto"],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="min-w-[220px] snap-start rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur-md md:min-w-0 md:p-5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/74">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <CategoryMarquee categories={visibleCategories} />

      {/* Featured Products Section */}
      <section className="container">
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
            Selección editorial
          </p>
          <h2 className="mt-2 font-headline text-3xl font-bold tracking-tight">
            Productos Destacados
          </h2>
        </div>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {featuredProducts.map((product) => (
              <CarouselItem
                key={product.id}
                className="basis-[82%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <div className="p-1">
                  <ProductCard product={product} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </section>

      {/* New Arrivals Section */}
      <section className="container">
        <div className="rounded-[30px] border border-border bg-card/85 px-4 py-8 shadow-[var(--shadow-card)] md:rounded-[36px] md:px-8 md:py-14">
          <div className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
              Lanzamientos
            </p>
            <h2 className="mt-2 font-headline text-3xl font-bold tracking-tight">
              Novedades
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
            {newArrivals.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Promotions Section */}
      <section className="container">
        <div className="overflow-hidden rounded-[30px] border border-secondary/20 bg-[linear-gradient(135deg,rgba(8,102,54,0.96),rgba(10,130,66,0.86)_48%,rgba(237,205,18,0.22))] text-primary-foreground shadow-[var(--shadow-elevated)] md:rounded-[36px]">
          <div className="flex flex-col items-start justify-between gap-6 p-5 md:flex-row md:items-center md:gap-8 md:p-12">
            <div className="text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
                Ofertas
              </p>
              <h2 className="mt-2 font-headline text-3xl font-bold tracking-tight">
                ¡Promociones Exclusivas!
              </h2>
              <p className="mt-3 max-w-xl text-sm text-primary-foreground/82 md:text-base">
                Encuentra jerseys de temporadas pasadas y artículos
                seleccionados con hasta 30% de descuento.
              </p>
            </div>
            <Button
              asChild
              variant="secondary"
              className="h-12 w-full shrink-0 md:w-auto"
              size="lg"
            >
              <Link href="/products?tag=sale">Ver Ofertas</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

