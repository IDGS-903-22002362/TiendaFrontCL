"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
import type { MinijuegoVisibilidad } from "@/lib/api/beneficios";
import {
    searchClubUsers,
    type UsuarioClubBusqueda,
} from "@/lib/api/users";

const DESCRIPTIONS: Record<MinijuegoVisibilidad, string> = {
    publico: "Disponible para todos los usuarios elegibles.",
    restringido: "Úsalo para pruebas internas antes de publicar el minijuego.",
};

type MinigameVisibilityFieldsProps = {
    visibilidad: MinijuegoVisibilidad;
    usuarios: UsuarioClubBusqueda[];
    onVisibilidadChange: (value: MinijuegoVisibilidad) => void;
    onAdd: (usuario: UsuarioClubBusqueda) => void;
    onRemove: (uid: string) => void;
    disabled?: boolean;
};

export function MinigameVisibilityFields({
    visibilidad,
    usuarios,
    onVisibilidadChange,
    onAdd,
    onRemove,
    disabled,
}: MinigameVisibilityFieldsProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UsuarioClubBusqueda[]>([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = async () => {
        const term = query.trim();
        if (term.length < 2) {
            setError("Escribe al menos 2 caracteres.");
            setResults([]);
            return;
        }

        setSearching(true);
        setError(null);
        try {
            const response = await searchClubUsers(term);
            setResults(response.data ?? []);
            if ((response.data ?? []).length === 0) {
                setError("No hay usuarios con ese nombre, correo o UID.");
            }
        } catch {
            setResults([]);
            setError("No se pudo buscar usuarios.");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label htmlFor="minijuegoVisibilidad">Visibilidad</Label>
                <Select
                    value={visibilidad}
                    onValueChange={(value) =>
                        onVisibilidadChange(value as MinijuegoVisibilidad)
                    }
                    disabled={disabled}
                >
                    <SelectTrigger id="minijuegoVisibilidad">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="publico" hint={DESCRIPTIONS.publico}>
                            Público
                        </SelectItem>
                        <SelectItem
                            value="restringido"
                            hint={DESCRIPTIONS.restringido}
                        >
                            Solo usuarios seleccionados
                        </SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    {DESCRIPTIONS[visibilidad]}
                </p>
            </div>

            {visibilidad === "restringido" ? (
                <div className="space-y-3">
                    <Label htmlFor="usuarioPermitido">Usuarios con acceso</Label>
                    <div className="flex gap-2">
                        <Input
                            id="usuarioPermitido"
                            placeholder="Nombre, correo o UID"
                            value={query}
                            onChange={(event) => {
                                setError(null);
                                setQuery(event.target.value);
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                void search();
                            }}
                            disabled={disabled || searching}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void search()}
                            disabled={disabled || searching}
                        >
                            Buscar
                        </Button>
                    </div>
                    {error ? (
                        <p className="text-xs text-destructive">{error}</p>
                    ) : null}
                    {results.length > 0 ? (
                        <ul className="space-y-2">
                            {results.map((usuario) => {
                                const selected = usuarios.some(
                                    (item) => item.uid === usuario.uid,
                                );
                                return (
                                    <li
                                        key={usuario.uid}
                                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                                    >
                                        <span>
                                            <span className="block font-medium">
                                                {usuario.nombre || "Sin nombre"}
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                {usuario.email || "Sin correo"} · {usuario.uid}
                                            </span>
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={disabled || selected}
                                            onClick={() => onAdd(usuario)}
                                        >
                                            {selected ? "Agregado" : "Agregar"}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                    {usuarios.length > 0 ? (
                        <ul className="space-y-2">
                            {usuarios.map((usuario) => (
                                <li
                                    key={usuario.uid}
                                    className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm"
                                >
                                    <span>
                                        <span className="block font-medium">
                                            {usuario.nombre || usuario.uid}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {[usuario.email, usuario.uid]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </span>
                                    </span>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={disabled}
                                        aria-label={`Quitar ${usuario.nombre || usuario.uid}`}
                                        onClick={() => onRemove(usuario.uid)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-destructive">
                            Selecciona al menos un usuario autorizado.
                        </p>
                    )}
                </div>
            ) : null}
        </div>
    );
}
