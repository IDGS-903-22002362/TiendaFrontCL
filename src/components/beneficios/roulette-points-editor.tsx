"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PremioFormValue } from "@/components/beneficios/minigame-prize-editor";

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

function RoulettePreview({ labels }: { labels: string[] }) {
    const size = 220;
    const center = size / 2;
    const radius = 86;
    const count = Math.max(labels.length, 1);
    const slices = labels.map((label, index) => {
        const start = (index / count) * Math.PI * 2 - Math.PI / 2;
        const end = ((index + 1) / count) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x0 = center + radius * Math.cos(start);
        const y0 = center + radius * Math.sin(start);
        const x1 = center + radius * Math.cos(end);
        const y1 = center + radius * Math.sin(end);
        const mid = (start + end) / 2;
        const fill = SLICE_COLORS[index % SLICE_COLORS.length];
        return {
            d: `M ${center} ${center} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`,
            fill,
            label,
            x: center + radius * 0.64 * Math.cos(mid),
            y: center + radius * 0.64 * Math.sin(mid),
            dark: LIGHT_FILLS.has(fill),
        };
    });

    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            className="mx-auto h-52 w-52"
            role="img"
            aria-label={`Vista previa: ${labels.join(", ")}`}
        >
            <circle cx={center} cy={center + 3} r={radius + 14} fill="rgba(0,0,0,0.18)" />
            <circle cx={center} cy={center} r={radius + 12} fill="#0B0B0B" />
            <circle cx={center} cy={center} r={radius + 6} fill="#F3C24B" />
            {slices.map((slice) => (
                <path key={`${slice.label}-${slice.x}`} d={slice.d} fill={slice.fill} stroke="#F7F4EA" strokeWidth="2" />
            ))}
            {slices.map((slice) => (
                <text
                    key={`${slice.label}-text-${slice.y}`}
                    x={slice.x}
                    y={slice.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={slice.dark ? "#0B0B0B" : "#FFFFFF"}
                    fontSize={slice.label.length > 4 ? 9 : 12}
                    fontWeight="700"
                >
                    {slice.label}
                </text>
            ))}
            <circle cx={center} cy={center} r="16" fill="#006A54" stroke="#F3C24B" strokeWidth="4" />
            <polygon points={`${center - 8},18 ${center + 8},18 ${center},34`} fill="#F3C24B" stroke="#0B0B0B" strokeWidth="1.5" />
        </svg>
    );
}

type RoulettePointsEditorProps = {
    premios: PremioFormValue[];
    especialNombre: string;
    onChange: (premios: PremioFormValue[]) => void;
    disabled?: boolean;
    showWheelPreview?: boolean;
};

export function RoulettePointsEditor({
    premios,
    especialNombre,
    onChange,
    disabled,
    showWheelPreview = false,
}: RoulettePointsEditorProps) {
    const labels = [
        ...premios.map((premio) => premio.valor.trim() || "—"),
        ...(especialNombre.trim() ? ["ESP"] : []),
    ];

    const update = (key: string, patch: Partial<PremioFormValue>) => {
        onChange(
            premios.map((premio) =>
                premio.key === key ? { ...premio, ...patch } : premio,
            ),
        );
    };

    return (
        <div className="space-y-3 rounded-md border p-3">
            <div>
                <p className="text-sm font-medium">Premios de puntos</p>
                <p className="text-xs text-muted-foreground">
                    Cada número es el premio de puntos que se acredita si sale. Puedes cambiarlos; no tienen que ser de 10 en 10. El peso solo afecta la probabilidad.
                </p>
            </div>
            {showWheelPreview ? <RoulettePreview labels={labels} /> : null}
            <div className="grid gap-2 sm:grid-cols-2">
                {premios.map((premio, index) => (
                    <div key={premio.key} className="grid grid-cols-[1fr_72px] gap-2">
                        <div className="space-y-1">
                            <Label>{`Premio ${index + 1}`}</Label>
                            <Input
                                inputMode="numeric"
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
                            <Label>Peso</Label>
                            <Input
                                inputMode="numeric"
                                value={premio.weight}
                                aria-label={`Peso del premio ${index + 1}`}
                                onChange={(event) =>
                                    update(premio.key, {
                                        weight: event.target.value.replace(/\D/g, ""),
                                    })
                                }
                                disabled={disabled}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
