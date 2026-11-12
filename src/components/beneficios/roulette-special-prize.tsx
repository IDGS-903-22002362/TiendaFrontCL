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
import { sanitizePercentInput } from "@/lib/minigame-probability";

export type SpecialPrizeForm = {
    id?: string;
    nombre: string;
    descripcion: string;
    terminos: string;
    validoDesde: string;
    caducaEl: string;
    tipo: PrizeType;
    stock: string;
    /** Probabilidad en porcentaje, como texto del input (p. ej. "0.3"). */
    probabilidad: string;
    imagenUrl: string;
};

export function emptySpecialPrize(): SpecialPrizeForm {
    return {
        nombre: "",
        descripcion: "",
        terminos: "",
        validoDesde: "",
        caducaEl: "",
        tipo: "physical",
        stock: "1",
        probabilidad: "0.3",
        imagenUrl: "",
    };
}

type RouletteSpecialPrizeProps = {
    premio: SpecialPrizeForm;
    onChange: (premio: SpecialPrizeForm) => void;
    disabled?: boolean;
};

export function RouletteSpecialPrize({
    premio,
    onChange,
    disabled,
}: RouletteSpecialPrizeProps) {
    const agotado =
        premio.stock.trim() !== "" && Number.parseInt(premio.stock, 10) === 0;
    const patch = (next: Partial<SpecialPrizeForm>) =>
        onChange({ ...premio, ...next });

    return (
        <div className="space-y-3 rounded-md border p-3">
            <div>
                <p className="text-sm font-medium">Premio especial</p>
                <p className="text-xs text-muted-foreground">
                    El aspecto visual no cambia la probabilidad. La probabilidad es el porcentaje de tiradas en que sale este premio y cuenta en el total de 100%. El máximo de ganadores indica cuántas personas pueden ganarlo durante toda la campaña; al agotarse deja de salir y su porcentaje se reparte proporcionalmente entre los demás premios. Quien lo gane queda registrado con su uid, correo y teléfono.
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
                    <Label htmlFor="premioEspecialProbabilidad">Probabilidad (%)</Label>
                    <div className="relative">
                        <Input
                            id="premioEspecialProbabilidad"
                            inputMode="decimal"
                            placeholder="0.3"
                            className="pr-7"
                            value={premio.probabilidad}
                            onChange={(event) =>
                                patch({
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
                    <p className="text-xs text-muted-foreground">
                        {agotado
                            ? "Agotado: no entra al sorteo, aunque conserva su porcentaje configurado."
                            : premio.nombre.trim() && premio.probabilidad
                              ? `Sale en ${premio.probabilidad}% de las tiradas mientras queden ganadores disponibles.`
                              : "Escribe el nombre del premio para habilitarlo."}
                    </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label>Términos y condiciones</Label>
                    <Textarea
                        value={premio.terminos}
                        placeholder="Dónde se canjea, qué incluye y qué debe presentar el ganador."
                        onChange={(event) =>
                            patch({ terminos: event.target.value })
                        }
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Válido desde</Label>
                    <Input
                        type="date"
                        value={premio.validoDesde}
                        onChange={(event) =>
                            patch({ validoDesde: event.target.value })
                        }
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Caduca el</Label>
                    <Input
                        type="date"
                        value={premio.caducaEl}
                        onChange={(event) =>
                            patch({ caducaEl: event.target.value })
                        }
                        disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                        Elige el día. La caducidad cubre todo ese día. Si lo
                        dejas vacío, la app usa el fin de la campaña.
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
