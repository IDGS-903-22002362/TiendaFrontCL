"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { GanadorPremioEspecial } from "@/lib/api/beneficios";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type SpecialWinnersPanelProps = {
    ganadores: GanadorPremioEspecial[];
    beneficioId?: string;
    beneficioTitulo?: string;
    isLoading?: boolean;
};

function formatWhen(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return format(date, "dd MMM yyyy, HH:mm", { locale: es });
}

export function SpecialWinnersPanel({
    ganadores,
    beneficioId,
    beneficioTitulo,
    isLoading,
}: SpecialWinnersPanelProps) {
    const rows = beneficioId
        ? ganadores.filter((ganador) => ganador.beneficioId === beneficioId)
        : ganadores;

    return (
        <div className="rounded-md border bg-card">
            <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Ganadores del premio especial</p>
                <p className="text-xs text-muted-foreground">
                    {beneficioTitulo
                        ? `Mostrando ${beneficioTitulo}. `
                        : "Mostrando todas las ruletas. "}
                    Aquí quedan el uid, el correo y el teléfono de quien gana el
                    premio especial.
                </p>
            </div>
            <div className="max-h-80 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Premio</TableHead>
                            <TableHead>Campaña</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>UID</TableHead>
                            <TableHead>Correo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Fecha</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                                    Cargando ganadores...
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                                    Todavía nadie ha ganado el premio especial.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((ganador) => (
                                <TableRow key={ganador.id}>
                                    <TableCell className="font-medium">
                                        {ganador.premioNombre || "Premio especial"}
                                    </TableCell>
                                    <TableCell>{ganador.beneficioTitulo || "—"}</TableCell>
                                    <TableCell>{ganador.nombre || "—"}</TableCell>
                                    <TableCell className="max-w-[220px] break-all font-mono text-xs">
                                        {ganador.uid || "—"}
                                    </TableCell>
                                    <TableCell>{ganador.email || "Sin correo"}</TableCell>
                                    <TableCell>{ganador.telefono || "Sin teléfono"}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {formatWhen(ganador.createdAt)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
