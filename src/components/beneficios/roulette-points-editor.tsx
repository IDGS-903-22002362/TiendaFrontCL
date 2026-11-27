"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PremioFormValue } from "@/components/beneficios/minigame-prize-editor";
import { MAX_MINIJUEGO_PREMIOS } from "@/lib/api/beneficios";
import {
    addPointPrize,
    canAddPointPrize,
    createPointPrizeRow,
    isSpecialPrizeEnabled,
    pointPrizeLabel,
    pointPrizeRemovalNeedsConfirmation,
    removePointPrize,
    roulettePreviewSegments,
    wheelSliceColorIndexes,
    type RoulettePreviewSegment,
} from "@/lib/beneficios/minijuego-premios";
import { sanitizePercentInput } from "@/lib/minigame-probability";

const SLICE_COLORS = [
    "#006A54",
    "#F7F4EA",
    "#0E3D32",
    "#F3C24B",
    "#1B6B4A",
    "#FFFFFF",
    "#14352C",
    "#E7C56A",
    "#248066",
    "#F3E6C4",
    "#C9A227",
];

const LIGHT_FILLS = new Set([
    "#F7F4EA",
    "#FFFFFF",
    "#F3C24B",
    "#E7C56A",
    "#F3E6C4",
    "#C9A227",
]);

/** Con muchos sectores las etiquetas no caben: se ocultan (la leyenda accesible las conserva). */
function wheelLabelFontSize(count: number, label: string): number | null {
    if (count > 24) return null;
    if (count > 16) return 7;
    if (count > 8) return label.length > 3 ? 7 : 9;
    return label.length > 4 ? 9 : 12;
}

function describeSegments(segments: RoulettePreviewSegment[]): string {
    if (segments.length === 0) {
        return "Vista previa de la ruleta: ningún premio puede salir, no hay sectores.";
    }

    const nombres = segments
        .map((segment) =>
            segment.especial ? "premio especial" : `${segment.label} puntos`,
        )
        .join(", ");
    const sectores = segments.length === 1 ? "1 sector" : `${segments.length} sectores`;
    return `Vista previa de la ruleta con ${sectores}: ${nombres}.`;
}

function RoulettePreview({ segments }: { segments: RoulettePreviewSegment[] }) {
    const size = 220;
    const center = size / 2;
    const radius = 86;
    const count = segments.length;
    const colorIndexes = wheelSliceColorIndexes(count, SLICE_COLORS.length);
    const slices = segments.map((segment, index) => {
        const start = (index / count) * Math.PI * 2 - Math.PI / 2;
        const end = ((index + 1) / count) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x0 = center + radius * Math.cos(start);
        const y0 = center + radius * Math.sin(start);
        const x1 = center + radius * Math.cos(end);
        const y1 = center + radius * Math.sin(end);
        const mid = (start + end) / 2;
        const fill = SLICE_COLORS[colorIndexes[index]];
        return {
            key: segment.key,
            d: `M ${center} ${center} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`,
            fill,
            label: segment.label,
            // Con un solo sector la etiqueta va centrada arriba del eje.
            x: count === 1 ? center : center + radius * 0.64 * Math.cos(mid),
            y: count === 1 ? center - radius * 0.55 : center + radius * 0.64 * Math.sin(mid),
            dark: LIGHT_FILLS.has(fill),
        };
    });
    const strokeWidth = count > 24 ? 1 : 2;

    return (
        <figure className="space-y-2">
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="mx-auto h-52 w-52"
                role="img"
                aria-label={describeSegments(segments)}
            >
                <circle cx={center} cy={center + 3} r={radius + 14} fill="rgba(0,0,0,0.18)" />
                <circle cx={center} cy={center} r={radius + 12} fill="#0B0B0B" />
                <circle cx={center} cy={center} r={radius + 6} fill="#F3C24B" />
                {count === 0 ? (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="#E7E2D3"
                        stroke="#F7F4EA"
                        strokeWidth="2"
                        strokeDasharray="6 5"
                    />
                ) : count === 1 ? (
                    <circle
                        key={slices[0].key}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill={slices[0].fill}
                        stroke="#F7F4EA"
                        strokeWidth="2"
                    />
                ) : (
                    slices.map((slice) => (
                        <path
                            key={slice.key}
                            d={slice.d}
                            fill={slice.fill}
                            stroke="#F7F4EA"
                            strokeWidth={strokeWidth}
                        />
                    ))
                )}
                {slices.map((slice) => {
                    const fontSize = wheelLabelFontSize(count, slice.label);
                    if (fontSize == null) {
                        return null;
                    }

                    return (
                        <text
                            key={`${slice.key}-label`}
                            x={slice.x}
                            y={slice.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={slice.dark ? "#0B0B0B" : "#FFFFFF"}
                            fontSize={fontSize}
                            fontWeight="700"
                        >
                            {slice.label}
                        </text>
                    );
                })}
                <circle cx={center} cy={center} r="16" fill="#006A54" stroke="#F3C24B" strokeWidth="4" />
                <polygon points={`${center - 8},18 ${center + 8},18 ${center},34`} fill="#F3C24B" stroke="#0B0B0B" strokeWidth="1.5" />
            </svg>
            {count === 0 ? (
                <p className="text-center text-xs font-medium text-foreground/80">
                    Ningún premio puede salir (todos tienen 0 % o están agotados): la ruleta se queda sin sectores.
                </p>
            ) : null}
            <figcaption className="text-center text-xs text-muted-foreground">
                Los sectores se ven iguales; la probabilidad real la decide el servidor. Los premios con 0 % o agotados no aparecen.
                {count > 24 ? " Con tantos sectores se ocultan los números." : ""}
            </figcaption>
        </figure>
    );
}

type RoulettePointsEditorProps = {
    premios: PremioFormValue[];
    especialNombre: string;
    /** Probabilidad (texto del input) del premio especial, para la vista previa. */
    especialProbabilidad?: string;
    /**
     * Ganadores que le quedan al premio especial (specialPrizeRemainingStock),
     * no el máximo; 0 = agotado.
     */
    especialStock?: string;
    onChange: (premios: PremioFormValue[]) => void;
    disabled?: boolean;
    showWheelPreview?: boolean;
    /** Tope de premios del minijuego, incluido el especial. */
    maxPremios?: number;
};

type PendingRemoval = {
    key: string;
    etiqueta: string;
    nombre: string;
};

function pointsInputId(key: string): string {
    return `premio-puntos-${key}`;
}

export function RoulettePointsEditor({
    premios,
    especialNombre,
    especialProbabilidad = "",
    especialStock = "",
    onChange,
    disabled,
    showWheelPreview = false,
    maxPremios = MAX_MINIJUEGO_PREMIOS,
}: RoulettePointsEditorProps) {
    // El destino se conserva al cerrar para que el texto no cambie durante la animación.
    const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
    const [isRemovalDialogOpen, setIsRemovalDialogOpen] = useState(false);
    const addButtonRef = useRef<HTMLButtonElement>(null);
    /** Qué enfocar después de agregar o quitar una fila (ya renderizada). */
    const focusAfterRenderRef = useRef<{ kind: "row"; key: string } | { kind: "add" } | null>(null);
    const removedFromDialogRef = useRef(false);

    const especial = {
        nombre: especialNombre,
        probabilidad: especialProbabilidad,
        stock: especialStock,
    };
    const segments = roulettePreviewSegments(premios, especial);
    const canAdd = canAddPointPrize(
        premios.length,
        isSpecialPrizeEnabled(especial),
        maxPremios,
    );

    useEffect(() => {
        const target = focusAfterRenderRef.current;
        if (!target) {
            return;
        }

        focusAfterRenderRef.current = null;
        if (target.kind === "row") {
            document.getElementById(pointsInputId(target.key))?.focus();
        } else {
            addButtonRef.current?.focus();
        }
    }, [premios]);

    const update = (key: string, patch: Partial<PremioFormValue>) => {
        onChange(
            premios.map((premio) =>
                premio.key === key ? { ...premio, ...patch } : premio,
            ),
        );
    };

    const addPremio = () => {
        if (!canAdd) {
            return;
        }

        const row = createPointPrizeRow();
        focusAfterRenderRef.current = { kind: "row", key: row.key };
        onChange(addPointPrize(premios, row));
    };

    const requestRemove = (premio: PremioFormValue, index: number) => {
        if (pointPrizeRemovalNeedsConfirmation(premio)) {
            setPendingRemoval({
                key: premio.key,
                etiqueta: pointPrizeLabel(index),
                nombre: premio.nombre.trim(),
            });
            setIsRemovalDialogOpen(true);
            return;
        }

        focusAfterRenderRef.current = { kind: "add" };
        onChange(removePointPrize(premios, premio.key));
    };

    const confirmRemove = () => {
        setIsRemovalDialogOpen(false);
        if (!pendingRemoval) {
            return;
        }

        removedFromDialogRef.current = true;
        onChange(removePointPrize(premios, pendingRemoval.key));
    };

    return (
        <div className="space-y-3 rounded-md border p-3">
            <div>
                <p className="text-sm font-medium">Premios de puntos</p>
                <p className="text-xs text-muted-foreground">
                    Cada número es el premio de puntos que se acredita si sale. Puedes agregar, eliminar y cambiar premios; no tienen que ser de 10 en 10. La probabilidad es el porcentaje de tiradas en que sale ese premio; acepta hasta 3 decimales (por ejemplo 0.3) y, junto con el premio especial, debe sumar 100%. Con 0 % el premio queda guardado pero no sale ni aparece en la ruleta.
                </p>
            </div>
            {showWheelPreview ? <RoulettePreview segments={segments} /> : null}
            {premios.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Todavía no hay premios de puntos. Usa «Agregar premio» para crear uno.
                </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
                {premios.map((premio, index) => (
                    <div key={premio.key} className="grid grid-cols-[1fr_112px_auto] items-end gap-2">
                        <div className="space-y-1">
                            <Label htmlFor={pointsInputId(premio.key)}>{pointPrizeLabel(index)}</Label>
                            <Input
                                id={pointsInputId(premio.key)}
                                inputMode="numeric"
                                placeholder="Puntos"
                                value={premio.valor}
                                aria-label={`Puntos del premio ${index + 1}`}
                                onChange={(event) => {
                                    const valor = event.target.value.replace(/\D/g, "");
                                    update(premio.key, {
                                        valor,
                                        nombre: valor ? `${Number.parseInt(valor, 10)} puntos` : "",
                                        tipo: "points",
                                        stock: "",
                                    });
                                }}
                                disabled={disabled}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Probabilidad (%)</Label>
                            <div className="relative">
                                <Input
                                    inputMode="decimal"
                                    placeholder="0.000"
                                    className="pr-7"
                                    value={premio.probabilidad}
                                    aria-label={`Probabilidad en porcentaje del premio ${index + 1}`}
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
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar premio ${index + 1}`}
                            title={`Eliminar premio ${index + 1}`}
                            onClick={() => requestRemove(premio, index)}
                            disabled={disabled}
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button
                    ref={addButtonRef}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPremio}
                    disabled={disabled || !canAdd}
                >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Agregar premio
                </Button>
                <p className="text-xs text-muted-foreground">
                    {canAdd
                        ? `Hasta ${maxPremios} premios en total, incluido el especial. Los nuevos empiezan con 0 %.`
                        : `Llegaste al máximo de ${maxPremios} premios, incluido el especial.`}
                </p>
            </div>

            <AlertDialog
                open={isRemovalDialogOpen}
                onOpenChange={setIsRemovalDialogOpen}
            >
                <AlertDialogContent
                    onCloseAutoFocus={(event) => {
                        // La fila ya no existe: el foco pasa a «Agregar premio».
                        if (removedFromDialogRef.current) {
                            removedFromDialogRef.current = false;
                            event.preventDefault();
                            addButtonRef.current?.focus();
                        }
                    }}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingRemoval ? `¿Eliminar ${pendingRemoval.etiqueta}?` : "¿Eliminar premio?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingRemoval?.nombre ? `«${pendingRemoval.nombre}» ya` : "Este premio ya"} está guardado. Al guardar el minijuego se quitará de la ruleta y se archivará; las jugadas y los puntos que ya se otorgaron no cambian. Si cierras el formulario sin guardar, se conserva.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={confirmRemove}
                        >
                            Eliminar premio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
