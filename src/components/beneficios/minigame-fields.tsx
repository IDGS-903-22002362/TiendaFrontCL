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
import {
    MINIJUEGO_TIPOS,
    MINIJUEGO_TIPO_LABELS,
    type MinijuegoTipo,
} from "@/lib/api/beneficios";

type MinigameFieldsProps = {
    tipo: MinijuegoTipo;
    fechaInicio: string;
    fechaFin: string;
    intentosPorUsuario: string;
    onTipoChange: (value: MinijuegoTipo) => void;
    onFechaInicioChange: (value: string) => void;
    onFechaFinChange: (value: string) => void;
    onIntentosChange: (value: string) => void;
    disabled?: boolean;
};

export function MinigameFields({
    tipo,
    fechaInicio,
    fechaFin,
    intentosPorUsuario,
    onTipoChange,
    onFechaInicioChange,
    onFechaFinChange,
    onIntentosChange,
    disabled,
}: MinigameFieldsProps) {
    return (
        <div className="space-y-4 rounded-md border p-4">
            <div>
                <p className="text-sm font-medium">Configuración del minijuego</p>
                <p className="text-xs text-muted-foreground">
                    La portada se configura abajo. La animación del juego no usa ese archivo.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="minijuegoTipo">Tipo de minijuego</Label>
                <Select
                    value={tipo}
                    onValueChange={(value) => onTipoChange(value as MinijuegoTipo)}
                    disabled={disabled}
                >
                    <SelectTrigger id="minijuegoTipo">
                        <SelectValue placeholder="Selecciona el juego" />
                    </SelectTrigger>
                    <SelectContent>
                        {MINIJUEGO_TIPOS.map((item) => (
                            <SelectItem key={item} value={item}>
                                {MINIJUEGO_TIPO_LABELS[item]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="fechaInicio">Inicio</Label>
                    <Input
                        id="fechaInicio"
                        type="datetime-local"
                        value={fechaInicio}
                        onChange={(event) => onFechaInicioChange(event.target.value)}
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fechaFin">Fin</Label>
                    <Input
                        id="fechaFin"
                        type="datetime-local"
                        value={fechaFin}
                        onChange={(event) => onFechaFinChange(event.target.value)}
                        disabled={disabled}
                    />
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
                Las fechas son opcionales. Si las dejas vacías, el minijuego no tiene vigencia.
            </p>

            <div className="space-y-2">
                <Label htmlFor="intentosPorUsuario">Intentos por usuario</Label>
                <Input
                    id="intentosPorUsuario"
                    inputMode="numeric"
                    value={intentosPorUsuario}
                    onChange={(event) =>
                        onIntentosChange(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
