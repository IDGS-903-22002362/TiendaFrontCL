"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { galeriaApi } from "@/lib/api/galeria";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trash2, Upload, Image, Video } from "lucide-react";

// Interfaz local de galería (puedes importar la global)
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

// Estado inicial del formulario (solo descripción)
const EMPTY_FORM = {
    descripcion: "",
};

// Utilidades de formato (adaptadas de noticias)
function parseDate(value: any): Date | null {
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

function formatDate(value: any): string {
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

export default function EmpleadoClubGaleriaPage() {
    const [galerias, setGalerias] = useState<Galeria[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGaleriaId, setSelectedGaleriaId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    // Estado para subida de imágenes
    const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    // Estado para subida de videos
    const [selectedVideoFiles, setSelectedVideoFiles] = useState<File[]>([]);
    const [videoPreviews, setVideoPreviews] = useState<string[]>([]); // solo nombres

    const { toast } = useToast();

    // Cargar lista de galerías
    const loadGalerias = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await galeriaApi.getAll();
            setGalerias(data);
            // Si la galería seleccionada ya no existe, limpiar
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

    // Galería seleccionada
    const selectedGaleria = galerias.find((g) => g.id === selectedGaleriaId);

    // Seleccionar una galería y cargar sus datos en el formulario
    const handleSelectGaleria = useCallback(
        (id: string) => {
            setSelectedGaleriaId(id);
            const gal = galerias.find((g) => g.id === id);
            if (gal) {
                setForm({ descripcion: gal.descripcion });
                // Limpiar archivos pendientes de subida
                setSelectedImageFiles([]);
                setImagePreviews([]);
                setSelectedVideoFiles([]);
                setVideoPreviews([]);
            }
        },
        [galerias]
    );

    // Limpiar selección y formulario (para crear nuevo)
    const handleClear = useCallback(() => {
        setSelectedGaleriaId("");
        setForm(EMPTY_FORM);
        setSelectedImageFiles([]);
        setImagePreviews([]);
        setSelectedVideoFiles([]);
        setVideoPreviews([]);
    }, []);

    // Filtro de búsqueda por descripción
    const filteredGalerias = useMemo(() => {
        if (!searchQuery.trim()) return galerias;
        const normalized = normalizeSearch(searchQuery);
        return galerias.filter((g) =>
            normalizeSearch(g.descripcion).includes(normalized)
        );
    }, [searchQuery, galerias]);

    // Manejo de selección de imágenes
    const handleImageSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            // Validar tipo
            const invalid = files.filter((f) => !f.type.startsWith("image/"));
            if (invalid.length > 0) {
                toast({
                    variant: "destructive",
                    title: "Archivos inválidos",
                    description: "Solo se permiten archivos de imagen",
                });
                return;
            }

            // Limitar cantidad (opcional, el backend también tiene límites)
            if (selectedImageFiles.length + files.length > 10) {
                toast({
                    variant: "destructive",
                    title: "Demasiadas imágenes",
                    description: "Máximo 10 imágenes por lote",
                });
                return;
            }

            // Generar previsualizaciones
            files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (typeof event.target?.result === "string") {
                        setImagePreviews((prev) => [...prev, event.target!.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            });

            setSelectedImageFiles((prev) => [...prev, ...files]);
        },
        [selectedImageFiles.length, toast]
    );

    const handleRemoveImagePreview = useCallback((index: number) => {
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        setSelectedImageFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Manejo de selección de videos
    const handleVideoSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            // Validar tipo de video (ampliar según necesidades)
            const invalid = files.filter((f) => !f.type.startsWith("video/"));
            if (invalid.length > 0) {
                toast({
                    variant: "destructive",
                    title: "Archivos inválidos",
                    description: "Solo se permiten archivos de video",
                });
                return;
            }

            if (selectedVideoFiles.length + files.length > 5) {
                toast({
                    variant: "destructive",
                    title: "Demasiados videos",
                    description: "Máximo 5 videos por lote",
                });
                return;
            }

            // Para videos solo guardamos los nombres como preview
            const newPreviews = files.map((f) => f.name);
            setVideoPreviews((prev) => [...prev, ...newPreviews]);
            setSelectedVideoFiles((prev) => [...prev, ...files]);
        },
        [selectedVideoFiles.length, toast]
    );

    const handleRemoveVideoPreview = useCallback((index: number) => {
        setVideoPreviews((prev) => prev.filter((_, i) => i !== index));
        setSelectedVideoFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Guardar (crear o actualizar descripción)
    const handleSave = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            if (!form.descripcion.trim()) {
                toast({
                    variant: "destructive",
                    title: "Campo requerido",
                    description: "La descripción no puede estar vacía",
                });
                return;
            }

            setIsSaving(true);
            try {
                if (selectedGaleria) {
                    // Actualizar descripción de galería existente
                    // NOTA: El backend no tiene endpoint PUT para actualizar descripción.
                    // Por ahora solo se puede cambiar descripción al crear.
                    // Si necesitas actualizar, deberías implementar un endpoint en el backend.
                    toast({
                        title: "Información",
                        description: "La descripción solo se puede modificar creando una nueva galería.",
                    });
                    // Opcional: podrías implementar una función en el backend para actualizar.
                } else {
                    // Crear nueva galería
                    const nueva = await galeriaApi.create({ descripcion: form.descripcion });
                    setGalerias((prev) => [...prev, nueva]);
                    toast({
                        title: "Galería creada",
                        description: `"${form.descripcion}" ha sido creada.`,
                    });
                    handleClear();
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al guardar",
                    description: getApiErrorMessage(error),
                });
            } finally {
                setIsSaving(false);
            }
        },
        [form.descripcion, selectedGaleria, toast, handleClear]
    );

    // Subir imágenes a la galería seleccionada
    const handleUploadImages = useCallback(async () => {
        if (!selectedGaleria) return;
        if (selectedImageFiles.length === 0) {
            toast({ title: "Selecciona al menos una imagen" });
            return;
        }

        setIsSaving(true);
        try {
            const urls = await galeriaApi.uploadImages(selectedGaleria.id, selectedImageFiles);
            // Actualizar la galería local
            setGalerias((prev) =>
                prev.map((g) =>
                    g.id === selectedGaleria.id
                        ? { ...g, imagenes: [...g.imagenes, ...urls] }
                        : g
                )
            );
            setSelectedImageFiles([]);
            setImagePreviews([]);
            toast({
                title: "Imágenes subidas",
                description: `${urls.length} imagen(es) agregada(s) correctamente.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al subir imágenes",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSaving(false);
        }
    }, [selectedGaleria, selectedImageFiles, toast]);

    // Subir videos a la galería seleccionada
    const handleUploadVideos = useCallback(async () => {
        if (!selectedGaleria) return;
        if (selectedVideoFiles.length === 0) {
            toast({ title: "Selecciona al menos un video" });
            return;
        }

        setIsSaving(true);
        try {
            const urls = await galeriaApi.uploadVideos(selectedGaleria.id, selectedVideoFiles);
            setGalerias((prev) =>
                prev.map((g) =>
                    g.id === selectedGaleria.id
                        ? { ...g, videos: [...g.videos, ...urls] }
                        : g
                )
            );
            setSelectedVideoFiles([]);
            setVideoPreviews([]);
            toast({
                title: "Videos subidos",
                description: `${urls.length} video(s) agregado(s) correctamente.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al subir videos",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSaving(false);
        }
    }, [selectedGaleria, selectedVideoFiles, toast]);

    // Eliminar una imagen
    const handleDeleteImage = useCallback(
        async (imageUrl: string) => {
            if (!selectedGaleria) return;
            if (!confirm("¿Eliminar esta imagen?")) return;

            setIsSaving(true);
            try {
                await galeriaApi.deleteImage(selectedGaleria.id, imageUrl);
                setGalerias((prev) =>
                    prev.map((g) =>
                        g.id === selectedGaleria.id
                            ? { ...g, imagenes: g.imagenes.filter((url) => url !== imageUrl) }
                            : g
                    )
                );
                toast({ title: "Imagen eliminada" });
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al eliminar imagen",
                    description: getApiErrorMessage(error),
                });
            } finally {
                setIsSaving(false);
            }
        },
        [selectedGaleria, toast]
    );

    // Eliminar un video
    const handleDeleteVideo = useCallback(
        async (videoUrl: string) => {
            if (!selectedGaleria) return;
            if (!confirm("¿Eliminar este video?")) return;

            setIsSaving(true);
            try {
                await galeriaApi.deleteVideo(selectedGaleria.id, videoUrl);
                setGalerias((prev) =>
                    prev.map((g) =>
                        g.id === selectedGaleria.id
                            ? { ...g, videos: g.videos.filter((url) => url !== videoUrl) }
                            : g
                    )
                );
                toast({ title: "Video eliminado" });
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al eliminar video",
                    description: getApiErrorMessage(error),
                });
            } finally {
                setIsSaving(false);
            }
        },
        [selectedGaleria, toast]
    );

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Gestión de Galería</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Panel izquierdo: lista de galerías */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Galerías</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Buscar por descripción..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isLoading}
                            />
                            <Button
                                variant="outline"
                                onClick={handleClear}
                                disabled={!selectedGaleriaId}
                                className="w-full"
                            >
                                Nueva Galería
                            </Button>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredGalerias.map((gal) => (
                                    <Button
                                        key={gal.id}
                                        variant={selectedGaleriaId === gal.id ? "default" : "outline"}
                                        className="w-full justify-start h-auto py-2 truncate"
                                        onClick={() => handleSelectGaleria(gal.id)}
                                    >
                                        <div className="flex flex-col items-start w-full overflow-hidden">
                                            <span className="font-semibold truncate w-full">
                                                {gal.descripcion || "Sin descripción"}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatDate(gal.createdAt)} · {gal.imagenes.length} img · {gal.videos.length} vid
                                            </span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Panel derecho: detalles y edición */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Formulario de descripción */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedGaleria ? "Editar Descripción" : "Crear Nueva Galería"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="descripcion">Descripción *</Label>
                                    <Textarea
                                        id="descripcion"
                                        placeholder="Descripción de la galería"
                                        value={form.descripcion}
                                        onChange={(e) => setForm({ descripcion: e.target.value })}
                                        required
                                        disabled={isSaving}
                                        rows={3}
                                    />
                                </div>
                                <Button type="submit" disabled={isSaving || !form.descripcion.trim()}>
                                    {isSaving ? "Guardando..." : selectedGaleria ? "Actualizar" : "Crear"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Solo si hay una galería seleccionada mostramos las secciones de archivos */}
                    {selectedGaleria && (
                        <>
                            {/* Subir imágenes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Image className="h-5 w-5" /> Imágenes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Grid de imágenes existentes */}
                                    {selectedGaleria.imagenes.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {selectedGaleria.imagenes.map((url, idx) => (
                                                <div key={idx} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                                                    <img
                                                        src={url}
                                                        alt={`Imagen ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteImage(url)}
                                                        className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        disabled={isSaving}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Subir nuevas imágenes */}
                                    <div className="border-t pt-4">
                                        <Label htmlFor="imagenes">Agregar imágenes</Label>
                                        <div className="flex flex-wrap gap-2 items-center mt-2">
                                            <Input
                                                id="imagenes"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageSelect}
                                                disabled={isSaving}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleUploadImages}
                                                disabled={isSaving || selectedImageFiles.length === 0}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Subir
                                            </Button>
                                        </div>

                                        {/* Previsualización de imágenes a subir */}
                                        {imagePreviews.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm text-gray-500 mb-2">
                                                    {imagePreviews.length} imagen(es) pendiente(s)
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                    {imagePreviews.map((preview, index) => (
                                                        <div
                                                            key={index}
                                                            className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square"
                                                        >
                                                            <img
                                                                src={preview}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveImagePreview(index)}
                                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                            >
                                                                <span className="text-white text-sm">Eliminar</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Subir videos */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Video className="h-5 w-5" /> Videos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Lista de videos existentes */}
                                    {selectedGaleria.videos.length > 0 && (
                                        <div className="space-y-2">
                                            {selectedGaleria.videos.map((url, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline truncate flex-1"
                                                    >
                                                        Video {idx + 1}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteVideo(url)}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                        disabled={isSaving}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Subir nuevos videos */}
                                    <div className="border-t pt-4">
                                        <Label htmlFor="videos">Agregar videos</Label>
                                        <div className="flex flex-wrap gap-2 items-center mt-2">
                                            <Input
                                                id="videos"
                                                type="file"
                                                accept="video/*"
                                                multiple
                                                onChange={handleVideoSelect}
                                                disabled={isSaving}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleUploadVideos}
                                                disabled={isSaving || selectedVideoFiles.length === 0}
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Subir
                                            </Button>
                                        </div>

                                        {/* Lista de videos pendientes */}
                                        {videoPreviews.length > 0 && (
                                            <div className="mt-4 space-y-1">
                                                <p className="text-sm text-gray-500">Videos a subir:</p>
                                                {videoPreviews.map((name, index) => (
                                                    <div key={index} className="flex items-center justify-between p-1 bg-gray-50 rounded">
                                                        <span className="text-sm truncate flex-1">{name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveVideoPreview(index)}
                                                            className="text-red-600 text-xs ml-2"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>

            {/* Tabla resumen de galerías */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado General</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Imágenes</TableHead>
                                    <TableHead>Videos</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-500">
                                            Cargando galerías...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredGalerias.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-500">
                                            No hay galerías disponibles
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredGalerias.map((gal) => (
                                        <TableRow
                                            key={gal.id}
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleSelectGaleria(gal.id)}
                                        >
                                            <TableCell className="font-medium max-w-xs truncate">
                                                {gal.descripcion}
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