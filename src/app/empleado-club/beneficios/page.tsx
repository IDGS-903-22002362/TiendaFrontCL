"use client";

import Image from "next/image";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, Gift, Plus, RefreshCw, RotateCcw, X } from "lucide-react";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
    beneficiosApi,
    type Beneficio,
    type CrearBeneficioDTO,
    type ActualizarBeneficioDTO,
} from "@/lib/api/beneficios";
import { useToast } from "@/hooks/use-toast";

const EMPTY_FORM = {
    titulo: "",
    descripcion: "",
    estatus: true,
};

type PendingImageUpload = {
    id: string;
    file: File;
    previewUrl: string;
};

type DateValue =
    | Date
    | string
    | { _seconds: number; _nanoseconds: number }
    | { seconds: number; nanoseconds: number }
    | { toDate: () => Date }
    | null
    | undefined;

function normalizeSearch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

function parseDate(value: DateValue): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "object") {
        if ("toDate" in value && typeof value.toDate === "function") {
            return value.toDate();
        }

        if ("_seconds" in value && typeof value._seconds === "number") {
            return new Date(value._seconds * 1000);
        }

        if ("seconds" in value && typeof value.seconds === "number") {
            return new Date(value.seconds * 1000);
        }
    }

    if (typeof value === "string") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function formatDate(value: DateValue): string {
    const parsed = parseDate(value);

    if (!parsed) {
        return "Fecha desconocida";
    }

    return format(parsed, "dd MMM yyyy", { locale: es });
}

export default function EmpleadoClubBeneficiosPage() {
    const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBeneficioId, setSelectedBeneficioId] = useState("");
    const [estatusFilter, setEstatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBeneficioId, setEditingBeneficioId] = useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [pendingImageUpload, setPendingImageUpload] = useState<PendingImageUpload | null>(null);
    const { toast } = useToast();

    const itemsPerPage = 10;

    const loadBeneficios = useCallback(async () => {
        setIsLoading(true);

        try {
            const data = await beneficiosApi.getAll();
            setBeneficios(data);
            setSelectedBeneficioId((current) =>
                current && !data.some((beneficio) => beneficio.id === current)
                    ? ""
                    : current,
            );
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar beneficios",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadBeneficios();
    }, [loadBeneficios]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedBeneficioId, estatusFilter]);

    useEffect(() => {
        return () => {
            if (pendingImageUpload) {
                URL.revokeObjectURL(pendingImageUpload.previewUrl);
            }
        };
    }, [pendingImageUpload]);

    const beneficioOptions: EntityOption[] = useMemo(
        () =>
            beneficios.map((beneficio) => ({
                id: beneficio.id,
                label: beneficio.titulo,
                subtitle: beneficio.descripcion,
            })),
        [beneficios],
    );

    const filteredBeneficios = useMemo(() => {
        const query = normalizeSearch(searchQuery);

        return beneficios
            .filter((beneficio) => {
                if (selectedBeneficioId && beneficio.id !== selectedBeneficioId) {
                    return false;
                }

                if (estatusFilter === "activo") {
                    return beneficio.estatus === true;
                }

                if (estatusFilter === "inactivo") {
                    return beneficio.estatus === false;
                }

                return true;
            })
            .filter((beneficio) => {
                if (!query) {
                    return true;
                }

                return normalizeSearch(
                    `${beneficio.titulo} ${beneficio.descripcion ?? ""}`,
                ).includes(query);
            });
    }, [beneficios, estatusFilter, searchQuery, selectedBeneficioId]);

    const totalPages = Math.ceil(filteredBeneficios.length / itemsPerPage);

    const paginatedBeneficios = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredBeneficios.slice(start, start + itemsPerPage);
    }, [currentPage, filteredBeneficios]);

    const clearPendingImage = () => {
        setPendingImageUpload((current) => {
            if (current) {
                URL.revokeObjectURL(current.previewUrl);
            }

            return null;
        });
    };

    const resetForm = () => {
        setEditingBeneficioId(null);
        setFormData(EMPTY_FORM);
        clearPendingImage();
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setIsLoadingDetail(false);
        resetForm();
    };

    const openCreateForm = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast({
                variant: "destructive",
                title: "Archivo inválido",
                description: "Solo se permiten imágenes.",
            });
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "Imagen demasiado grande",
                description: "La imagen no puede exceder 5 MB.",
            });
            event.target.value = "";
            return;
        }

        const nextUpload = {
            id: `${file.name}-${file.size}-${Date.now()}`,
            file,
            previewUrl: URL.createObjectURL(file),
        };

        setPendingImageUpload((current) => {
            if (current) {
                URL.revokeObjectURL(current.previewUrl);
            }

            return nextUpload;
        });
        event.target.value = "";
    };

    const openEditForm = async (beneficio: Beneficio) => {
        setEditingBeneficioId(beneficio.id);
        setIsDialogOpen(true);
        setIsLoadingDetail(true);

        try {
            const detail = await beneficiosApi.getById(beneficio.id);
            setFormData({
                titulo: detail.titulo,
                descripcion: detail.descripcion,
                estatus: detail.estatus,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar detalle",
                description: getApiErrorMessage(error),
            });
            setIsDialogOpen(false);
            resetForm();
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleSave = async () => {
        const titulo = formData.titulo.trim();
        const descripcion = formData.descripcion.trim();

        if (!titulo || !descripcion) {
            toast({
                variant: "destructive",
                title: "Campos requeridos",
                description: "Título y descripción son obligatorios.",
            });
            return;
        }

        setIsSaving(true);

        try {
            if (editingBeneficioId) {
                const payload: ActualizarBeneficioDTO = {
                    titulo,
                    descripcion,
                };

                await beneficiosApi.update(editingBeneficioId, payload);
                toast({
                    title: "Beneficio actualizado",
                    description: `"${titulo}" ha sido actualizado.`,
                });
            } else {
                const payload: CrearBeneficioDTO = {
                    titulo,
                    descripcion,
                    estatus: formData.estatus,
                };

                if (pendingImageUpload?.file) {
                    await beneficiosApi.createWithImage(payload, pendingImageUpload.file);
                } else {
                    await beneficiosApi.create(payload);
                }
                toast({
                    title: "Beneficio creado",
                    description: `"${titulo}" ha sido creado.`,
                });
            }

            closeDialog();
            await loadBeneficios();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Desactivar este beneficio?")) {
            return;
        }

        try {
            await beneficiosApi.delete(id);

            if (selectedBeneficioId === id) {
                setSelectedBeneficioId("");
            }

            toast({ title: "Beneficio desactivado" });
            await loadBeneficios();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al desactivar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleReactivate = async (beneficio: Beneficio) => {
        if (!confirm("¿Habilitar de nuevo este beneficio?")) {
            return;
        }

        try {
            await beneficiosApi.update(beneficio.id, { estatus: true });
            toast({ title: "Beneficio habilitado" });
            await loadBeneficios();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al habilitar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleEditSelected = async () => {
        if (!selectedBeneficioId) {
            return;
        }

        const selected = beneficios.find((beneficio) => beneficio.id === selectedBeneficioId);

        if (!selected) {
            toast({
                variant: "destructive",
                title: "Selección inválida",
                description: "El beneficio seleccionado ya no existe.",
            });
            setSelectedBeneficioId("");
            return;
        }

        await openEditForm(selected);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Gift className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="font-headline text-3xl font-bold">Gestión de Beneficios</h1>
                            <p className="text-sm text-muted-foreground">
                                Administra las publicaciones informativas de beneficios.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => void loadBeneficios()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={openCreateForm}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar beneficio
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card p-4">
                <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                    <EntityPicker
                        label="Búsqueda de beneficios"
                        searchLabel="Buscar por título o descripción"
                        selectLabel="Selecciona un beneficio"
                        query={searchQuery}
                        value={selectedBeneficioId}
                        options={beneficioOptions}
                        onQueryChange={setSearchQuery}
                        onValueChange={setSelectedBeneficioId}
                        allowEmpty
                        emptyLabel="Todos los beneficios"
                        disabled={isLoading}
                    />

                    <div className="min-w-[140px] space-y-1">
                        <Label htmlFor="estatusFilter" className="text-xs">
                            Estado
                        </Label>
                        <Select
                            value={estatusFilter}
                            onValueChange={(value: "todos" | "activo" | "inactivo") =>
                                setEstatusFilter(value)
                            }
                        >
                            <SelectTrigger id="estatusFilter" className="w-[140px]">
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="activo">Activos</SelectItem>
                                <SelectItem value="inactivo">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => void handleEditSelected()}
                        disabled={!selectedBeneficioId || isLoading}
                    >
                        Editar seleccionado
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedBeneficioId("");
                            setEstatusFilter("todos");
                        }}
                        disabled={isLoading}
                    >
                        Limpiar filtros
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Imagen</TableHead>
                                <TableHead>Título</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Creado</TableHead>
                                <TableHead>Actualizado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        Cargando beneficios...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedBeneficios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        No hay beneficios que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedBeneficios.map((beneficio) => (
                                    <TableRow key={beneficio.id}>
                                        <TableCell>
                                            {beneficio.imagen ? (
                                                <Image
                                                    src={beneficio.imagen}
                                                    alt={`Imagen de ${beneficio.titulo}`}
                                                    width={64}
                                                    height={48}
                                                    className="h-12 w-16 rounded-md object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-16 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                                    Sin imagen
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{beneficio.titulo}</TableCell>
                                        <TableCell className="max-w-[440px] whitespace-normal text-sm text-muted-foreground">
                                            {beneficio.descripcion}
                                        </TableCell>
                                        <TableCell>
                                            {beneficio.estatus ? (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactivo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(beneficio.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(beneficio.updatedAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => void openEditForm(beneficio)}
                                                >
                                                    Editar
                                                </Button>
                                                {beneficio.estatus ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => void handleDelete(beneficio.id)}
                                                        title="Desactivar beneficio"
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                        onClick={() => void handleReactivate(beneficio)}
                                                        title="Habilitar beneficio"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {filteredBeneficios.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t p-4 sm:flex-row">
                        <p className="text-sm text-muted-foreground">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredBeneficios.length)} de {filteredBeneficios.length} beneficios
                        </p>
                        {totalPages > 1 && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (currentPage > 1) {
                                                    setCurrentPage(currentPage - 1);
                                                }
                                            }}
                                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href="#"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    setCurrentPage(page);
                                                }}
                                                isActive={page === currentPage}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                if (currentPage < totalPages) {
                                                    setCurrentPage(currentPage + 1);
                                                }
                                            }}
                                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    closeDialog();
                    return;
                }

                setIsDialogOpen(true);
            }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingBeneficioId ? "Editar beneficio" : "Nuevo beneficio"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {isLoadingDetail && (
                            <p className="text-sm text-muted-foreground">Cargando datos...</p>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="titulo">Título *</Label>
                            <Input
                                id="titulo"
                                value={formData.titulo}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        titulo: event.target.value,
                                    }))
                                }
                                disabled={isLoadingDetail || isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción *</Label>
                            <Textarea
                                id="descripcion"
                                rows={5}
                                value={formData.descripcion}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        descripcion: event.target.value,
                                    }))
                                }
                                disabled={isLoadingDetail || isSaving}
                            />
                        </div>

                        {!editingBeneficioId && (
                            <div className="space-y-2 border-t pt-4">
                                <Label htmlFor="imagen">Imagen</Label>
                                <Input
                                    id="imagen"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    disabled={isLoadingDetail || isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Opcional. Sube una imagen para mostrar este beneficio. Máximo 5 MB.
                                </p>

                                {pendingImageUpload && (
                                    <div className="relative max-w-xs overflow-hidden rounded-md border">
                                        <Image
                                            src={pendingImageUpload.previewUrl}
                                            alt="Vista previa de la imagen del beneficio"
                                            width={320}
                                            height={144}
                                            unoptimized
                                            className="h-36 w-full object-cover"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="absolute right-2 top-2 h-7 w-7"
                                            onClick={clearPendingImage}
                                            disabled={isSaving}
                                            aria-label="Quitar imagen seleccionada"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={isSaving || isLoadingDetail}>
                            {isSaving ? "Guardando..." : editingBeneficioId ? "Guardar cambios" : "Guardar beneficio"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}