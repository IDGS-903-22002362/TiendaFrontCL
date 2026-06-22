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
      <SelectTrigger className="h-11 w-full border-black/14 bg-white md:w-[220px]">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Ordenar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="destacados">Destacados</SelectItem>
        <SelectItem value="populares">Populares</SelectItem>
        <SelectItem value="mas_comprados">Más comprados</SelectItem>
        <SelectItem value="recientes">Novedades</SelectItem>
        <SelectItem value="precio_asc">Precio menor a mayor</SelectItem>
        <SelectItem value="precio_desc">Precio mayor a menor</SelectItem>
        <SelectItem value="nombre_asc">Nombre A-Z</SelectItem>
      </SelectContent>
    </Select>
  );
}
