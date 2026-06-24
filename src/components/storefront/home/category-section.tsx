"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { lineasApi } from "@/lib/api/lineas";
import { categoriasApi } from "@/lib/api/categorias";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Linea, Category } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import Link from "next/link";

function normalizeSearch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

export default function CategorySection() {
    const [categorias, setCategorias] = useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const loadCategorias = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await categoriasApi.getAll();
            setCategorias(data);
            setSelectedCategoriaId((current) =>
                current && !data.some((categoria) => categoria.id === current) ? "" : current,
            );
        } catch (error) {
            toast({
                variant: "destructive",
                title: "No se pudieron cargar las categorías",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadCategorias();
    }, [loadCategorias]);

    const filteredCategorias = useMemo(() => {
        return categorias.filter((categoria) => {
            if (selectedCategoriaId && categoria.id !== selectedCategoriaId) return false;
            const query = normalizeSearch(searchQuery);
            if (!query) return true;
            return normalizeSearch(`${categoria.name} ${categoria.id}`).includes(query);
        });
    }, [categorias, searchQuery, selectedCategoriaId]);

    // Renderizado con Enfoque en Simetría y Centrado Absoluto
    const renderItemsGrid = (items: any[], type: "linea" | "categoria") => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-48">
                    <div className="text-xs text-neutral-400 tracking-widest uppercase animate-pulse">Cargando...</div>
                </div>
            );
        }

        if (items.length === 0) {
            return (
                <div className="flex justify-center items-center h-32">
                    <div className="text-sm text-neutral-400 font-light">No se encontraron resultados</div>
                </div>
            );
        }

        return (
            <div className="grid w-full grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-5 sm:gap-y-10 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9">
                {items.map((item) => {
                    const img = item.imagenPrincipal;
                    const name = type === "linea" ? item.nombre : item.name;

                    return (
                        <Link
                            key={item.id}
                            href={
                                type === "linea"
                                    ? `/products?line=${item.id}`
                                    : `/products?category=${item.id}`
                            }
                            className="group flex w-full flex-col items-center cursor-pointer select-none"
                        >
                            <div className="mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.35rem] p-1.5 sm:rounded-[1.5rem] sm:p-2">
                                {img ? (
                                    <img
                                        src={img}
                                        alt={name}
                                        className="h-full w-full rounded-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-neutral-100 bg-neutral-50 text-[10px] tracking-wider text-neutral-400 sm:h-20 sm:w-20">
                                        N/A
                                    </div>
                                )}
                            </div>

                            <div className="flex min-h-[2.75rem] w-full items-start justify-center px-1 sm:min-h-[3rem]">
                                <span className="line-clamp-2 text-center text-sm font-bold leading-snug tracking-normal text-neutral-800 transition-colors group-hover:text-black sm:text-base">
                                    {name}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="container py-1 antialiased">
            <div className="border-t border-black/12 pt-8 md:pt-10">
                <section className="space-y-8 md:space-y-10">
                    <div className="text-center">
                        <h2 className="font-headline text-[1.65rem] font-semibold uppercase tracking-[0.03em] text-neutral-950 sm:text-[2rem] md:text-[2.15rem]">
                            Compra por Categorías
                        </h2>
                    </div>
                    {renderItemsGrid(filteredCategorias, "categoria")}
                </section>
            </div>
        </div>
    );
}