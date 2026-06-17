import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";
import { SortSelect } from "./sort-select";

type ProductToolbarProps = {
  count: number;
  searchLabel?: string;
  activeFilters: string[];
  onClear: () => void;
  sort: string;
  onSortChange: (value: string) => void;
  mobileFilters: ReactNode;
};

export function ProductToolbar({
  count,
  searchLabel,
  activeFilters,
  onClear,
  sort,
  onSortChange,
  mobileFilters,
}: ProductToolbarProps) {
  return (
    <div className="border border-black/14 bg-white p-4 shadow-[0_20px_40px_-36px_rgb(8_12_10_/_0.16)] md:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Breadcrumbs
              items={[
                { label: "Inicio", href: "/" },
                { label: "Productos", href: "/products" },
                { label: searchLabel || "Catálogo" },
              ]}
            />
            <div>
              <p className="editorial-label text-primary/74">
                Catálogo de tienda
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="font-headline text-[var(--font-size-catalog-title-mobile)] font-semibold uppercase leading-[var(--line-height-heading-large)] tracking-[0.03em] lg:text-[var(--font-size-catalog-title-desktop)]">
                  {searchLabel || "Todos los productos"}
                </h1>
                <span className="border border-black/14 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {count} productos
                </span>
              </div>
            </div>
          </div>
          <SortSelect value={sort} onValueChange={onSortChange} />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {activeFilters.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="whitespace-nowrap border border-black/14 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground"
                >
                  {filter}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Filtra por categoría, línea, talla, precio y favoritos.
            </p>
          )}

          <div className="flex items-center gap-3">
            {activeFilters.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 px-4"
                onClick={onClear}
              >
                Limpiar filtros
              </Button>
            ) : null}
            <div className="xl:hidden">{mobileFilters}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
