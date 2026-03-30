"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { galeriaApi } from "@/lib/api/galeria";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Plus, RefreshCw, X, RotateCcw, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DialogDescription } from "@/components/ui/dialog";

// Interfaz local de galería (ajusta según tu API)
export interface Galeria {
    id: string;
    descripcion: string;
    imagenes: string[];
    videos: string[];
    usuarioId?: string;
    autorNombre?: string;
    estatus: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

// Estado inicial del formulario de galeria
const EMPTY_FORM = {
    descripcion: "",
};

// Utilidades
type DateValue = Date | string | { toDate: () => Date } | null | undefined;

function parseDate(value: DateValue): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === "string") {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === "object" && typeof value.toDate === "function") {
        return value.toDate();
    }
    return null;
}

function formatDate(value: DateValue): string {
    const date = parseDate(value);
    if (!date) return "Fecha desconocida";
    return format(date, "dd MMM yyyy", { locale: es });
}

function normalizeSearch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

// Tipos para archivos pendientes
type PendingImageUpload = {
    id: string;
    file: File;
    previewUrl: string;
};

type PendingVideoUpload = {
    id: string;
    file: File;
    name: string;
};

export default function EmpleadoClubGaleriaPage() {
    const [galerias, setGalerias] = useState<Galeria[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGaleriaId, setSelectedGaleriaId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGaleriaId, setEditingGaleriaId] = useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);

    // Estados para el progreso
    const [savingStage, setSavingStage] = useState<string>('idle'); // 'creating', 'uploadingImages', 'uploadingVideos', 'deletingImages', 'deletingVideos', 'finalizing'
    const [savingProgress, setSavingProgress] = useState(0);

    // Estados para imágenes
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [pendingImageUploads, setPendingImageUploads] = useState<PendingImageUpload[]>([]);
    const [pendingDeletedImages, setPendingDeletedImages] = useState<string[]>([]);

    // Estados para videos
    const [existingVideos, setExistingVideos] = useState<string[]>([]);
    const [pendingVideoUploads, setPendingVideoUploads] = useState<PendingVideoUpload[]>([]);
    const [pendingDeletedVideos, setPendingDeletedVideos] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");

    const { toast } = useToast();

    // Cargar lista de galerías
    const loadGalerias = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await galeriaApi.getAll();
            setGalerias(data);
            setSelectedGaleriaId((current) =>
                current && !data.some((g) => g.id === current) ? "" : current
            );
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar galerías",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadGalerias();
    }, [loadGalerias]);

    // Opciones para el EntityPicker
    const galeriaOptions: EntityOption[] = useMemo(
        () =>
            galerias.map((g) => ({
                id: g.id,
                label: g.descripcion || "Sin descripción",
                subtitle: `${g.imagenes.length} img · ${g.videos.length} vid`,
            })),
        [galerias]
    );

    // Filtrar galerías para la tabla (cuando hay selección, mostrar solo esa)
    const filteredGalerias = useMemo(() => {
        const query = normalizeSearch(searchQuery);
        return galerias.filter((g) => {
            if (selectedGaleriaId && g.id !== selectedGaleriaId) return false;
            if (query && !normalizeSearch(g.descripcion).includes(query)) return false;
            if (statusFilter === "activo" && !g.estatus) return false;
            if (statusFilter === "inactivo" && g.estatus) return false;
            return true;
        });
    }, [searchQuery, galerias, selectedGaleriaId, statusFilter]);

    // Limpiar cambios de archivos
    const clearPendingChanges = () => {
        pendingImageUploads.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setPendingImageUploads([]);
        setPendingDeletedImages([]);
        pendingVideoUploads.forEach((item) => URL.revokeObjectURL(item.name)); // No es necesario, pero por consistencia
        setPendingVideoUploads([]);
        setPendingDeletedVideos([]);
    };

    // Abrir formulario para crear o editar
    const openForm = async (galeria?: Galeria) => {
        if (galeria) {
            setEditingGaleriaId(galeria.id);
            setIsDialogOpen(true);
            setIsLoadingDetail(true);

            try {
                // Si la API tiene un método getById, úsalo; si no, usa los datos de la lista
                // Asumimos que galeriaApi.getById existe (ajusta según tu implementación)
                let detail: Galeria;
                if (galeriaApi.getById) {
                    detail = await galeriaApi.getById(galeria.id);
                } else {
                    detail = galeria; // usar datos de la lista
                }

                setFormData({ descripcion: detail.descripcion });
                setExistingImages(detail.imagenes || []);
                setExistingVideos(detail.videos || []);
                clearPendingChanges();
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
            // Nueva galería
            setEditingGaleriaId(null);
            setFormData(EMPTY_FORM);
            setExistingImages([]);
            setExistingVideos([]);
            clearPendingChanges();
            setIsDialogOpen(true);
        }
        // Resetear progreso
        setSavingStage('idle');
        setSavingProgress(0);
    };

    // Guardar (crear o actualizar descripción y archivos)
    const handleSave = async () => {
        if (!formData.descripcion.trim()) {
            toast({
                variant: "destructive",
                title: "Campo requerido",
                description: "La descripción no puede estar vacía",
            });
            return;
        }

        setIsSaving(true);
        setSavingStage('creating');
        setSavingProgress(5);

        try {
            let targetId = editingGaleriaId;

            // =========================
            // CREAR
            // =========================
            if (!editingGaleriaId) {
                const nueva = await galeriaApi.create({
                    descripcion: formData.descripcion,
                });

                if (!nueva?.id) {
                    throw new Error("No se recibió el ID de la galería");
                }

                targetId = nueva.id;
                setSavingProgress(15);
            } else {
                // Si es edición, podríamos actualizar la descripción si la API lo permite
                // Asumiendo que existe un método update
                // Si no existe, solo seguimos con los archivos
                setSavingProgress(15);
            }

            // =========================
            // VALIDACIÓN
            // =========================
            if (!targetId) {
                throw new Error("ID inválido");
            }

            // =========================
            // SUBIR IMÁGENES
            // =========================
            if (pendingImageUploads.length > 0) {
                setSavingStage('uploadingImages');
                setSavingProgress(25);
                // Podríamos subir una a una para progreso granular, pero usamos el batch actual
                await galeriaApi.uploadImages(
                    targetId,
                    pendingImageUploads.map((p) => p.file)
                );
                setSavingProgress(50);
            } else {
                setSavingProgress(50);
            }

            // =========================
            // SUBIR VIDEOS
            // =========================
            if (pendingVideoUploads.length > 0) {
                setSavingStage('uploadingVideos');
                setSavingProgress(55);

                await galeriaApi.uploadVideos(
                    targetId,
                    pendingVideoUploads.map((p) => p.file)
                );
                setSavingProgress(75);
            } else {
                setSavingProgress(75);
            }

            // =========================
            // ELIMINAR IMÁGENES
            // =========================
            if (pendingDeletedImages.length > 0) {
                setSavingStage('deletingImages');
                setSavingProgress(80);
                let deleted = 0;
                const total = pendingDeletedImages.length;
                for (const url of pendingDeletedImages) {
                    try {
                        await galeriaApi.deleteImage(targetId, url);
                        deleted++;
                        setSavingProgress(80 + (deleted / total) * 10);
                    } catch (e) {
                        console.error("Error eliminando imagen", e);
                    }
                }
            }

            // =========================
            // ELIMINAR VIDEOS
            // =========================
            if (pendingDeletedVideos.length > 0) {
                setSavingStage('deletingVideos');
                setSavingProgress(90);
                let deleted = 0;
                const total = pendingDeletedVideos.length;
                for (const url of pendingDeletedVideos) {
                    try {
                        await galeriaApi.deleteVideo(targetId, url);
                        deleted++;
                        setSavingProgress(90 + (deleted / total) * 10);
                    } catch (e) {
                        console.error("Error eliminando video", e);
                    }
                }
            } else {
                setSavingProgress(95);
            }

            // =========================
            // FINALIZAR
            // =========================
            setSavingStage('finalizing');
            setSavingProgress(100);

            toast({
                title: editingGaleriaId
                    ? "Galería actualizada"
                    : "Galería creada",
                description: `"${formData.descripcion}" guardada correctamente.`,
            });

            // reset UI
            setIsDialogOpen(false);
            setEditingGaleriaId(null);
            setFormData(EMPTY_FORM);
            clearPendingChanges();

            // recargar tabla
            await loadGalerias();

            // seleccionar nueva galería automáticamente
            if (!editingGaleriaId && targetId) {
                setSelectedGaleriaId(targetId);
            }

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSaving(false);
            setSavingStage('idle');
            setSavingProgress(0);
        }
    };

    // Manejar selección de imágenes
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const invalid = files.filter((f) => !f.type.startsWith("image/"));
        if (invalid.length > 0) {
            toast({
                variant: "destructive",
                title: "Archivos inválidos",
                description: "Solo se permiten imágenes",
            });
            return;
        }

        const newPending = files.map((file) => ({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file,
            previewUrl: URL.createObjectURL(file),
        }));

        setPendingImageUploads((prev) => [...prev, ...newPending]);
        e.target.value = "";
    };

    // Manejar eliminación de imagen (existente o pendiente)
    const handleDeleteImage = async (imageUrl: string) => {
        const isPending = imageUrl.startsWith("blob:");
        if (isPending) {
            setPendingImageUploads((prev) => {
                const toRemove = prev.find((item) => item.previewUrl === imageUrl);
                if (toRemove) URL.revokeObjectURL(toRemove.previewUrl);
                return prev.filter((item) => item.previewUrl !== imageUrl);
            });
        } else {
            setExistingImages((prev) => prev.filter((url) => url !== imageUrl));
            setPendingDeletedImages((prev) => (prev.includes(imageUrl) ? prev : [...prev, imageUrl]));
        }
    };

    // Manejar selección de videos
    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const invalid = files.filter((f) => !f.type.startsWith("video/"));
        if (invalid.length > 0) {
            toast({
                variant: "destructive",
                title: "Archivos inválidos",
                description: "Solo se permiten videos",
            });
            return;
        }

        const newPending = files.map((file) => ({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
            file,
            name: file.name,
        }));

        setPendingVideoUploads((prev) => [...prev, ...newPending]);
        e.target.value = "";
    };

    // Manejar eliminación de video (existente o pendiente)
    const handleDeleteVideo = (videoUrl: string) => {
        const isPending = !videoUrl.startsWith("http"); // heuristic, adjust if needed
        if (isPending) {
            setPendingVideoUploads((prev) => prev.filter((item) => item.name !== videoUrl));
        } else {
            setExistingVideos((prev) => prev.filter((url) => url !== videoUrl));
            setPendingDeletedVideos((prev) => (prev.includes(videoUrl) ? prev : [...prev, videoUrl]));
        }
    };

    // Eliminar galería
    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta galería? Esta acción no se puede deshacer.")) return;
        try {
            await galeriaApi.deleteGallery(id);
            if (selectedGaleriaId === id) setSelectedGaleriaId("");
            toast({ title: "Galería eliminada" });
            void loadGalerias();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleReactivate = async (id: string) => {
        if (!confirm("¿Reactivar esta galería?")) return;
        try {
            const updated = await galeriaApi.reactivate(id); // Asegúrate de tener este método
            // Actualización optimista: reemplazamos la galería en el estado
            setGalerias(prev => prev.map(n => n.id === updated.id ? updated : n));
            toast({ title: "Galería reactivada" });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al reactivar",
                description: getApiErrorMessage(error),
            });
        }
    };

    // Editar el seleccionado desde el EntityPicker
    const handleEditSelected = async () => {
        if (!selectedGaleriaId) return;
        const gal = galerias.find((g) => g.id === selectedGaleriaId);
        if (!gal) {
            toast({
                variant: "destructive",
                title: "Selección inválida",
                description: "La galería seleccionada ya no existe.",
            });
            setSelectedGaleriaId("");
            return;
        }
        await openForm(gal);
    };

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Gestión de Galerías</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra las galerías de imágenes y videos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => void loadGalerias()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => openForm()}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Galería
                    </Button>
                </div>
            </div>

            {/* Selector y búsqueda */}
            <div className="rounded-md border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
                    <EntityPicker
                        label="Búsqueda de galerías"
                        searchLabel="Buscar por descripción"
                        selectLabel="Selecciona una galería"
                        query={searchQuery}
                        value={selectedGaleriaId}
                        options={galeriaOptions}
                        onQueryChange={setSearchQuery}
                        onValueChange={setSelectedGaleriaId}
                        allowEmpty
                        emptyLabel="Todas las galerías"
                        disabled={isLoading}
                    />

                    {/* SELECT separado como columna propia */}
                    <div className="flex items-end gap-2">
                        <div className="space-y-1 min-w-[140px]">
                            <Label htmlFor="statusFilter" className="text-xs">
                                Estado
                            </Label>
                            <Select
                                value={statusFilter}
                                onValueChange={(value: "todos" | "activo" | "inactivo") =>
                                    setStatusFilter(value)
                                }
                            >
                                <SelectTrigger id="statusFilter">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todas</SelectItem>
                                    <SelectItem value="activo">Activas</SelectItem>
                                    <SelectItem value="inactivo">Inactivas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* BOTONES */}
                        <div className="flex items-end gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleEditSelected()}
                                disabled={!selectedGaleriaId || isLoading}
                            >
                                Editar seleccionado
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedGaleriaId("");
                                    setStatusFilter("todos");
                                }}
                                disabled={isLoading}
                            >
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de galerías */}
            <div className="rounded-md border bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Imágenes</TableHead>
                                <TableHead>Videos</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Cargando galerías...
                                    </TableCell>
                                </TableRow>
                            ) : filteredGalerias.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No hay galerías disponibles.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredGalerias.map((gal) => (
                                    <TableRow key={gal.id}>
                                        <TableCell className="font-medium max-w-xs truncate">
                                            {gal.descripcion || "Sin descripción"}
                                        </TableCell>
                                        <TableCell>{gal.imagenes.length}</TableCell>
                                        <TableCell>{gal.videos.length}</TableCell>
                                        <TableCell>
                                            {gal.estatus ? (
                                                <Badge className="bg-green-100 text-green-800">Activa</Badge>
                                            ) : (
                                                <Badge className="bg-gray-100 text-gray-800">Inactiva</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {formatDate(gal.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => openForm(gal)}
                                                >
                                                    Editar
                                                </Button>

                                                {gal.estatus ? (
                                                    // Si está activa → botón de eliminar (rojo)
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => void handleDelete(gal.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    // Si está inactiva → botón de reactivar (verde)
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                        onClick={() => void handleReactivate(gal.id)}
                                                    >
                                                        <RotateCcw className="h-4 w-4 mr-1" />
                                                        Reactivar
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
            </div>

            {/* Diálogo de creación/edición */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingGaleriaId ? "Editar Galería" : "Nueva Galería"}
                        </DialogTitle>
                        <DialogDescription>
                            Completa los campos para {editingGaleriaId ? "editar" : "crear"} la galería.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {isLoadingDetail && (
                            <p className="text-sm text-muted-foreground">Cargando datos...</p>
                        )}

                        {/* Campo descripción */}
                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción *</Label>
                            <Textarea
                                id="descripcion"
                                placeholder="Descripción de la galería"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ descripcion: e.target.value })}
                                disabled={isLoadingDetail || isSaving}
                                rows={3}
                            />
                        </div>

                        {/* Sección de imágenes */}
                        <div className="space-y-2 border-t pt-4">
                            <Label>Imágenes</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                                disabled={isSaving}
                            />
                            {(pendingImageUploads.length > 0 || pendingDeletedImages.length > 0) && (
                                <p className="text-xs text-muted-foreground">
                                    Cambios pendientes de imágenes. Se aplican al guardar.
                                </p>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {/* Imágenes existentes solo en edición */}
                                {editingGaleriaId && existingImages.map((url) => (
                                    <div key={url} className="relative border rounded-md overflow-hidden">
                                        <img src={url} alt="Imagen" className="h-24 w-full object-cover" />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="absolute top-1 right-1 h-7 w-7"
                                            onClick={() => void handleDeleteImage(url)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {/* Previsualizaciones de nuevas imágenes (siempre se muestran) */}
                                {pendingImageUploads.map((item) => (
                                    <div key={item.id} className="relative border rounded-md overflow-hidden">
                                        <img src={item.previewUrl} alt="Preview" className="h-24 w-full object-cover" />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="absolute top-1 right-1 h-7 w-7"
                                            onClick={() => void handleDeleteImage(item.previewUrl)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {!editingGaleriaId && pendingImageUploads.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Puedes seleccionar imágenes ahora. Se subirán automáticamente al guardar la galería.
                                </p>
                            )}
                        </div>

                        {/* Sección de videos */}
                        <div className="space-y-2 border-t pt-4">
                            <Label>Videos</Label>
                            <Input
                                type="file"
                                accept="video/*"
                                multiple
                                onChange={handleVideoSelect}
                                disabled={isSaving}
                            />
                            {(pendingVideoUploads.length > 0 || pendingDeletedVideos.length > 0) && (
                                <p className="text-xs text-muted-foreground">
                                    Cambios pendientes de videos. Se aplican al guardar.
                                </p>
                            )}
                            <div className="space-y-2">
                                {/* Videos existentes solo en edición */}
                                {editingGaleriaId && existingVideos.map((url, idx) => (
                                    <div key={url} className="flex items-center justify-between p-2 bg-muted rounded">
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate">
                                            Video {idx + 1}
                                        </a>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => handleDeleteVideo(url)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {/* Nuevos videos pendientes (siempre se muestran) */}
                                {pendingVideoUploads.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                        <span className="text-sm truncate">{item.name}</span>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => handleDeleteVideo(item.name)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {!editingGaleriaId && pendingVideoUploads.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Puedes seleccionar videos ahora. Se subirán automáticamente al guardar la galería.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Barra de progreso */}
                    {isSaving && (
                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    {savingStage === 'creating' && 'Creando galería...'}
                                    {savingStage === 'uploadingImages' && 'Subiendo imágenes...'}
                                    {savingStage === 'uploadingVideos' && 'Subiendo videos...'}
                                    {savingStage === 'deletingImages' && 'Eliminando imágenes...'}
                                    {savingStage === 'deletingVideos' && 'Eliminando videos...'}
                                    {savingStage === 'finalizing' && 'Finalizando...'}
                                </span>
                                <span>{savingProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${savingProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setEditingGaleriaId(null);
                                setFormData(EMPTY_FORM);
                                clearPendingChanges();
                                setSavingStage('idle');
                                setSavingProgress(0);
                            }}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={isSaving || isLoadingDetail}>
                            {isSaving ? "Guardando..." : "Guardar Galería"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}