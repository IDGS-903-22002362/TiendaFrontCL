// super-admin/usuarios/page.tsx
"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usuariosApi } from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Usuario, UserRole } from "@/lib/types";
import { Plus, RefreshCw, X, RotateCcw } from "lucide-react"; // Importamos RotateCcw para el icono de reactivar
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const ROLES: UserRole[] = ["ADMIN", "EMPLEADO", "CLIENTE", "EMPLEADO_CLUB", "SUPER_ADMIN"];

const EMPTY_FORM = {
    uid: "",
    email: "",
    nombre: "",
    rol: "CLIENTE" as UserRole,
    password: "",
};

const ITEMS_PER_PAGE = 10;

function normalizeSearch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

function formatDate(value: string | Date | undefined): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-CL");
}

export default function SuperAdminUsuariosPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsuarioId, setSelectedUsuarioId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUsuarioId, setEditingUsuarioId] = useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
    const [roleFilter, setRoleFilter] = useState<UserRole | "todos">("todos");

    const loadUsuarios = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await usuariosApi.getAll();
            setUsuarios(data);
            setSelectedUsuarioId((current) =>
                current && !data.some((u) => u.uid === current) ? "" : current,
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
            usuarios.map((u) => ({
                id: u.uid,
                label: u.email,
                subtitle: `${u.nombre || "-"} • ${u.rol}`,
            })),
        [usuarios],
    );

    const filteredUsuarios = useMemo(() => {
        const query = normalizeSearch(searchQuery);
        return usuarios.filter((u) => {
            // Búsqueda por texto
            if (query && !normalizeSearch(u.email).includes(query) &&
                !(u.nombre && normalizeSearch(u.nombre).includes(query)) &&
                !u.rol.toLowerCase().includes(query)) {
                return false;
            }
            // Filtro por estado
            if (statusFilter === "activo" && !u.activo) return false;
            if (statusFilter === "inactivo" && u.activo) return false;
            // Filtro por rol
            if (roleFilter !== "todos" && u.rol !== roleFilter) return false;
            return true;
        });
    }, [usuarios, searchQuery, statusFilter, roleFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredUsuarios]);

    const totalPages = Math.ceil(filteredUsuarios.length / ITEMS_PER_PAGE);
    const paginatedUsuarios = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsuarios.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredUsuarios, currentPage]);

    const getRolBadgeColor = (rol: UserRole) => {
        switch (rol) {
            case "SUPER_ADMIN":
                return "bg-yellow-100 text-yellow-800";
            case "ADMIN":
                return "bg-red-100 text-red-800";
            case "EMPLEADO":
                return "bg-blue-100 text-blue-800";
            case "EMPLEADO_CLUB":
                return "bg-purple-100 text-purple-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const openForm = async (usuario?: Usuario) => {
        if (usuario) {
            setEditingUsuarioId(usuario.uid);
            setIsDialogOpen(true);
            setIsLoadingDetail(true);

            try {
                let detail: Usuario;
                if (usuariosApi.getById) {
                    detail = await usuariosApi.getById(usuario.uid);
                } else {
                    detail = usuario;
                }

                setForm({
                    uid: detail.uid,
                    email: detail.email,
                    nombre: detail.nombre || "",
                    rol: detail.rol,
                    password: "",
                });
                setTemporaryPassword(null);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al cargar detalle",
                    description: getApiErrorMessage(error),
                });
            } finally {
                setIsLoadingDetail(false);
            }
        } else {
            setEditingUsuarioId(null);
            setForm(EMPTY_FORM);
            setTemporaryPassword(null);
            setIsDialogOpen(true);
        }
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.email.trim() || !form.nombre.trim()) {
            toast({
                variant: "destructive",
                title: "Campos requeridos",
                description: "Email y nombre son obligatorios",
            });
            return;
        }
        if (!editingUsuarioId && !form.password.trim()) {
            toast({
                variant: "destructive",
                title: "Contraseña requerida",
                description: "Debes proporcionar una contraseña para el nuevo usuario",
            });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                email: form.email.trim(),
                nombre: form.nombre.trim(),
                rol: form.rol,
            };

            if (editingUsuarioId) {
                const updated = await usuariosApi.update(editingUsuarioId, payload);
                setUsuarios((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
                toast({
                    title: "Usuario actualizado",
                    description: `${form.email} ha sido actualizado correctamente`,
                });
            } else {
                const newUsuario = await usuariosApi.create({
                    ...payload,
                    password: form.password,
                });
                setUsuarios((prev) => [...prev, newUsuario]);
                setTemporaryPassword(form.password);
                toast({
                    title: "Usuario creado",
                    description: `${form.email} ha sido agregado. Revisa la contraseña temporal.`,
                });
            }

            setIsDialogOpen(false);
            setEditingUsuarioId(null);
            setForm(EMPTY_FORM);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al guardar usuario",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) return;
        try {
            await usuariosApi.delete(uid);
            setUsuarios((prev) => prev.filter((u) => u.uid !== uid));
            if (selectedUsuarioId === uid) setSelectedUsuarioId("");
            toast({ title: "Usuario eliminado" });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleReactivate = async (uid: string) => {
        if (!confirm("¿Estás seguro de que deseas reactivar este usuario?")) return;
        try {
            const updated = await usuariosApi.reactivate(uid); // Necesitamos agregar este método en la API
            console.log('Usuario reactivado (respuesta):', updated);
            setUsuarios((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
            toast({ title: "Usuario reactivado" });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al reactivar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleEditSelected = async () => {
        if (!selectedUsuarioId) return;
        const usuario = usuarios.find((u) => u.uid === selectedUsuarioId);
        if (!usuario) {
            toast({
                variant: "destructive",
                title: "Selección inválida",
                description: "El usuario seleccionado ya no existe.",
            });
            setSelectedUsuarioId("");
            return;
        }
        await openForm(usuario);
    };

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Gestión de Usuarios</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra todos los usuarios del sistema.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => void loadUsuarios()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => openForm()}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Usuario
                    </Button>
                </div>
            </div>

            {/* Selector y búsqueda */}
            <div className="rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <EntityPicker
                        className="flex-1 min-w-[300px]"
                        label="Búsqueda de usuarios"
                        searchLabel="Buscar por email, nombre o rol"
                        selectLabel="Selecciona un usuario"
                        query={searchQuery}
                        value={selectedUsuarioId}
                        options={usuarioOptions}
                        onQueryChange={setSearchQuery}
                        onValueChange={setSelectedUsuarioId}
                        allowEmpty
                        emptyLabel="Todos los usuarios"
                        disabled={isLoading}
                    />

                    <div className="min-w-[140px]">
                        <Label htmlFor="statusFilter" className="text-xs">Estado</Label>
                        <Select
                            value={statusFilter}
                            onValueChange={(value: "todos" | "activo" | "inactivo") => setStatusFilter(value)}
                        >
                            <SelectTrigger id="statusFilter">
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="activo">Activos</SelectItem>
                                <SelectItem value="inactivo">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="min-w-[140px]">
                        <Label htmlFor="roleFilter" className="text-xs">Rol</Label>
                        <Select
                            value={roleFilter}
                            onValueChange={(value: UserRole | "todos") => setRoleFilter(value)}
                        >
                            <SelectTrigger id="roleFilter">
                                <SelectValue placeholder="Filtrar por rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los roles</SelectItem>
                                {ROLES.map((rol) => (
                                    <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleEditSelected()}
                            disabled={!selectedUsuarioId || isLoading}
                        >
                            Editar seleccionado
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedUsuarioId("");
                                setStatusFilter("todos");
                                setRoleFilter("todos");
                            }}
                            disabled={isLoading}
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabla de usuarios */}
            <div className="rounded-md border bg-card">
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
                                <TableHead>Perfil</TableHead>
                                <TableHead>Activo</TableHead>
                                <TableHead>Miembro desde</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        Cargando usuarios...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedUsuarios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        No hay usuarios para mostrar.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsuarios.map((usuario) => (
                                    <TableRow key={usuario.uid}>
                                        <TableCell className="font-medium">{usuario.email}</TableCell>
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
                                            <Badge variant={usuario.perfilCompleto ? "default" : "secondary"}>
                                                {usuario.perfilCompleto ? "Completo" : "Incompleto"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={usuario.activo ? "default" : "destructive"}>
                                                {usuario.activo ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(usuario.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            {/* Mostrar acciones solo para usuarios que no son CLIENTE, o si quieres también para clientes, ajusta la condición */}
                                            {usuario.rol === "CLIENTE" ? (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2"
                                                        onClick={() => openForm(usuario)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    {usuario.activo ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => void handleDelete(usuario.uid)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                            onClick={() => void handleReactivate(usuario.uid)}
                                                        >
                                                            <RotateCcw className="h-4 w-4 mr-1" />
                                                            Reactivar
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Paginación */}
            {!isLoading && filteredUsuarios.length > 0 && (
                <div className="flex justify-center">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage((p) => Math.max(1, p - 1));
                                    }}
                                    aria-disabled={currentPage === 1}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentPage(page);
                                        }}
                                        isActive={currentPage === page}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                                    }}
                                    aria-disabled={currentPage === totalPages}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            {/* Diálogo de creación/edición */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingUsuarioId ? "Editar Usuario" : "Nuevo Usuario"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        {isLoadingDetail && (
                            <p className="text-sm text-muted-foreground">Cargando datos...</p>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                    disabled={isSaving || !!editingUsuarioId}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre *</Label>
                                <Input
                                    id="nombre"
                                    placeholder="Nombre completo"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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

                            {!editingUsuarioId && (
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="password">Contraseña *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Contraseña temporal"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                        disabled={isSaving}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        El usuario deberá cambiar esta contraseña al iniciar sesión.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setEditingUsuarioId(null);
                                    setForm(EMPTY_FORM);
                                    setTemporaryPassword(null);
                                }}
                                disabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSaving || isLoadingDetail}>
                                {isSaving ? "Guardando..." : "Guardar Usuario"}
                            </Button>
                        </div>
                    </form>

                    {temporaryPassword && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-900 mb-2">
                                ✓ Usuario creado exitosamente
                            </h3>
                            <p className="text-sm text-blue-800 mb-3">
                                Contraseña temporal para: <span className="font-bold">{form.email}</span>
                            </p>
                            <div className="flex gap-2 items-center">
                                <code className="flex-1 bg-white p-3 rounded border border-blue-300 font-mono text-sm overflow-auto">
                                    {temporaryPassword}
                                </code>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(temporaryPassword);
                                        toast({ title: "Copiado", description: "Contraseña copiada al portapapeles" });
                                    }}
                                >
                                    Copiar
                                </Button>
                            </div>
                            <p className="text-xs text-blue-700 mt-3">
                                ⚠️ El usuario debe cambiar esta contraseña en su primer inicio de sesión.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setTemporaryPassword(null)}
                                className="mt-3 w-full"
                            >
                                Entendido
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}