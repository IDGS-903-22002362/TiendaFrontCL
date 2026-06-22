"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type ActiveFilterChipsProps = {
  filters: ActiveFilterChip[];
  onClear?: () => void;
  className?: string;
};

export function ActiveFilterChips({
  filters,
  onClear,
  className,
}: ActiveFilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={filter.onRemove}
          className="group inline-flex min-h-[32px] items-center gap-1.5 border border-black/14 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-black hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <span>{filter.label}</span>
          <X className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
          <span className="sr-only">Quitar filtro {filter.label}</span>
        </button>
      ))}

      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          Limpiar todo
        </button>
      ) : null}
    </div>
  );
}
