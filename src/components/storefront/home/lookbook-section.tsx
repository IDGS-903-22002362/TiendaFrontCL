import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { PriceTag } from "@/components/product/price-tag";
import { SectionHeader } from "./section-header";

type LookbookSectionProps = {
  products: Product[];
};

export function LookbookSection({ products }: LookbookSectionProps) {
  if (products.length < 3) {
    return null;
  }

  const [leadProduct, ...rest] = products;
  const supportingProducts = rest.slice(0, 2);

  return (
    <section className="container">
      <div className="home-dark-surface overflow-hidden rounded-[2.1rem] p-1">
        <div className="grid gap-1 lg:grid-cols-[1.12fr_0.88fr]">
          <article className="relative min-h-[30rem] overflow-hidden rounded-[1.8rem]">
            <Image
              src={leadProduct.images[0]}
              alt={leadProduct.name}
              fill
              sizes="(max-width: 1024px) 100vw, 54vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,16,14,0.08)_0%,rgba(11,16,14,0.18)_38%,rgba(11,16,14,0.78)_100%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-8 lg:p-10">
              <SectionHeader
                eyebrow="Compra el look"
                title="Una composición más limpia empieza por piezas mejor elegidas."
                description="Usa la home para entrar desde la narrativa visual y cerrar la compra desde el producto correcto, no desde más ruido."
                theme="dark"
              />

              <div className="max-w-md">
                <p className="home-kicker text-white/56">{leadProduct.lineName || leadProduct.category}</p>
                <h3 className="mt-3 font-headline text-3xl font-semibold uppercase leading-[0.88] tracking-[0.03em] text-white md:text-4xl">
                  {leadProduct.name}
                </h3>
                <div className="mt-4">
                  <PriceTag
                    price={leadProduct.price}
                    salePrice={leadProduct.salePrice}
                    className="gap-2 [&>span:first-child]:text-white [&>span+span]:text-white/56"
                  />
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/products/${leadProduct.id}`}
                    className="inline-flex h-12 items-center justify-between gap-3 rounded-[1rem] bg-white px-5 text-sm font-semibold text-foreground transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-white/92"
                  >
                    Ver pieza principal
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/products"
                    className="inline-flex h-12 items-center justify-between gap-3 rounded-[1rem] border border-white/14 px-5 text-sm font-semibold text-white transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:bg-white/8"
                  >
                    Ir al catálogo
                  </Link>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {supportingProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group grid gap-4 overflow-hidden rounded-[1.8rem] border border-white/8 bg-white/4 p-4 transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-white/6 md:grid-cols-[minmax(0,160px)_minmax(0,1fr)] md:p-5"
              >
                <div className="home-media-frame aspect-[4/5] rounded-[1.35rem]">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 24vw, 18vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="home-kicker text-white/52">{product.lineName || product.category}</p>
                    <h3 className="mt-3 font-headline text-[1.8rem] font-semibold uppercase leading-[0.9] tracking-[0.025em] text-white">
                      {product.name}
                    </h3>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <PriceTag
                      price={product.price}
                      salePrice={product.salePrice}
                      className="gap-2 [&>span:first-child]:text-white [&>span+span]:text-white/48"
                    />
                    <span className="editorial-link gap-2 text-white/76 group-hover:text-white">
                      Ver
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
