"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    PRIZE_TYPES,
    PRIZE_TYPE_LABELS,
    type PrizeType,
} from "@/lib/api/beneficios";

export type PremioFormValue = {
    key: string;
    id?: string;
    nombre: string;
    tipo: PrizeType;
    valor: string;
    stock: string;
    weight: string;
    descripcion?: string;
    imagenUrl?: string;
    especial?: boolean;
};

type MinigamePrizeEditorProps = {
    premios: PremioFormValue[];
    onChange: (premios: PremioFormValue[]) => void;
    disabled?: boolean;
    maxCount?: number;
    title?: string;
    hint?: string;
};

const ROULETTE_POINT_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const ROULETTE_POINT_WEIGHTS = [30, 25, 20, 15, 12, 10, 8, 6, 4, 3];

export function defaultRoulettePointPrizes(): PremioFormValue[] {
    return ROULETTE_POINT_VALUES.map((valor, index) => ({
        key: `puntos-${valor}`,
        nombre: `${valor} puntos`,
        tipo: "points",
        valor: String(valor),
        stock: "",
        weight: String(ROULETTE_POINT_WEIGHTS[index]),
    }));
}

export function isUnsavedDefaultPointSet(premios: PremioFormValue[]) {
    return (
        premios.length > 0 &&
        premios.every((premio) => premio.key.startsWith("puntos-") && !premio.id)
    );
}

export function createEmptyPremio(): PremioFormValue {
    return {
        key:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `premio-${Date.now()}`,
        nombre: "",
        tipo: "points",
        valor: "",
        stock: "",
        weight: "1",
    };
}

export function MinigamePrizeEditor({
    premios,
    onChange,
    disabled,
    maxCount = 12,
    title = "Premios",
    hint = "El servidor sortea con el peso. La app solo recibe el resultado.",
}: MinigamePrizeEditorProps) {
    const update = (key: string, patch: Partial<PremioFormValue>) => {
        onChange(
            premios.map((premio) =>
                premio.key === key ? { ...premio, ...patch } : premio,
            ),
        );
    };

    return (
        <div className="space-y-3">
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
            </div>

            {premios.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todavía no hay premios.</p>
            ) : (
                <div className="space-y-3">
                    {premios.map((premio) => (
                        <div key={premio.key} className="space-y-3 rounded-md border p-3">
                            <div className="flex items-start gap-2">
                                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Nombre</Label>
                                        <Input
                                            value={premio.nombre}
                                            onChange={(event) =>
                                                update(premio.key, { nombre: event.target.value })
                                            }
                                            disabled={disabled}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select
                                            value={premio.tipo}
                                            onValueChange={(value) =>
                                                update(premio.key, { tipo: value as PrizeType })
                                            }
                                            disabled={disabled}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRIZE_TYPES.map((tipo) => (
                                                    <SelectItem key={tipo} value={tipo}>
                                                        {PRIZE_TYPE_LABELS[tipo]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {premio.tipo !== "none" ? (
                                        <div className="space-y-2">
                                            <Label>
                                                {premio.tipo === "points" ? "Puntos" : "Valor"}
                                            </Label>
                                            <Input
                                                inputMode="numeric"
                                                value={premio.valor}
                                                onChange={(event) =>
                                                    update(premio.key, {
                                                        valor: event.target.value.replace(/\D/g, ""),
                                                    })
                                                }
                                                disabled={disabled}
                                            />
                                        </div>
                                    ) : null}
                                    <div className="space-y-2">
                                        <Label>Stock</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Vacío significa ilimitado.
                                        </p>
                                        <Input
                                            inputMode="numeric"
                                            placeholder="Ilimitado"
                                            value={premio.stock}
                                            onChange={(event) =>
                                                update(premio.key, {
                                                    stock: event.target.value.replace(/\D/g, ""),
                                                })
                                            }
                                            disabled={disabled}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Peso</Label>
                                        <Input
                                            inputMode="numeric"
                                            value={premio.weight}
                                            onChange={(event) =>
                                                update(premio.key, {
                                                    weight: event.target.value.replace(/\D/g, ""),
                                                })
                                            }
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="mt-7 text-destructive"
                                    onClick={() =>
                                        onChange(premios.filter((item) => item.key !== premio.key))
                                    }
                                    disabled={disabled}
                                    aria-label="Quitar premio"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Button
                type="button"
                variant="outline"
                onClick={() => onChange([...premios, createEmptyPremio()])}
                disabled={disabled || premios.length >= maxCount}
            >
                <Plus className="mr-2 h-4 w-4" /> Agregar premio
            </Button>
        </div>
    );
}
