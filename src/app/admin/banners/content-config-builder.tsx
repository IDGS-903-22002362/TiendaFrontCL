"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Category, Linea, Talla, Product } from "@/lib/types";
import { EntityPicker } from "@/components/admin/entity-picker";
import { fetchProducts } from "@/lib/api/storefront";
import { BannerContentConfig } from "@/lib/ai/types";

type OfertaBannerOption = {
    id: string;
    nombre?: string;
    titulo?: string;
    descripcion?: string;
    badgeTexto?: string;
    estado?: boolean;
    activa?: boolean;
    tipoDescuento?: "porcentaje" | "monto" | "precio_fijo";
    valor?: number;
    valorDescuento?: number;
    aplicaA?: "productos" | "categorias" | "lineas" | "todo";

    productoIds?: string[];
    productIds?: string[];

    categoriaIds?: string[];
    categoryIds?: string[];

    lineaIds?: string[];
    lineIds?: string[];

    tallaIds?: string[];
    sizeIds?: string[];
};

interface ContentConfigBuilderProps {
    value: BannerContentConfig;
    onChange: (config: BannerContentConfig) => void;
    categories: Category[];
    lineas: Linea[];
    tallas: Talla[];
    ofertas?: OfertaBannerOption[];
    isLoading?: boolean;
}

export function ContentConfigBuilder({
    value,
    onChange,
    categories,
    lineas,
    tallas,
    ofertas = [],
    isLoading,
}: ContentConfigBuilderProps) {
    const [productSearchQuery, setProductSearchQuery] = useState("");
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
        value.productIds || []
    );
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        fetchProducts().then(setProducts).catch(console.error);
    }, []);

    useEffect(() => {
    if (value.type !== "productos") {
        return;
    }

    onChange({ ...value, productIds: selectedProductIds });
}, [selectedProductIds, value.type]);

    const getIdsFromOferta = (
        oferta: OfertaBannerOption | undefined,
        keys: Array<keyof OfertaBannerOption>,
    ): string[] => {
        if (!oferta) {
            return [];
        }

        for (const key of keys) {
            const rawValue = oferta[key];

            if (Array.isArray(rawValue)) {
                return rawValue
                    .map((item) => String(item).trim())
                    .filter(Boolean);
            }

            if (typeof rawValue === "string" && rawValue.trim()) {
                return rawValue
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
            }
        }

        return [];
    };

    const handleOfertaChange = (ofertaId: string) => {
        const selectedOferta = ofertas.find((oferta) => oferta.id === ofertaId);

        const productIds = getIdsFromOferta(selectedOferta, [
            "productIds",
            "productoIds",
        ]);

        const categoryIds = getIdsFromOferta(selectedOferta, [
            "categoryIds",
            "categoriaIds",
        ]);

        const lineIds = getIdsFromOferta(selectedOferta, [
            "lineIds",
            "lineaIds",
        ]);

        const tallaIds = getIdsFromOferta(selectedOferta, [
            "sizeIds",
            "tallaIds",
        ]);

        const nextConfig: BannerContentConfig & Record<string, unknown> = {
            type: "oferta",
            limit: value.limit,
            sortBy: value.sortBy,
            sortOrder: value.sortOrder,
            ofertaId,
            aplicaA: selectedOferta?.aplicaA,
        };

        if (productIds.length > 0) {
            nextConfig.productIds = productIds;
            nextConfig.productoIds = productIds;
        }

        if (categoryIds.length > 0) {
            nextConfig.categoriaId = categoryIds[0];
            nextConfig.categoriaIds = categoryIds;
            nextConfig.categoryId = categoryIds[0];
            nextConfig.categoryIds = categoryIds;
        }

        if (lineIds.length > 0) {
            nextConfig.lineaId = lineIds[0];
            nextConfig.lineaIds = lineIds;
            nextConfig.lineId = lineIds[0];
            nextConfig.lineIds = lineIds;
        }

        if (tallaIds.length > 0) {
            nextConfig.tallaId = tallaIds[0];
            nextConfig.tallaIds = tallaIds;
            nextConfig.sizeId = tallaIds[0];
            nextConfig.sizeIds = tallaIds;
        }

        onChange(nextConfig);
    };

    const handleTypeChange = (type: string) => {
        const validTypes: BannerContentConfig["type"][] = [
            "categoria",
            "linea",
            "talla",
            "productos",
            "novedades",
            "mas_vendidos",
            "oferta",
        ];

        if (validTypes.includes(type as BannerContentConfig["type"])) {
            onChange({
                type: type as BannerContentConfig["type"],
                limit: value.limit,
                sortBy: value.sortBy,
                sortOrder: value.sortOrder,
            });
        }
    };

    const renderTypeSpecificFields = () => {
        switch (value.type) {
            case "categoria":
                return (
                    <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                            value={value.categoriaId}
                            onValueChange={(val) => onChange({ ...value, categoriaId: val })}
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );

            case "linea":
                return (
                    <div className="space-y-2">
                        <Label>Línea</Label>
                        <Select
                            value={value.lineaId}
                            onValueChange={(val) => onChange({ ...value, lineaId: val })}
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una línea" />
                            </SelectTrigger>
                            <SelectContent>
                                {lineas.map((linea) => (
                                    <SelectItem key={linea.id} value={linea.id}>
                                        {linea.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );

            case "talla":
                return (
                    <div className="space-y-2">
                        <Label>Talla</Label>
                        <Select
                            value={value.tallaId}
                            onValueChange={(val) => onChange({ ...value, tallaId: val })}
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una talla" />
                            </SelectTrigger>
                            <SelectContent>
                                {tallas.map((talla) => (
                                    <SelectItem key={talla.id} value={talla.id}>
                                        {talla.codigo || talla.descripcion}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );

            case "oferta":
                return (
                    <div className="space-y-2">
                        <Label>Oferta</Label>
                        <Select
                            value={value.ofertaId}
                            onValueChange={handleOfertaChange}
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una oferta activa" />
                            </SelectTrigger>
                            <SelectContent>
                                {ofertas.length === 0 ? (
                                    <SelectItem value="sin-ofertas" disabled>
                                        No hay ofertas activas
                                    </SelectItem>
                                ) : (
                                    ofertas
                                        .filter((oferta) => Boolean(oferta.id))
                                        .map((oferta) => {
                                            const descuento =
                                                oferta.valorDescuento ?? oferta.valor ?? null;

                                            const titulo =
                                                oferta.titulo ||
                                                oferta.nombre ||
                                                oferta.badgeTexto ||
                                                "Oferta";

                                            return (
                                                <SelectItem key={oferta.id} value={oferta.id}>
                                                    {descuento
                                                        ? `${titulo} · ${descuento}%`
                                                        : titulo}
                                                </SelectItem>
                                            );
                                        })
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                );

            case "productos":
                return (
                    <div className="space-y-2">
                        <Label>Productos específicos</Label>
                        <EntityPicker
                            label=""
                            selectLabel="Selecciona productos"
                            value={selectedProductIds.join(",")}
                            options={products.map(p => ({ id: p.id, label: p.name }))}
                            onValueChange={(val) => {
                                if (val && !selectedProductIds.includes(val)) {
                                    setSelectedProductIds([...selectedProductIds, val]);
                                }
                            }}
                            allowEmpty
                            disabled={isLoading}
                        />
                        <div className="text-sm text-muted-foreground">
                            Productos seleccionados: {selectedProductIds.length}
                        </div>
                        {selectedProductIds.map(id => (
                            <div key={id} className="flex items-center gap-2 text-sm">
                                <span>{products.find(p => p.id === id)?.name || id}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedProductIds(prev => prev.filter(pid => pid !== id))}
                                    className="text-destructive text-xs"
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Tipo de contenido</Label>
                <Select
                    value={value.type}
                    onValueChange={handleTypeChange}
                    disabled={isLoading}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona cómo mostrar productos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="categoria">Productos por categoría</SelectItem>
                        <SelectItem value="linea">Productos por línea</SelectItem>
                        <SelectItem value="talla">Productos por talla</SelectItem>
                        <SelectItem value="productos">Productos específicos</SelectItem>
                        <SelectItem value="novedades">Novedades (más recientes)</SelectItem>
                        <SelectItem value="mas_vendidos">Más vendidos</SelectItem>
                        <SelectItem value="oferta">Productos por oferta</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {renderTypeSpecificFields()}

        </div>
    );
}