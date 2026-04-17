import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatCurrency, getEditorialProductCopy, getProductEyebrow } from "@/lib/storefront";

type EditorialSplitProps = {
  product: Product;
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function EditorialSplit({
  product,
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: EditorialSplitProps) {
  return (
    <section className="container">
      <div className="home-surface overflow-hidden rounded-[2rem]">
        <div className="grid gap-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-stretch">
          <div className="relative min-h-[20rem] lg:min-h-[32rem]">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,23,21,0)_44%,rgba(17,23,21,0.12)_100%)]" />
          </div>

          <div className="flex flex-col justify-between px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
            <div>
              <div className="flex items-center gap-3">
                <p className="home-kicker text-primary/68">{eyebrow}</p>
                <span className="home-rule" />
              </div>
              <h2 className="mt-4 max-w-[14ch] font-headline text-4xl font-semibold uppercase leading-[0.88] tracking-[0.035em] text-foreground md:text-[4.5rem]">
                {title}
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                {description}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-[1rem] px-6">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {secondaryHref && secondaryLabel ? (
                <Button asChild variant="outline" className="h-12 rounded-[1rem] px-6">
                  <Link href={secondaryHref}>{secondaryLabel}</Link>
                </Button>
              ) : null}
            </div>

            <div className="mt-8 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                <span>{getProductEyebrow(product)}</span>
                <span className="h-1 w-1 rounded-full bg-border-strong" />
                <span>{formatCurrency(product.salePrice || product.price)}</span>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                {getEditorialProductCopy(product)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
