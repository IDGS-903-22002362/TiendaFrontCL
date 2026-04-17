import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StorefrontCategoryCard } from "@/lib/storefront/types";

export function CategoryGrid({ categories }: { categories: StorefrontCategoryCard[] }) {
  if (categories.length === 0) {
    return null;
  }

  const [leadCategory, ...otherCategories] = categories;

  return (
    <div className="container">
      <div
        className={cn(
          "grid gap-4",
          otherCategories.length > 0 && "xl:grid-cols-[1.05fr_0.95fr]",
        )}
      >
        <Link
          href={leadCategory.href}
          className="group home-dark-surface relative flex min-h-[20rem] flex-col justify-between overflow-hidden rounded-[1.9rem] px-6 py-7 md:px-8 md:py-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(185,145,69,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_28%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <p className="home-kicker text-[#d0ad63]">{leadCategory.eyebrow}</p>
              <span className="home-rule bg-white/14" />
            </div>
            <h3 className="mt-5 max-w-[9ch] font-headline text-4xl font-semibold uppercase leading-[0.88] tracking-[0.03em] text-white md:text-[3.75rem]">
              {leadCategory.name}
            </h3>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/70 md:text-base">
              {leadCategory.description}
            </p>
          </div>
          <div className="relative z-10 flex items-end justify-between gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/56">
              {leadCategory.count} piezas
            </span>
            <span className="editorial-link gap-2 text-white">
              Explorar
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </Link>

        <div className="grid gap-4 sm:grid-cols-2">
          {otherCategories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="group home-surface min-h-[16.5rem] rounded-[1.6rem] px-5 py-6 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-black/28 hover:shadow-[0_22px_44px_-36px_rgb(8_12_10_/_0.22)] md:px-6 md:py-7"
          >
            <div className="flex h-full flex-col justify-between gap-7">
              <div>
                <div className="flex items-center gap-3">
                  <p className="home-kicker text-primary/66">{category.eyebrow}</p>
                  <span className="home-rule" />
                </div>
                <h3 className="mt-4 max-w-[10ch] font-headline text-[2.1rem] font-semibold uppercase leading-[0.9] tracking-[0.03em] text-foreground">
                  {category.name}
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <div className="flex items-end justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                  {category.count} piezas
                </span>
                <span className="editorial-link gap-2 text-foreground/72 group-hover:text-primary">
                  Ver
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </div>
          </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
