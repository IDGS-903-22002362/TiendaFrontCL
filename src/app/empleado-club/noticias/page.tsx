"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { noticiasApi, type Noticia, type CategoriaNoticia } from "@/lib/api/noticias";
import { getApiErrorMessage } from "@/lib/api/errors";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CATEGORIAS: CategoriaNoticia[] = ["femenil", "varonil"];

const EMPTY_FORM = {
    id: "",
    titulo: "",
    descripcion: "",
    contenido: "",
    imagenes: [] as string[],
    categoria: "mixto" as CategoriaNoticia,
};

function normalizeSearch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

function parseDate(value: any): Date | null {
    if (!value) return null;

    // Si ya es un Date
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    // Si es un string
    if (typeof value === "string") {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Si es un objeto con método toDate() (Timestamp de Firestore)
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

function formatCategoria(categoria: any): string {
    if (!categoria || typeof categoria !== "string") return "Sin categoría";
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

export default function EmpleadoClubNoticiasPage() {
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNoticiaId, setSelectedNoticiaId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [generateAIEnabled, setGenerateAIEnabled] = useState(true);
    const { toast } = useToast();

    const loadNoticias = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await noticiasApi.getAll();
            setNoticias(data);
            setSelectedNoticiaId((current) =>
                current && !data.some((noticia) => noticia.id === current) ? "" : current,
            );
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar noticias",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadNoticias();
    }, [loadNoticias]);

    const selectedNoticia = noticias.find((n) => n.id === selectedNoticiaId);

    const handleSelectNoticia = useCallback((noticiaId: string) => {
        setSelectedNoticiaId(noticiaId);
        const noticia = noticias.find((n) => n.id === noticiaId);
        if (noticia) {
            setForm({
                id: noticia.id,
                titulo: noticia.titulo,
                descripcion: noticia.descripcion,
                contenido: noticia.contenido,
                imagenes: noticia.imagenes,
                categoria: noticia.categoria,
            });
        }
    }, [noticias]);

    const handleClear = useCallback(() => {
        setSelectedNoticiaId("");
        setForm(EMPTY_FORM);
        setSelectedImageFiles([]);
        setImagePreviews([]);
        setGenerateAIEnabled(true);
    }, []);

    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Validar que sean imágenes
        const invalidFiles = files.filter((f) => !f.type.startsWith("image/"));
        if (invalidFiles.length > 0) {
            toast({
                variant: "destructive",
                title: "Archivos inválidos",
                description: "Solo se permiten archivos de imagen",
            });
            return;
        }

        // Limitar a máximo 5 imágenes
        if (selectedImageFiles.length + files.length > 5) {
            toast({
                variant: "destructive",
                title: "Límite de imágenes",
                description: "Máximo 5 imágenes por noticia",
            });
            return;
        }

        // Generar previews
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
    }, [selectedImageFiles.length, toast]);

    const handleRemoveImagePreview = useCallback((index: number) => {
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        setSelectedImageFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const filteredNoticias = useMemo(() => {
        if (!searchQuery.trim()) return noticias;

        const normalized = normalizeSearch(searchQuery);
        return noticias.filter(
            (noticia) =>
                normalizeSearch(noticia.titulo).includes(normalized) ||
                normalizeSearch(noticia.descripcion).includes(normalized),
        );
    }, [searchQuery, noticias]);

    const handleSave = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setIsSaving(true);

            try {
                if (!form.titulo.trim() || !form.descripcion.trim() || !form.contenido.trim()) {
                    toast({
                        variant: "destructive",
                        title: "Campos requeridos",
                        description: "Título, descripción y contenido son obligatorios",
                    });
                    return;
                }

                const payload = {
                    titulo: form.titulo,
                    descripcion: form.descripcion,
                    contenido: form.contenido,
                    imagenes: form.imagenes,
                    categoria: form.categoria,
                };

                if (selectedNoticia) {
                    // Actualizar noticia existente
                    const updated = await noticiasApi.update(selectedNoticia.id, payload);
                    setNoticias((prev) =>
                        prev.map((n) => (n.id === updated.id ? updated : n)),
                    );
                    toast({
                        title: "Noticia actualizada",
                        description: `"${form.titulo}" ha sido actualizada correctamente`,
                    });
                } else {
                    // Crear nueva noticia CON imágenes e IA
                    toast({
                        title: "Creando noticia...",
                        description: "Esto puede tomar unos momentos mientras se suben las imágenes y se genera el contenido IA",
                    });

                    const newNoticia = await noticiasApi.createWithMediaAndIA(
                        payload,
                        selectedImageFiles.length > 0 ? selectedImageFiles : undefined,
                        generateAIEnabled
                    );
                    setNoticias((prev) => [...prev, newNoticia]);
                    toast({
                        title: "Noticia creada exitosamente",
                        description: `"${form.titulo}" ha sido creada con imágenes${generateAIEnabled ? " y contenido IA generado" : ""}`,
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
        [form, selectedNoticia, selectedImageFiles, generateAIEnabled, toast, handleClear],
    );

    const handleDelete = useCallback(async () => {
        if (!selectedNoticia) return;

        if (!confirm(`¿Eliminar "${selectedNoticia.titulo}"?`)) return;

        setIsSaving(true);

        try {
            await noticiasApi.delete(selectedNoticia.id);
            setNoticias((prev) => prev.filter((n) => n.id !== selectedNoticia.id));
            toast({
                title: "Noticia eliminada",
                description: `"${selectedNoticia.titulo}" ha sido eliminada`,
            });
            handleClear();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsSaving(false);
        }
    }, [selectedNoticia, toast, handleClear]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Gestión de Noticias</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Panel de búsqueda */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Noticias</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Buscar por título..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isLoading}
                            />

                            <Button
                                variant="outline"
                                onClick={handleClear}
                                disabled={!selectedNoticiaId}
                                className="w-full"
                            >
                                Nueva
                            </Button>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredNoticias.map((noticia) => (
                                    <Button
                                        key={noticia.id}
                                        variant={selectedNoticiaId === noticia.id ? "default" : "outline"}
                                        className="w-full justify-start h-auto flex-col items-start py-2 truncate"
                                        onClick={() => handleSelectNoticia(noticia.id)}
                                    >
                                        <span className="font-semibold truncate">{noticia.titulo}</span>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(noticia.createdAt)}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Panel de formulario */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>{selectedNoticia ? "Editar Noticia" : "Crear Noticia"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="titulo">Título *</Label>
                                        <Input
                                            id="titulo"
                                            placeholder="Título de la noticia"
                                            value={form.titulo}
                                            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                            required
                                            disabled={isSaving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="descripcion">Descripción Corta *</Label>
                                        <Input
                                            id="descripcion"
                                            placeholder="Resumen o descripción breve"
                                            value={form.descripcion}
                                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                            required
                                            disabled={isSaving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="categoria">Categoría *</Label>
                                        <Select
                                            value={form.categoria}
                                            onValueChange={(valor) =>
                                                setForm({ ...form, categoria: valor as CategoriaNoticia })
                                            }
                                            disabled={isSaving}
                                        >
                                            <SelectTrigger id="categoria">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIAS.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="contenido">Contenido *</Label>
                                        <Textarea
                                            id="contenido"
                                            placeholder="Contenido completo de la noticia"
                                            value={form.contenido}
                                            onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                                            required
                                            disabled={isSaving}
                                            rows={6}
                                        />
                                    </div>

                                    {/* Sección de imágenes - solo mostrar al crear */}
                                    {!selectedNoticia && (
                                        <div className="space-y-2 pt-4 border-t">
                                            <Label htmlFor="imagenes">Imágenes (máximo 5)</Label>
                                            <Input
                                                id="imagenes"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImageSelect}
                                                disabled={isSaving || imagePreviews.length >= 5}
                                                className="cursor-pointer"
                                            />
                                            <p className="text-sm text-gray-500">
                                                {imagePreviews.length}/5 imágenes seleccionadas
                                            </p>

                                            {/* Preview de imágenes */}
                                            {imagePreviews.length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                                                    {imagePreviews.map((preview, index) => (
                                                        <div
                                                            key={index}
                                                            className="relative group rounded-lg overflow-hidden bg-gray-100"
                                                        >
                                                            <img
                                                                src={preview}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-24 object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveImagePreview(index)}
                                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                            >
                                                                <span className="text-white text-sm font-semibold">
                                                                    Eliminar
                                                                </span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Switch de IA - solo mostrar al crear */}
                                    {!selectedNoticia && (
                                        <div className="flex items-center gap-3 pt-4 border-t">
                                            <input
                                                type="checkbox"
                                                id="generateAI"
                                                checked={generateAIEnabled}
                                                onChange={(e) => setGenerateAIEnabled(e.target.checked)}
                                                disabled={isSaving}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <Label
                                                htmlFor="generateAI"
                                                className="cursor-pointer text-sm"
                                            >
                                                ✨ Generar resumen IA automáticamente
                                            </Label>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={isSaving || !form.titulo.trim() || !form.descripcion.trim() || !form.contenido.trim()}
                                        className="flex-1"
                                    >
                                        {isSaving ? "Guardando..." : "Guardar"}
                                    </Button>
                                    {selectedNoticia && (
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
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tabla de noticias */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Noticias</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Likes</TableHead>
                                    <TableHead>Fecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-500">
                                            Cargando noticias...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredNoticias.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-500">
                                            No hay noticias disponibles
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredNoticias.map((noticia) => (
                                        <TableRow
                                            key={noticia.id}
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleSelectNoticia(noticia.id)}
                                        >
                                            <TableCell className="font-medium">{noticia.titulo}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {formatCategoria(noticia.categoria)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {noticia.estatus ? (
                                                    <Badge className="bg-green-100 text-green-800">Activa</Badge>
                                                ) : (
                                                    <Badge className="bg-gray-100 text-gray-800">Inactiva</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{noticia.likes}</TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {formatDate(noticia.createdAt)}
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
