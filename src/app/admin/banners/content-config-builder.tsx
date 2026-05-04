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

interface ContentConfigBuilderProps {
    value: BannerContentConfig;
    onChange: (config: BannerContentConfig) => void;
    categories: Category[];
    lineas: Linea[];
    tallas: Talla[];
    isLoading?: boolean;
}

export function ContentConfigBuilder({
    value,
    onChange,
    categories,
    lineas,
    tallas,
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
        onChange({ ...value, productIds: selectedProductIds });
    }, [selectedProductIds, value.type]);

    const handleTypeChange = (type: string) => {
        const validTypes: BannerContentConfig["type"][] = [
            "categoria", "linea", "talla", "productos", "novedades", "mas_vendidos"
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
                    </SelectContent>
                </Select>
            </div>

            {renderTypeSpecificFields()}

        </div>
    );
}