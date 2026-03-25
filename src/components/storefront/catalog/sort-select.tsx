"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SortSelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-11 w-full rounded-full bg-card md:w-[220px]">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Ordenar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="featured">Destacados</SelectItem>
        <SelectItem value="newest">Más nuevos</SelectItem>
        <SelectItem value="price-asc">Precio ascendente</SelectItem>
        <SelectItem value="price-desc">Precio descendente</SelectItem>
      </SelectContent>
    </Select>
  );
}
