import Link from "next/link";
import type { StorefrontCategoryCard } from "@/lib/storefront/types";

export function CategoryGrid({ categories }: { categories: StorefrontCategoryCard[] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="container">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={category.href}
            className={`group relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1 md:p-6 ${
              index === 0 ? "md:col-span-2 xl:col-span-2" : ""
            }`}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(13,106,70,0.03),transparent_55%,rgba(182,144,47,0.08))]" />
            <div className="relative z-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                {category.eyebrow}
              </p>
              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <h3 className="font-headline text-3xl font-semibold uppercase leading-none tracking-[0.03em] text-foreground md:text-4xl">
                    {category.name}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {category.count} items
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
