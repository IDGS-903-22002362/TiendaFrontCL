"use client";

import type { GanadoresEspecialAdmin } from "@/lib/api/beneficios";

type RouletteWinnersSectionProps = {
    premioNombre: string;
    maxGanadores: string;
    data: GanadoresEspecialAdmin | null;
    isLoading?: boolean;
    saved: boolean;
};

export function RouletteWinnersSection({
    premioNombre,
    maxGanadores,
    data,
    isLoading,
    saved,
}: RouletteWinnersSectionProps) {
    const total = data?.totalGanadores ?? 0;
    const maximo = data?.maxGanadores ?? (maxGanadores.trim() ? maxGanadores : "—");
    const premio = data?.premio || premioNombre.trim() || "Premio especial";

    return (
        <details className="rounded-md border" open={total > 0}>
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                Ver ganadores ({total}/{String(maximo)})
            </summary>
            <div className="space-y-3 border-t px-3 py-3">
                <div className="text-sm">
                    <p>
                        Premio especial: <span className="font-medium">{premio}</span>
                    </p>
                    <p className="text-muted-foreground">
                        Ganadores: {total} / {String(maximo)}
                    </p>
                </div>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando ganadores...</p>
                ) : !saved ? (
                    <p className="text-sm text-muted-foreground">
                        Guarda la ruleta para consultar a quienes ganen el premio especial.
                    </p>
                ) : (data?.ganadores.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Todavía nadie ha ganado el premio especial.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {data?.ganadores.map((ganador) => (
                            <div key={ganador.uid} className="rounded-md border px-3 py-2 text-sm">
                                <p className="text-xs text-muted-foreground">UID</p>
                                <p className="break-all font-mono text-xs">{ganador.uid || "—"}</p>
                                <p className="mt-2 text-xs text-muted-foreground">Correo</p>
                                <p>{ganador.email || "Sin correo"}</p>
                                <p className="mt-2 text-xs text-muted-foreground">Teléfono</p>
                                <p>{ganador.telefono || "Sin teléfono"}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </details>
    );
}
