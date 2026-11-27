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
    MAX_MINIJUEGO_PREMIOS,
    PRIZE_TYPES,
    PRIZE_TYPE_LABELS,
    type PrizeType,
} from "@/lib/api/beneficios";
import { sanitizePercentInput } from "@/lib/minigame-probability";

export type PremioFormValue = {
    key: string;
    id?: string;
    nombre: string;
    tipo: PrizeType;
    valor: string;
    stock: string;
    /** Probabilidad en porcentaje, como texto del input (p. ej. "0.3"). */
    probabilidad: string;
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
// Suman 100 %. Al habilitar un premio especial hay que restarle su porcentaje
// a alguno de estos; el indicador de total lo señala.
const ROULETTE_POINT_PROBABILITIES = ["30", "25", "15", "10", "7", "5", "3", "2", "1.5", "1.5"];

export function defaultRoulettePointPrizes(): PremioFormValue[] {
    return ROULETTE_POINT_VALUES.map((valor, index) => ({
        key: `puntos-${valor}`,
        nombre: `${valor} puntos`,
        tipo: "points",
        valor: String(valor),
        stock: "",
        probabilidad: ROULETTE_POINT_PROBABILITIES[index],
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
        probabilidad: "",
    };
}

export function MinigamePrizeEditor({
    premios,
    onChange,
    disabled,
    maxCount = MAX_MINIJUEGO_PREMIOS,
    title = "Premios",
    hint = "El servidor sortea con la probabilidad de cada premio. La app solo recibe el resultado.",
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
                                        <Label>Probabilidad (%)</Label>
                                        <div className="relative">
                                            <Input
                                                inputMode="decimal"
                                                placeholder="0.000"
                                                className="pr-8"
                                                value={premio.probabilidad}
                                                onChange={(event) =>
                                                    update(premio.key, {
                                                        probabilidad: sanitizePercentInput(event.target.value),
                                                    })
                                                }
                                                disabled={disabled}
                                            />
                                            <span
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                                            >
                                                %
                                            </span>
                                        </div>
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
