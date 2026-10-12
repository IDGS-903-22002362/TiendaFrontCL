"use client";

import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { BeneficioTipo } from "@/lib/api/beneficios";

type BeneficioTypeSelectProps = {
    value: BeneficioTipo;
    onChange: (value: BeneficioTipo) => void;
    disabled?: boolean;
};

export function BeneficioTypeSelect({
    value,
    onChange,
    disabled,
}: BeneficioTypeSelectProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="beneficioTipo">Tipo de beneficio</Label>
            <Select
                value={value}
                onValueChange={(next) => onChange(next as BeneficioTipo)}
                disabled={disabled}
            >
                <SelectTrigger id="beneficioTipo">
                    <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="estandar">Beneficio estándar</SelectItem>
                    <SelectItem value="minijuego">Minijuego</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
