import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CreditCard, Package, ShieldCheck } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import {
  getCategoryCards,
  getFeaturedProducts,
  getHeroProduct,
  getNewArrivalProducts,
  isPersonalizableProduct,
} from "@/lib/storefront";
import { Button } from "@/components/ui/button";
import { HeroEditorial } from "@/components/storefront/home/hero-editorial";
import { CategoryGrid } from "@/components/storefront/home/category-grid";
import { ProductCarousel } from "@/components/storefront/product/product-carousel";
import { SectionHeading } from "@/components/storefront/shared/section-heading";

const benefits = [
  {
    title: "Envío con seguimiento",
    description: "Compra con trazabilidad clara y tiempos estimados desde checkout.",
    icon: Package,
  },
  {
    title: "Pagos protegidos",
    description: "Stripe mantiene el proceso de pago seguro y sin fricción.",
    icon: CreditCard,
  },
  {
    title: "Compra oficial",
    description: "Producto del club con identidad premium y navegación consistente.",
    icon: ShieldCheck,
  },
];

export default async function Home() {
  const [products, categories] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
  ]);

  const heroProduct = getHeroProduct(products);
  const featuredProducts = getFeaturedProducts(products);
  const newArrivals = getNewArrivalProducts(products);
  const categoryCards = getCategoryCards(categories, products);
  const customizableProduct =
    featuredProducts.find(isPersonalizableProduct) ||
    products.find(isPersonalizableProduct);
  const editorialProduct = featuredProducts[1] ?? heroProduct;

  if (!heroProduct) {
    return (
      <div className="container py-20">
        <div className="rounded-[2rem] border border-border bg-card p-10 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-headline text-4xl font-semibold uppercase">La Guarida</h1>
          <p className="mt-4 text-muted-foreground">
            No hay productos visibles para construir la portada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-14 pb-10 md:space-y-20 md:pb-14">
      <HeroEditorial product={heroProduct} />

      <section className="container">
        <SectionHeading
          eyebrow="Explora"
          title="Colecciones con estructura comercial"
          description="El catálogo se reorganiza para que la navegación sea limpia, densa y orientada a producto, no a cajas vacías."
        />
      </section>
      <CategoryGrid categories={categoryCards} />

      <ProductCarousel
        eyebrow="Selección editorial"
        title="Destacados"
        description="Piezas con mejor presencia visual para abrir la compra desde home."
        products={featuredProducts}
        href="/products"
        hrefLabel="Ver catálogo"
      />

      {customizableProduct ? (
        <section className="container">
          <div className="grid gap-6 overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-card)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[280px] lg:min-h-[420px]">
              <Image
                src={customizableProduct.images[0]}
                alt={customizableProduct.name}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-between px-6 py-7 md:px-8 md:py-9">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/74">
                  Jerseys personalizables
                </p>
                <h2 className="mt-3 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-6xl">
                  Tu nombre. Tu dorsal. La misma narrativa visual.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                  El nuevo flujo de personalización se integra al PDP con preview limpio, validación y resumen visible en carrito sin romper la lógica actual del checkout.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full px-6">
                  <Link href={`/products/${customizableProduct.id}`}>
                    Personalizar ahora
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full px-6">
                  <Link href="/products?category=jerseys">Ver jerseys</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <ProductCarousel
        eyebrow="Lanzamientos"
        title="Novedades"
        description="Productos recientes con tarjetas más finas y lectura comercial más clara."
        products={newArrivals}
        href="/products?tag=new"
        hrefLabel="Ir a novedades"
      />

      <section className="container">
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-[1.75rem] border border-border bg-card px-5 py-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/55 text-primary">
                <benefit.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-headline text-2xl font-semibold uppercase leading-none">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {editorialProduct ? (
        <section className="container">
          <div className="grid gap-6 overflow-hidden rounded-[2rem] border border-border bg-[#121714] text-white shadow-[var(--shadow-elevated)] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[320px]">
              <Image
                src={editorialProduct.images[0]}
                alt={editorialProduct.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center px-6 py-8 md:px-8 md:py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
                Cierre editorial
              </p>
              <h2 className="mt-3 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-6xl">
                Continuidad real entre listado y detalle.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/72 md:text-base">
                El mismo sistema visual ahora conecta hero, catálogo, producto, carrito y checkout con densidad correcta, jerarquía fuerte y acciones mejor distribuidas.
              </p>
              <div className="mt-7">
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-full border-white/14 bg-transparent px-6 text-white hover:bg-white/8 hover:text-white"
                >
                  <Link href={`/products/${editorialProduct.id}`}>
                    Ver colección destacada
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
