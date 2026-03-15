"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usuariosApi } from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Usuario, UserRole } from "@/lib/types";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ROLES: UserRole[] = ["ADMIN", "EMPLEADO", "CLIENTE", "EMPLEADO_CLUB", "SUPER_ADMIN"];
const GENEROS = ["M", "F", "Otro"];

const EMPTY_FORM = {
    uid: "",
    email: "",
    nombre: "",
    rol: "CLIENTE" as UserRole,
    telefono: "",
    edad: "",
    genero: "",
    fechaNacimiento: "",
    password: "",
};

function normalizeSearch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

export default function AdminUsuariosPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [pickerQuery, setPickerQuery] = useState("");
    const [selectedUsuarioId, setSelectedUsuarioId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
    const { toast } = useToast();

    const loadUsuarios = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await usuariosApi.getAll();
            setUsuarios(data);
            setSelectedUsuarioId((current) =>
                current && !data.some((usuario) => usuario.uid === current) ? "" : current,
            );
        } catch (error) {
            toast({
                variant: "destructive",
                title: "No se pudieron cargar los usuarios",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadUsuarios();
    }, [loadUsuarios]);

    const usuarioOptions: EntityOption[] = useMemo(
        () =>
            usuarios.map((usuario) => ({
                id: usuario.uid,
                label: usuario.email,
                subtitle: `${usuario.nombre || "-"} • ${usuario.rol}`,
            })),
        [usuarios],
    );

    const filteredUsuarios = useMemo(() => {
        if (!searchQuery.trim()) return usuarios;

        const normalized = normalizeSearch(searchQuery);
        return usuarios.filter(
            (usuario) =>
                normalizeSearch(usuario.email).includes(normalized) ||
                (usuario.nombre && normalizeSearch(usuario.nombre).includes(normalized)) ||
                usuario.rol.toLowerCase().includes(normalized),
        );
    }, [usuarios, searchQuery]);

    const selectedUsuario = usuarios.find((u) => u.uid === selectedUsuarioId);

    const handleSelectUsuario = useCallback((usuarioId: string) => {
        setSelectedUsuarioId(usuarioId);
        const usuario = usuarios.find((u) => u.uid === usuarioId);
        if (usuario) {
            setForm({
                uid: usuario.uid,
                email: usuario.email,
                nombre: usuario.nombre || "",
                rol: usuario.rol,
                telefono: usuario.telefono || "",
                edad: usuario.edad?.toString() || "",
                genero: usuario.genero || "",
                fechaNacimiento: usuario.fechaNacimiento || "",
                password: "",
            });
        }
    }, [usuarios]);

    const handleClear = useCallback(() => {
        setSelectedUsuarioId("");
        setForm(EMPTY_FORM);
    }, []);

    const handleSave = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setIsSaving(true);

            try {
                if (!form.email.trim() || !form.nombre.trim() || !form.password.trim()) {
                    toast({
                        variant: "destructive",
                        title: "Campos requeridos",
                        description: "Email, nombre y contraseña son obligatorios",
                    });
                    return;
                }

                const payload = {
                    email: form.email,
                    nombre: form.nombre,
                    rol: form.rol,
                    telefono: form.telefono || undefined,
                    edad: form.edad ? parseInt(form.edad, 10) : undefined,
                    genero: form.genero || undefined,
                    fechaNacimiento: form.fechaNacimiento || undefined,
                };

                if (selectedUsuario) {
                    // Actualizar usuario existente
                    const updated = await usuariosApi.update(selectedUsuario.uid, payload);
                    setUsuarios((prev) =>
                        prev.map((u) => (u.uid === updated.uid ? updated : u)),
                    );
                    toast({
                        title: "Usuario actualizado",
                        description: `${form.email} ha sido actualizado correctamente`,
                    });
                } else {
                    // Crear nuevo usuario
                    const newUsuario = await usuariosApi.create({
                        ...payload,
                        uid: form.uid || undefined,
                        password: form.password,
                    });
                    setUsuarios((prev) => [...prev, newUsuario]);

                    // Mostrar la contraseña
                    setTemporaryPassword(form.password);

                    toast({
                        title: "Usuario creado con éxito",
                        description: `${form.email} ha sido agregado. Ver contraseña temporal abajo.`,
                    });
                    handleClear();
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al guardar usuario",
                    description: getApiErrorMessage(error),
                });
            } finally {
                setIsSaving(false);
            }
        },
        [form, selectedUsuario, toast, handleClear],
    );

    const handleDelete = useCallback(async () => {
        if (!selectedUsuario) return;

        if (
            !window.confirm(
                `¿Estás seguro de que deseas eliminar a ${selectedUsuario.email}?`,
            )
        ) {
            return;
        }

        setIsSaving(true);
        try {
            await usuariosApi.delete(selectedUsuario.uid);
            setUsuarios((prev) =>
                prev.filter((u) => u.uid !== selectedUsuario.uid),
            );
            handleClear();
            toast({
                title: "Usuario eliminado",
                description: `${selectedUsuario.email} ha sido eliminado`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar usuario",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSaving(false);
        }
    }, [selectedUsuario, toast, handleClear]);

    const getRolBadgeColor = (rol: UserRole) => {
        switch (rol) {
            case "ADMIN":
                return "bg-red-100 text-red-800";
            case "EMPLEADO":
                return "bg-blue-100 text-blue-800";
            case "EMPLEADO_CLUB":
                return "bg-purple-100 text-purple-800";
            case "SUPER_ADMIN":
                return "bg-yellow-100 text-yellow-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Panel de selección y búsqueda */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usuarios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Buscar por email o nombre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isLoading}
                            />

                            <EntityPicker
                                label="Seleccionar usuario"
                                searchLabel="Buscar en lista..."
                                selectLabel="Usuario"
                                query={pickerQuery}
                                value={selectedUsuarioId}
                                options={usuarioOptions}
                                onQueryChange={setPickerQuery}
                                onValueChange={handleSelectUsuario}
                                disabled={isLoading}
                            />

                            <Button
                                variant="outline"
                                onClick={handleClear}
                                disabled={!selectedUsuarioId}
                                className="w-full"
                            >
                                Nuevo
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Panel de formulario */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedUsuario ? "Editar Usuario" : "Crear Usuario"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                            value={form.email}
                                            onChange={(e) =>
                                                setForm({ ...form, email: e.target.value })
                                            }
                                            required
                                            disabled={isSaving || !!selectedUsuario}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre *</Label>
                                        <Input
                                            id="nombre"
                                            placeholder="Nombre completo"
                                            value={form.nombre}
                                            onChange={(e) =>
                                                setForm({ ...form, nombre: e.target.value })
                                            }
                                            required
                                            disabled={isSaving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="rol">Rol *</Label>
                                        <Select
                                            value={form.rol}
                                            onValueChange={(valor) =>
                                                setForm({ ...form, rol: valor as UserRole })
                                            }
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger id="rol">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map((rol) => (
                                                    <SelectItem key={rol} value={rol}>
                                                        {rol}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="telefono">Teléfono</Label>
                                        <Input
                                            id="telefono"
                                            placeholder="+56 9 XXXX XXXX"
                                            value={form.telefono}
                                            onChange={(e) =>
                                                setForm({ ...form, telefono: e.target.value })
                                            }
                                            disabled={isSaving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="edad">Edad</Label>
                                        <Input
                                            id="edad"
                                            type="number"
                                            placeholder="18"
                                            value={form.edad}
                                            onChange={(e) =>
                                                setForm({ ...form, edad: e.target.value })
                                            }
                                            disabled={isSaving}
                                            min="13"
                                            max="120"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="genero">Género</Label>
                                        <Select
                                            value={form.genero}
                                            onValueChange={(valor) =>
                                                setForm({ ...form, genero: valor })
                                            }
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger id="genero">
                                                <SelectValue placeholder="Selecciona..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GENEROS.map((gen) => (
                                                    <SelectItem key={gen} value={gen}>
                                                        {gen}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                                        <Input
                                            id="fechaNacimiento"
                                            type="date"
                                            value={form.fechaNacimiento}
                                            onChange={(e) =>
                                                setForm({ ...form, fechaNacimiento: e.target.value })
                                            }
                                            disabled={isSaving}
                                        />
                                    </div>

                                    {!selectedUsuario && (
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="password">Contraseña *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="Ingresa contraseña para el usuario"
                                                value={form.password}
                                                onChange={(e) =>
                                                    setForm({ ...form, password: e.target.value })
                                                }
                                                required
                                                disabled={isSaving}
                                            />
                                            <p className="text-xs text-gray-500">
                                                La contraseña que proporcionas aquí será usada en el primer inicio de sesión
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={isSaving || !form.email.trim() || !form.nombre.trim() || (!selectedUsuario && !form.password.trim())}
                                        className="flex-1"
                                    >
                                        {isSaving ? "Guardando..." : "Guardar"}
                                    </Button>
                                    {selectedUsuario && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={handleDelete}
                                            disabled={isSaving}
                                        >
                                            Eliminar
                                        </Button>
                                    )}
                                </div>
                            </form>

                            {/* Tarjeta de contraseña temporal */}
                            {temporaryPassword && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="text-green-600 text-lg">✓</div>
                                        <h3 className="font-semibold text-gray-900">Usuario creado exitosamente</h3>
                                    </div>
                                    <div className="bg-white p-3 rounded border border-blue-200 font-mono text-sm">
                                        {temporaryPassword}
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                navigator.clipboard.writeText(temporaryPassword);
                                                toast({ title: "Copiado", description: "Contraseña copiada al portapapeles" });
                                            }}
                                        >
                                            Copiar Contraseña
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setTemporaryPassword(null)}
                                        >
                                            Cerrar
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-600 italic">
                                        El usuario deberá cambiar esta contraseña en su primer acceso.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tabla de usuarios */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="text-right">Puntos</TableHead>
                                    <TableHead>Nivel</TableHead>
                                    <TableHead>Edad</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Miembro desde</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            Cargando usuarios...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsuarios.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            No hay usuarios para mostrar
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsuarios.map((usuario) => (
                                        <TableRow
                                            key={usuario.uid}
                                            className={
                                                selectedUsuarioId === usuario.uid
                                                    ? "bg-muted"
                                                    : "cursor-pointer hover:bg-muted/50"
                                            }
                                            onClick={() => handleSelectUsuario(usuario.uid)}
                                        >
                                            <TableCell className="font-medium">
                                                {usuario.email}
                                            </TableCell>
                                            <TableCell>{usuario.nombre || "-"}</TableCell>
                                            <TableCell>
                                                <Badge className={getRolBadgeColor(usuario.rol)}>
                                                    {usuario.rol}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {usuario.puntosActuales || 0}
                                            </TableCell>
                                            <TableCell>
                                                {usuario.nivel ? (
                                                    <Badge variant="outline">{usuario.nivel}</Badge>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>{usuario.edad || "-"}</TableCell>
                                            <TableCell>{usuario.telefono || "-"}</TableCell>
                                            <TableCell>
                                                {usuario.createdAt
                                                    ? new Date(usuario.createdAt).toLocaleDateString(
                                                        "es-CL",
                                                    )
                                                    : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <input
                                                    type="radio"
                                                    checked={selectedUsuarioId === usuario.uid}
                                                    onChange={() => handleSelectUsuario(usuario.uid)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="cursor-pointer"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
