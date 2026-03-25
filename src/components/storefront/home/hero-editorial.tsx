import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  getEditorialProductCopy,
  getProductEyebrow,
  isPersonalizableProduct,
} from "@/lib/storefront";

export function HeroEditorial({ product }: { product: Product }) {
  const primaryHref = `/products/${product.id}`;
  const secondaryHref = isPersonalizableProduct(product)
    ? `/products/${product.id}`
    : "/products?tag=new";

  return (
    <section className="container pt-5 md:pt-8">
      <div className="overflow-hidden rounded-[2rem] border border-border bg-[#121714] text-white shadow-[var(--shadow-elevated)] md:rounded-[2.5rem]">
        <div className="grid items-stretch lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative flex flex-col justify-between px-6 py-8 md:px-10 md:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(13,106,70,0.28),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(182,144,47,0.2),transparent_25%)]" />
            <div className="relative z-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">
                {getProductEyebrow(product)}
              </p>
              <h1 className="mt-3 max-w-xl font-headline text-5xl font-semibold uppercase leading-[0.92] tracking-[0.03em] md:text-7xl">
                La Guarida, producto al frente.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/72 md:text-base">
                {product.name} presenta una tienda más limpia, editorial y enfocada en conversión comercial sin perder la identidad verde y dorada del club.
              </p>
            </div>

            <div className="relative z-10 mt-8 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
                  Producto destacado
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{product.name}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {getEditorialProductCopy(product)}
                </p>
                <p className="mt-4 font-headline text-3xl font-semibold uppercase tracking-[0.02em] text-[#d4af37]">
                  {formatCurrency(product.salePrice || product.price)}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:min-w-[220px]">
                <Button asChild className="h-12 justify-between rounded-full px-5">
                  <Link href={primaryHref}>
                    Ver producto
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 justify-between rounded-full border-white/18 bg-transparent px-5 text-white hover:bg-white/8 hover:text-white"
                >
                  <Link href={secondaryHref}>
                    {isPersonalizableProduct(product) ? "Personalizar jersey" : "Ver novedades"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative min-h-[360px] border-t border-white/10 lg:min-h-[620px] lg:border-l lg:border-t-0">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,23,20,0.06),rgba(18,23,20,0.22))]" />
            <div className="absolute bottom-4 left-4 right-4 grid gap-3 md:bottom-6 md:left-6 md:right-auto md:w-[20rem]">
              <div className="rounded-[1.4rem] border border-white/12 bg-[rgb(248_246_240_/_0.9)] p-4 text-foreground shadow-[var(--shadow-card)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                  Editorial pick
                </p>
                <p className="mt-2 font-headline text-3xl font-semibold uppercase leading-none tracking-[0.03em]">
                  {product.category}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {getEditorialProductCopy(product)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
