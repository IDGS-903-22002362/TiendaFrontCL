import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shirt, ShoppingBag, Ticket, Trophy } from "lucide-react";

import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
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

  const categoryIcons: { [key: string]: React.ReactNode } = {
    Jerseys: <Shirt className="h-8 w-8" />,
    Accesorios: <ShoppingBag className="h-8 w-8" />,
    Coleccionables: <Trophy className="h-8 w-8" />,
    Boletos: <Ticket className="h-8 w-8" />,
  };

  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] w-full text-white">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            data-ai-hint={heroImage.imageHint}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
          <Badge
            variant="outline"
            className="mb-4 border-accent bg-accent/20 text-accent"
          >
            Nueva Colección 2024/2025
          </Badge>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Equípate para la Aventura
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-200">
            Todo lo que necesitas para tu próxima partida. La nueva mercancía ya
            está aquí.
          </p>
          <Button asChild className="mt-8" size="lg">
            <Link href="/products">
              Comprar ahora <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4">
        <h2 className="mb-8 text-center font-headline text-3xl font-bold tracking-tight">
          Nuestras Categorías
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-8">
          {visibleCategories.map((category) => (
            <Link
              href={`/products?category=${category.slug}`}
              key={category.id}
              className="group flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              {categoryIcons[category.name] || <Shirt className="h-8 w-8" />}
              <span className="font-headline text-lg font-semibold">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="container mx-auto px-4">
        <h2 className="mb-8 text-center font-headline text-3xl font-bold tracking-tight">
          Productos Destacados
        </h2>
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
                className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
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
      <section className="bg-secondary py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center font-headline text-3xl font-bold tracking-tight">
            Novedades
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
            {newArrivals.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Promotions Section */}
      <section className="container mx-auto px-4">
        <div className="overflow-hidden rounded-lg bg-primary text-primary-foreground">
          <div className="flex flex-col items-center justify-between p-8 md:flex-row md:p-12">
            <div className="text-center md:text-left">
              <h2 className="font-headline text-3xl font-bold tracking-tight">
                ¡Promociones Exclusivas!
              </h2>
              <p className="mt-2 max-w-xl text-primary-foreground/80">
                Encuentra jerseys de temporadas pasadas y artículos
                seleccionados con hasta 30% de descuento.
              </p>
            </div>
            <Button
              asChild
              variant="secondary"
              className="mt-6 shrink-0 md:mt-0"
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
