"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { StorefrontCategoryCard } from "@/lib/storefront/types";

const CATEGORY_IMAGE_CLASS: Record<"featured" | "compact" | "wide", string> = {
  featured:
    "absolute inset-0 z-0 h-full w-full object-cover object-[center_22%] transition-opacity duration-300",
  wide: "absolute inset-0 z-0 h-full w-full object-cover object-center transition-opacity duration-300",
  compact:
    "absolute inset-0 z-0 h-full w-full object-cover object-center transition-opacity duration-300",
};

function CategoryImage({
  src,
  alt,
  lazy = true,
  variant,
}: {
  src?: string | null;
  alt: string;
  lazy?: boolean;
  variant: "featured" | "compact" | "wide";
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      setFailed(false);
      return;
    }

    setLoaded(false);
    setFailed(false);

    let cancelled = false;
    const preload = new window.Image();

    preload.onload = () => {
      if (!cancelled) {
        setLoaded(true);
      }
    };

    preload.onerror = () => {
      if (!cancelled) {
        setFailed(true);
      }
    };

    preload.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || failed || !loaded) {
    return null;
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      className={cn(CATEGORY_IMAGE_CLASS[variant], "opacity-100")}
    />
  );
}

function CategoryFooter({
  count,
  cta,
  tone,
}: {
  count: number;
  cta: string;
  tone: "dark" | "light";
}) {
  return (
    <div className="flex items-end justify-between gap-4 pt-6">
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.2em]",
          tone === "dark" ? "text-white/58" : "text-text-muted",
        )}
      >
        {count} piezas
      </span>
      <span
        className={cn(
          "editorial-link gap-2",
          tone === "dark"
            ? "text-white"
            : "text-foreground/72 group-hover:text-primary",
        )}
      >
        {cta}
        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </div>
  );
}

export function CategoryGrid({ categories }: { categories: StorefrontCategoryCard[] }) {
  if (categories.length === 0) {
    return null;
  }

  const [leadCategory, ...otherCategories] = categories;

  return (
    <div className="w-full overflow-hidden">
      <div
        className={cn(
          "grid gap-px bg-black/10",
          otherCategories.length > 0 && "xl:grid-cols-[1.05fr_0.95fr]",
        )}
      >
        <Link
          href={leadCategory.href}
          className="group relative flex min-h-[20rem] flex-col justify-between overflow-hidden border border-white/8 bg-[linear-gradient(150deg,rgb(16_22_20/0.98),rgb(11_16_14/0.96))] px-6 py-7 shadow-[var(--shadow-editorial-strong)] md:min-h-[24rem] md:px-8 md:py-8 xl:min-h-0"
        >
          <CategoryImage
            key={`${leadCategory.id}-${leadCategory.imagenPrincipal ?? "none"}`}
            src={leadCategory.imagenPrincipal}
            alt={leadCategory.name}
            lazy={false}
            variant="featured"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-[linear-gradient(180deg,transparent_0%,rgba(8,12,10,0.42)_48%,rgba(8,12,10,0.88)_100%)]"
          />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <p className="home-kicker text-[#d0ad63]">{leadCategory.eyebrow}</p>
              <span className="home-rule bg-white/14" />
            </div>
            <h3 className="mt-4 max-w-[9ch] font-headline text-4xl font-semibold uppercase leading-[0.88] tracking-[0.03em] text-white md:mt-5 md:text-[3.75rem]">
              {leadCategory.name}
            </h3>
          </div>
          <div className="relative z-10">
            <CategoryFooter count={leadCategory.count} cta="Explorar" tone="dark" />
          </div>
        </Link>

        <div className="grid gap-px bg-black/10 sm:grid-cols-2">
          {otherCategories.map((category) => {
            const isWide = category.gridColSpan === 2;

            return (
              <Link
                key={category.id}
                href={category.href}
                className={cn(
                  "group relative flex min-h-[16.5rem] flex-col justify-between overflow-hidden border border-white/8 bg-[linear-gradient(150deg,rgb(16_22_20/0.98),rgb(11_16_14/0.96))] px-5 py-6 shadow-none md:px-6 md:py-7",
                  isWide && "sm:col-span-2 md:min-h-[18rem]",
                )}
              >
                <CategoryImage
                  key={`${category.id}-${category.imagenPrincipal ?? "none"}`}
                  src={category.imagenPrincipal}
                  alt={category.name}
                  lazy
                  variant={isWide ? "wide" : "compact"}
                />
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-[linear-gradient(180deg,transparent_0%,rgba(8,12,10,0.42)_48%,rgba(8,12,10,0.88)_100%)]",
                    isWide ? "h-[50%]" : "h-[55%]",
                  )}
                />
                <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="home-kicker text-[#d0ad63]">{category.eyebrow}</p>
                      <span className="home-rule bg-white/14" />
                    </div>
                    <h3 className="mt-3 max-w-[10ch] font-headline text-[2.1rem] font-semibold uppercase leading-[0.9] tracking-[0.03em] text-white md:mt-4">
                      {category.name}
                    </h3>
                  </div>
                  <CategoryFooter count={category.count} cta="Ver" tone="dark" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
