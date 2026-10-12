"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    PRIZE_TYPES,
    PRIZE_TYPE_LABELS,
    type PrizeType,
} from "@/lib/api/beneficios";
import type { PremioFormValue } from "@/components/beneficios/minigame-prize-editor";

export type SpecialPrizeForm = {
    id?: string;
    nombre: string;
    descripcion: string;
    tipo: PrizeType;
    stock: string;
    weight: string;
    imagenUrl: string;
};

type OddsPrize = {
    weight: string;
    stock: string;
};

export function emptySpecialPrize(): SpecialPrizeForm {
    return {
        nombre: "",
        descripcion: "",
        tipo: "physical",
        stock: "1",
        weight: "1",
        imagenUrl: "",
    };
}

function parseWeight(value: string): number {
    const weight = Number.parseInt(value || "1", 10);
    return Number.isInteger(weight) && weight >= 1 ? weight : 0;
}

function staysInDraw(stock: string): boolean {
    if (!stock.trim()) return true;
    const value = Number.parseInt(stock, 10);
    return Number.isInteger(value) && value > 0;
}

export function estimateSpecialOdds(
    prizes: OddsPrize[],
    special: OddsPrize,
): { exhausted: boolean; weight: number; total: number; percentLabel: string } {
    const specialWeight = parseWeight(special.weight);
    if (!staysInDraw(special.stock) || specialWeight < 1) {
        return {
            exhausted: !staysInDraw(special.stock),
            weight: 0,
            total: 0,
            percentLabel: "0%",
        };
    }

    const others = prizes.reduce((sum, prize) => {
        if (!staysInDraw(prize.stock)) return sum;
        return sum + parseWeight(prize.weight);
    }, 0);
    const total = others + specialWeight;
    const percent = (specialWeight / total) * 100;
    const rounded = Math.round(percent * 100) / 100;

    return {
        exhausted: false,
        weight: specialWeight,
        total,
        percentLabel: `~${rounded.toLocaleString("es-MX", {
            maximumFractionDigits: 2,
        })}%`,
    };
}

type RouletteSpecialPrizeProps = {
    premio: SpecialPrizeForm;
    otros: PremioFormValue[];
    onChange: (premio: SpecialPrizeForm) => void;
    disabled?: boolean;
};

export function RouletteSpecialPrize({
    premio,
    otros,
    onChange,
    disabled,
}: RouletteSpecialPrizeProps) {
    const odds = premio.nombre.trim()
        ? estimateSpecialOdds(otros, premio)
        : null;
    const patch = (next: Partial<SpecialPrizeForm>) =>
        onChange({ ...premio, ...next });

    return (
        <div className="space-y-3 rounded-md border p-3">
            <div>
                <p className="text-sm font-medium">Premio especial</p>
                <p className="text-xs text-muted-foreground">
                    El aspecto visual no cambia la probabilidad. La probabilidad la define el peso, y el máximo de ganadores indica cuántas personas pueden ganarlo durante toda la campaña. Quien lo gane queda registrado con su uid, correo y teléfono.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                    <Label>Nombre</Label>
                    <Input
                        value={premio.nombre}
                        placeholder="2 boletos para León vs América"
                        onChange={(event) => patch({ nombre: event.target.value })}
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label>Descripción</Label>
                    <Textarea
                        value={premio.descripcion}
                        placeholder="El ganador recibe dos accesos..."
                        onChange={(event) =>
                            patch({ descripcion: event.target.value })
                        }
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                        value={premio.tipo}
                        onValueChange={(value) =>
                            patch({ tipo: value as PrizeType })
                        }
                        disabled={disabled}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PRIZE_TYPES.filter((tipo) => tipo !== "points").map(
                                (tipo) => (
                                    <SelectItem key={tipo} value={tipo}>
                                        {PRIZE_TYPE_LABELS[tipo]}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Máximo de ganadores</Label>
                    <Input
                        inputMode="numeric"
                        value={premio.stock}
                        onChange={(event) =>
                            patch({
                                stock: event.target.value.replace(/\D/g, ""),
                            })
                        }
                        disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                        Máximo de ganadores indica cuántas veces puede salir
                        este premio durante toda la campaña. La cantidad que
                        recibe cada ganador va en el nombre o la descripción.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label>Peso</Label>
                    <Input
                        inputMode="numeric"
                        value={premio.weight}
                        onChange={(event) =>
                            patch({
                                weight: event.target.value.replace(/\D/g, ""),
                            })
                        }
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Probabilidad aproximada</Label>
                    <p className="text-sm font-medium">
                        {odds
                            ? odds.exhausted
                                ? "Agotado: no entra al sorteo"
                                : `${odds.weight} / ${odds.total} · ${odds.percentLabel}`
                            : "—"}
                    </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label>Imagen (opcional)</Label>
                    <Input
                        value={premio.imagenUrl}
                        placeholder="https://..."
                        onChange={(event) =>
                            patch({ imagenUrl: event.target.value })
                        }
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}
