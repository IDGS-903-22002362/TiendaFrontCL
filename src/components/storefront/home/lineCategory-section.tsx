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

export default function LineaCategorySection() {
    const [lineas, setLineas] = useState<Linea[]>([]);
    const [categorias, setCategorias] = useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLineaId, setSelectedLineaId] = useState<string | null>(null);
    const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const loadLineas = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await lineasApi.getAll();
            setLineas(data);
            setSelectedLineaId((current) =>
                current && !data.some((linea) => linea.id === current) ? "" : current,
            );
        } catch (error) {
            toast({
                variant: "destructive",
                title: "No se pudieron cargar las líneas",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

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
        loadLineas();
        loadCategorias();
    }, [loadLineas, loadCategorias]);

    const filteredLineas = useMemo(() => {
        return lineas.filter((linea) => {
            if (selectedLineaId && linea.id !== selectedLineaId) return false;
            const query = normalizeSearch(searchQuery);
            if (!query) return true;
            return normalizeSearch(`${linea.nombre} ${linea.codigo}`).includes(query);
        });
    }, [lineas, searchQuery, selectedLineaId]);

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
            /* Solución al vacío: flex-wrap + justify-center asegura que si faltan elementos en la fila, queden centrados idéntico a Nike */
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-10 max-w-6xl mx-auto">
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
                            className="group flex flex-col items-center cursor-pointer select-none w-[110px] sm:w-[130px]"
                        >
                            {/* Forzamos un tamaño máximo simétrico para los contenedores de imagen */}
                            <div className="w-full aspect-square flex items-center justify-center p-2 mb-2 overflow-hidden rounded-2xl">
                                {img ? (
                                    <img
                                        src={img}
                                        alt={name}
                                        className="w-full h-full object-cover rounded-full transition-transform duration-300 ease-out group-hover:scale-105"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-[9px] text-neutral-400 tracking-wider">
                                        s N/A
                                    </div>
                                )}
                            </div>

                            {/* Contenedor de texto con altura fija mínima para que ninguna descripción rompa la alineación horizontal */}
                            <div className="h-10 flex items-start justify-center w-full">
                                <span className="text-xs font-bold text-neutral-800 leading-snug tracking-normal group-hover:text-black transition-colors line-clamp-2 px-0.5">
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
        <div className=" mx-auto px-6 py-1 space-y-20 min-h-screen antialiased">

            {/* Sección de Líneas */}
            <section className="space-y-8">
                {renderItemsGrid(filteredLineas, "linea")}
            </section>

            {/* Sección de Categorías */}
            <section className="space-y-8">
                <div className="text-center">
                    <h2 className="text-lg sm:text-xl font-bold tracking-wider text-neutral-950 uppercase">
                        Compra por Categorías
                    </h2>
                </div>
                {renderItemsGrid(filteredCategorias, "categoria")}
            </section>
        </div>
    );
}