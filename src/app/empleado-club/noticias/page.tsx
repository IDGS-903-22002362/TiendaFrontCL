"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { noticiasApi, type Noticia, type CategoriaNoticia } from "@/lib/api/noticias";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Plus, RefreshCw, X, RotateCcw } from "lucide-react"; // Añadido RotateCcw
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import { AILoadingModal } from "@/components/ui/ai-loading-modal";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const CATEGORIAS: CategoriaNoticia[] = ["femenil", "varonil"];

const EMPTY_FORM = {
    titulo: "",
    descripcion: "",
    contenido: "",
    categoria: "mixto" as CategoriaNoticia,
};

function normalizeSearch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

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

function formatCategoria(categoria: unknown): string {
    if (!categoria || typeof categoria !== "string") return "Sin categoría";
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

type PendingImageUpload = {
    id: string;
    file: File;
    previewUrl: string;
};

// Extendemos el tipo Noticia para incluir 'origen' (si no está definido en la API)
type NoticiaConOrigen = Omit<Noticia, "origen"> & {
    origen?: Noticia["origen"];
};

export default function EmpleadoClubNoticiasPage() {
    const [noticias, setNoticias] = useState<NoticiaConOrigen[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNoticiaId, setSelectedNoticiaId] = useState("");
    const [estatusFilter, setEstatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingNoticiaId, setEditingNoticiaId] = useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [generateAIEnabled, setGenerateAIEnabled] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<CategoriaNoticia | "todos">("todos");

    // Estados para el modal de carga
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationMode, setGenerationMode] = useState<"ai" | "normal">("normal");
    const [generationStatus, setGenerationStatus] = useState("");

    // Imágenes (solo para creación)
    const [pendingImageUploads, setPendingImageUploads] = useState<PendingImageUpload[]>([]);

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { toast } = useToast();

    const loadNoticias = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await noticiasApi.getAll();
            setNoticias(data as NoticiaConOrigen[]);
            setSelectedNoticiaId((current) =>
                current && !data.some((n) => n.id === current) ? "" : current
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

    // Opciones del selector: solo noticias con origen === "app"
    const noticiaOptions: EntityOption[] = useMemo(
        () =>
            noticias
                .filter((n) => n.origen === "app")
                .map((n) => ({
                    id: n.id,
                    label: n.titulo,
                    subtitle: `${n.descripcion?.slice(0, 50)}...`,
                })),
        [noticias]
    );

    // Filtrado: origen "app", luego búsqueda, luego estado
    const filteredNoticias = useMemo(() => {
        const query = normalizeSearch(searchQuery);
        return noticias
            .filter((n) => n.origen === "app")
            .filter((n) => {
                if (estatusFilter === "activo") return n.estatus === true;
                if (estatusFilter === "inactivo") return n.estatus === false;
                return true;
            })
            .filter((n) => {
                if (selectedNoticiaId && n.id !== selectedNoticiaId) return false;
                if (!query) return true;
                return (
                    normalizeSearch(n.titulo).includes(query) ||
                    normalizeSearch(n.descripcion || "").includes(query)
                );
            })
            .filter((n) => {
                if (categoryFilter === "todos") return true;
                return n.categoria === categoryFilter;
            });
    }, [searchQuery, noticias, selectedNoticiaId, estatusFilter, categoryFilter]);

    // Noticias paginadas
    const paginatedNoticias = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredNoticias.slice(start, start + itemsPerPage);
    }, [filteredNoticias, currentPage]);

    // Total de páginas
    const totalPages = Math.ceil(filteredNoticias.length / itemsPerPage);

    // Resetear a página 1 cuando cambien los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedNoticiaId, estatusFilter]);

    const clearPendingImages = () => {
        pendingImageUploads.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setPendingImageUploads([]);
    };

    const openForm = async (noticia?: NoticiaConOrigen) => {
        if (noticia) {
            setEditingNoticiaId(noticia.id);
            setIsDialogOpen(true);
            setIsLoadingDetail(true);

            try {
                let detail: NoticiaConOrigen;
                if (noticiasApi.getById) {
                    detail = (await noticiasApi.getById(noticia.id)) as NoticiaConOrigen;
                } else {
                    detail = noticia;
                }

                setFormData({
                    titulo: detail.titulo,
                    descripcion: detail.descripcion || "",
                    contenido: detail.contenido,
                    categoria: detail.categoria,
                });
                setGenerateAIEnabled(false);
                clearPendingImages();
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
            setEditingNoticiaId(null);
            setFormData(EMPTY_FORM);
            setGenerateAIEnabled(true);
            clearPendingImages();
            setIsDialogOpen(true);
        }
    };

    const handleSave = async () => {
        if (!formData.titulo.trim() || !formData.descripcion.trim() || !formData.contenido.trim()) {
            toast({
                variant: "destructive",
                title: "Campos requeridos",
                description: "Título, descripción y contenido son obligatorios",
            });
            return;
        }

        if (editingNoticiaId) {
            setIsSaving(true);
            try {
                const payload = {
                    titulo: formData.titulo.trim(),
                    descripcion: formData.descripcion.trim(),
                    contenido: formData.contenido.trim(),
                    categoria: formData.categoria,
                };
                await noticiasApi.update(editingNoticiaId, payload);
                toast({
                    title: "Noticia actualizada",
                    description: `"${payload.titulo}" ha sido actualizada.`,
                });
                setIsDialogOpen(false);
                setEditingNoticiaId(null);
                setFormData(EMPTY_FORM);
                clearPendingImages();
                void loadNoticias();
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al guardar",
                    description: getApiErrorMessage(error),
                });
            } finally {
                setIsSaving(false);
            }
        } else {
            setIsGenerating(true);
            setGenerationMode(generateAIEnabled ? "ai" : "normal");
            setGenerationProgress(0);
            setGenerationStatus(generateAIEnabled ? "Generando contenido con IA..." : "Subiendo imágenes...");

            const interval = setInterval(() => {
                setGenerationProgress(prev => (prev >= 90 ? prev : prev + 5));
            }, 300);

            try {
                const payload = {
                    titulo: formData.titulo.trim(),
                    descripcion: formData.descripcion.trim(),
                    contenido: formData.contenido.trim(),
                    categoria: formData.categoria,
                };

                const newNoticia = await noticiasApi.createWithMediaAndIA(
                    payload,
                    pendingImageUploads.length > 0 ? pendingImageUploads.map(p => p.file) : undefined,
                    generateAIEnabled
                );

                clearInterval(interval);
                setGenerationProgress(100);
                setGenerationStatus("¡Completado!");

                setTimeout(() => {
                    setIsGenerating(false);
                    setIsDialogOpen(false);
                    setEditingNoticiaId(null);
                    setFormData(EMPTY_FORM);
                    clearPendingImages();
                    void loadNoticias();
                    toast({
                        title: "Noticia creada",
                        description: `"${payload.titulo}" ha sido creada.`,
                    });
                }, 1000);

            } catch (error) {
                clearInterval(interval);
                setIsGenerating(false);
                toast({
                    variant: "destructive",
                    title: "Error al guardar",
                    description: getApiErrorMessage(error),
                });
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta noticia? Esta acción no se puede deshacer.")) return;
        try {
            await noticiasApi.delete(id);
            if (selectedNoticiaId === id) setSelectedNoticiaId("");
            toast({ title: "Noticia eliminada" });
            void loadNoticias();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        }
    };

    // NUEVA FUNCIÓN: Reactivar noticia
    const handleReactivate = async (id: string) => {
        if (!confirm("¿Reactivar esta noticia?")) return;
        try {
            const updated = await noticiasApi.reactivate(id); // Asegúrate de tener este método
            // Actualización optimista: reemplazamos la noticia en el estado
            setNoticias(prev => prev.map(n => n.id === updated.id ? updated : n));
            toast({ title: "Noticia reactivada" });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al reactivar",
                description: getApiErrorMessage(error),
            });
        }
    };

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

        if (pendingImageUploads.length + files.length > 5) {
            toast({
                variant: "destructive",
                title: "Demasiadas imágenes",
                description: "Máximo 5 imágenes por noticia",
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

    const handleRemoveImage = (previewUrl: string) => {
        setPendingImageUploads((prev) => {
            const toRemove = prev.find((item) => item.previewUrl === previewUrl);
            if (toRemove) URL.revokeObjectURL(toRemove.previewUrl);
            return prev.filter((item) => item.previewUrl !== previewUrl);
        });
    };

    const handleEditSelected = async () => {
        if (!selectedNoticiaId) return;
        const noticia = noticias.find((n) => n.id === selectedNoticiaId);
        if (!noticia) {
            toast({
                variant: "destructive",
                title: "Selección inválida",
                description: "La noticia seleccionada ya no existe.",
            });
            setSelectedNoticiaId("");
            return;
        }
        await openForm(noticia);
    };

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Gestión de Noticias</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra las noticias del club.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => void loadNoticias()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => openForm()}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Noticia
                    </Button>
                </div>
            </div>

            {/* Selector, búsqueda y filtro de estado */}
            <div className="rounded-md border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
                    <EntityPicker
                        label="Búsqueda de noticias (app)"
                        searchLabel="Buscar por título o descripción"
                        selectLabel="Selecciona una noticia"
                        query={searchQuery}
                        value={selectedNoticiaId}
                        options={noticiaOptions}
                        onQueryChange={setSearchQuery}
                        onValueChange={setSelectedNoticiaId}
                        allowEmpty
                        emptyLabel="Todas las noticias (app)"
                        disabled={isLoading}
                    />
                    <div className="space-y-1 min-w-[140px]">
                        <Label htmlFor="categoryFilter" className="text-xs">Categoría</Label>
                        <Select
                            value={categoryFilter}
                            onValueChange={(value: CategoriaNoticia | "todos") => setCategoryFilter(value)}
                        >
                            <SelectTrigger id="categoryFilter">
                                <SelectValue placeholder="Filtrar por categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todas</SelectItem>
                                {CATEGORIAS.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="space-y-1 min-w-[140px]" >
                            <Label htmlFor="estatusFilter" className="text-xs">Estado</Label>
                            <Select
                                value={estatusFilter}
                                onValueChange={(value: "todos" | "activo" | "inactivo") => setEstatusFilter(value)}
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
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => void handleEditSelected()}
                        disabled={!selectedNoticiaId || isLoading}
                    >
                        Editar seleccionado
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedNoticiaId("");
                            setEstatusFilter("todos");
                            setCategoryFilter("todos");
                        }}
                        disabled={isLoading}
                    >
                        Limpiar filtros
                    </Button>
                </div>
            </div>

            {/* Tabla de noticias */}
            <div className="rounded-md border bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Título</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Likes</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Cargando noticias...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedNoticias.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No hay noticias que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedNoticias.map((noticia) => (
                                    <TableRow key={noticia.id}>
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
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => openForm(noticia)}
                                                >
                                                    Editar
                                                </Button>
                                                {noticia.estatus ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => void handleDelete(noticia.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                        onClick={() => void handleReactivate(noticia.id)}
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

                {/* Paginación e indicador de resultados */}
                {filteredNoticias.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredNoticias.length)} de {filteredNoticias.length} noticias
                        </p>
                        {totalPages > 1 && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                                            }}
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
                                                isActive={page === currentPage}
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
                                                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
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

            {/* Diálogo de creación/edición */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingNoticiaId ? "Editar Noticia" : "Nueva Noticia"}
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
                                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                disabled={isLoadingDetail || isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion">Descripción corta *</Label>
                            <Input
                                id="descripcion"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                disabled={isLoadingDetail || isSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="categoria">Categoría *</Label>
                            <Select
                                value={formData.categoria}
                                onValueChange={(valor) =>
                                    setFormData({ ...formData, categoria: valor as CategoriaNoticia })
                                }
                                disabled={isLoadingDetail || isSaving}
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
                                rows={6}
                                value={formData.contenido}
                                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                                disabled={isLoadingDetail || isSaving}
                            />
                        </div>

                        {/* Imágenes solo al crear */}
                        {!editingNoticiaId && (
                            <div className="space-y-2 border-t pt-4">
                                <Label htmlFor="imagenes">Imágenes (máximo 5)</Label>
                                <Input
                                    id="imagenes"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageSelect}
                                    disabled={isSaving || pendingImageUploads.length >= 5}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {pendingImageUploads.length}/5 imágenes seleccionadas
                                </p>
                                {pendingImageUploads.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {pendingImageUploads.map((item) => (
                                            <div key={item.id} className="relative border rounded-md overflow-hidden">
                                                <img src={item.previewUrl} alt="Preview" className="h-24 w-full object-cover" />
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute top-1 right-1 h-7 w-7"
                                                    onClick={() => handleRemoveImage(item.previewUrl)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Checkbox de IA solo al crear */}
                        {!editingNoticiaId && (
                            <div className="flex items-center gap-3 pt-4 border-t">
                                <input
                                    type="checkbox"
                                    id="generateAI"
                                    checked={generateAIEnabled}
                                    onChange={(e) => setGenerateAIEnabled(e.target.checked)}
                                    disabled={isSaving}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <Label htmlFor="generateAI" className="cursor-pointer text-sm">
                                    ✨ Generar resumen IA automáticamente
                                </Label>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setEditingNoticiaId(null);
                                setFormData(EMPTY_FORM);
                                clearPendingImages();
                            }}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={isSaving || isLoadingDetail}>
                            {isSaving ? "Guardando..." : "Guardar Noticia"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de carga para creación con IA o subida normal */}
            <AILoadingModal
                isOpen={isGenerating}
                onOpenChange={setIsGenerating}
                progress={generationProgress}
                mode={generationMode}
                status={generationStatus}
                title="Subiendo imágenes..."
            />
        </div>
    );
}
