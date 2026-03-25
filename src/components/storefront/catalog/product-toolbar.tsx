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
    <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/74">
                Catálogo premium
              </p>
              <div className="mt-2 flex items-center gap-3">
                <h1 className="font-headline text-3xl font-semibold uppercase leading-none tracking-[0.03em] md:text-4xl">
                  {searchLabel || "Todos los productos"}
                </h1>
                <span className="rounded-full border border-border bg-muted/55 px-3 py-1 text-xs font-semibold text-muted-foreground">
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
                  className="whitespace-nowrap rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {filter}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Filtra por categoría, línea, talla, precio y favoritos locales.
            </p>
          )}

          <div className="flex items-center gap-3">
            {activeFilters.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-full px-4"
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
