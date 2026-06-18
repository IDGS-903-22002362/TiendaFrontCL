import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";
import {
  ActiveFilterChips,
  type ActiveFilterChip,
} from "./active-filter-chips";
import { SortSelect } from "./sort-select";

type ProductToolbarProps = {
  count: number;
  searchLabel?: string;
  activeFilters: ActiveFilterChip[];
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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Breadcrumbs
              items={[
                { label: "Inicio", href: "/" },
                { label: "Productos", href: "/products" },
                { label: searchLabel || "Catálogo" },
              ]}
            />
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em] md:text-3xl lg:text-[2.5rem]">
                {searchLabel || "Todos los productos"}
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {count} {count === 1 ? "producto" : "productos"}
              </span>
            </div>
          </div>

          <div className="hidden xl:block">
            <SortSelect value={sort} onValueChange={onSortChange} />
          </div>
        </div>

        <div className="flex items-stretch gap-2 xl:hidden">
          <div className="flex-1">{mobileFilters}</div>
          <div className="flex-1">
            <SortSelect value={sort} onValueChange={onSortChange} />
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <div className="border-t border-black/8 pt-3">
            <ActiveFilterChips filters={activeFilters} onClear={onClear} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
