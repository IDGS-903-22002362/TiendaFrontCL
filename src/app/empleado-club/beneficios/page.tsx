"use client";

import Image from "next/image";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, Film, Gift, ImageIcon, Link2, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
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
    ALLOWED_BENEFICIO_IMAGE_TYPES,
    ALLOWED_BENEFICIO_VIDEO_TYPES,
    BENEFICIO_DESTINO_LABELS,
    BENEFICIO_DESTINOS,
    BENEFICIO_MEDIA_SIZE_RECOMMENDATIONS,
    MAX_BENEFICIO_IMAGE_SIZE_BYTES,
    MAX_BENEFICIO_IMAGENES,
    MAX_BENEFICIO_PUNTOS_RECOMPENSA,
    MAX_BENEFICIO_VIDEO_SIZE_BYTES,
    beneficiosApi,
    resolveBeneficioImagenes,
    type Beneficio,
    type BeneficioDestinoModulo,
    type BeneficioMediaTipo,
    type BeneficioRedireccion,
    type CrearBeneficioDTO,
    type ActualizarBeneficioDTO,
} from "@/lib/api/beneficios";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";

type FormState = {
    titulo: string;
    descripcion: string;
    estatus: boolean;
    puntosRecompensaInput: string;
    mediaTipo: "none" | BeneficioMediaTipo;
    existingImagenes: string[];
    existingVideo?: string;
    redirectEnabled: boolean;
    redirectModulo: BeneficioDestinoModulo;
};

const EMPTY_FORM: FormState = {
    titulo: "",
    descripcion: "",
    estatus: true,
    puntosRecompensaInput: "0",
    mediaTipo: "imagen",
    existingImagenes: [],
    redirectEnabled: false,
    redirectModulo: "none",
};

type PendingMediaUpload = {
    id: string;
    file: File;
    previewUrl?: string;
    name: string;
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

function resolveMediaLabel(beneficio: Beneficio): string {
    if (beneficio.mediaTipo === "video" || beneficio.video) {
        return "Video";
    }

    const imagenes = resolveBeneficioImagenes(beneficio);
    if (imagenes.length > 1) {
        return `${imagenes.length} imágenes`;
    }

    if (beneficio.mediaTipo === "imagen" || imagenes.length === 1) {
        return "Imagen";
    }

    return "Sin media";
}

function resolveRedirectLabel(beneficio: Beneficio): string {
    const modulo = beneficio.redireccion?.modulo ?? "none";
    if (modulo === "none") {
        return "—";
    }

    return BENEFICIO_DESTINO_LABELS[modulo] ?? modulo;
}

function buildRedireccion(form: FormState): BeneficioRedireccion | undefined {
    if (!form.redirectEnabled || form.redirectModulo === "none") {
        return { modulo: "none" };
    }

    return {
        modulo: form.redirectModulo,
    };
}

const ALLOWED_REDIRECT_MODULOS = BENEFICIO_DESTINOS.filter(
    (destino) => destino !== "none",
);

function normalizeRedirectModulo(
    modulo: BeneficioDestinoModulo | string | undefined,
): BeneficioDestinoModulo {
    if (modulo && ALLOWED_REDIRECT_MODULOS.includes(modulo as BeneficioDestinoModulo)) {
        return modulo as BeneficioDestinoModulo;
    }

    return "none";
}

function formFromBeneficio(beneficio: Beneficio): FormState {
    const imagenes = resolveBeneficioImagenes(beneficio);
    const mediaTipo =
        beneficio.mediaTipo ??
        (beneficio.video ? "video" : imagenes.length > 0 ? "imagen" : "none");

    const redirectModulo = normalizeRedirectModulo(beneficio.redireccion?.modulo);

    return {
        titulo: beneficio.titulo,
        descripcion: beneficio.descripcion,
        estatus: beneficio.estatus,
        puntosRecompensaInput: formatPuntosRecompensaInput(beneficio.puntosRecompensa),
        mediaTipo,
        existingImagenes: imagenes,
        existingVideo: beneficio.video,
        redirectEnabled: redirectModulo !== "none",
        redirectModulo,
    };
}

function validateRedirectForm(_form: FormState): string | null {
    return null;
}

function formatPuntosRecompensaInput(value: number | undefined): string {
    const normalized = Math.max(
        0,
        Math.min(MAX_BENEFICIO_PUNTOS_RECOMPENSA, Math.floor(value ?? 0)),
    );
    return String(normalized);
}

function parsePuntosRecompensaInput(value: string): number {
    const trimmed = value.trim();
    if (!trimmed) {
        return 0;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }

    return Math.min(MAX_BENEFICIO_PUNTOS_RECOMPENSA, parsed);
}

function sanitizePuntosRecompensaInput(value: string): string {
    const digitsOnly = value.replace(/\D/g, "");
    if (!digitsOnly) {
        return "";
    }

    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) {
        return "";
    }

    return String(Math.min(MAX_BENEFICIO_PUNTOS_RECOMPENSA, parsed));
}

export default function EmpleadoClubBeneficiosPage() {
    const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBeneficioId, setSelectedBeneficioId] = useState("");
    const [estatusFilter, setEstatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemovingMedia, setIsRemovingMedia] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBeneficioId, setEditingBeneficioId] = useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
    const [pendingMediaUploads, setPendingMediaUploads] = useState<PendingMediaUpload[]>([]);
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
            pendingMediaUploads.forEach((upload) => {
                if (upload.previewUrl) {
                    URL.revokeObjectURL(upload.previewUrl);
                }
            });
        };
    }, [pendingMediaUploads]);

    const imagePreviewSlides = useMemo(() => {
        const existingSlides = formData.existingImagenes.map((url) => ({
            id: url,
            src: url,
            kind: "existing" as const,
        }));

        const pendingSlides = pendingMediaUploads
            .filter((upload) => upload.previewUrl)
            .map((upload) => ({
                id: upload.id,
                src: upload.previewUrl!,
                kind: "pending" as const,
            }));

        return [...existingSlides, ...pendingSlides];
    }, [formData.existingImagenes, pendingMediaUploads]);

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

    const clearPendingMedia = () => {
        setPendingMediaUploads((current) => {
            current.forEach((upload) => {
                if (upload.previewUrl) {
                    URL.revokeObjectURL(upload.previewUrl);
                }
            });
            return [];
        });
    };

    const removePendingMedia = (uploadId: string) => {
        setPendingMediaUploads((current) => {
            const target = current.find((upload) => upload.id === uploadId);
            if (target?.previewUrl) {
                URL.revokeObjectURL(target.previewUrl);
            }

            return current.filter((upload) => upload.id !== uploadId);
        });
    };

    const handleRemoveExistingImage = async (url: string) => {
        if (!editingBeneficioId) {
            return;
        }

        setIsRemovingMedia(true);

        try {
            const updated = await beneficiosApi.removeImage(editingBeneficioId, url);
            setFormData((current) => ({
                ...current,
                mediaTipo: resolveBeneficioImagenes(updated).length > 0 ? "imagen" : "none",
                existingImagenes: resolveBeneficioImagenes(updated),
            }));
            await loadBeneficios();
            toast({
                title: "Imagen eliminada",
                description: "La imagen se eliminó del beneficio.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsRemovingMedia(false);
        }
    };

    const handleRemoveExistingVideo = async () => {
        if (!editingBeneficioId) {
            return;
        }

        setIsRemovingMedia(true);

        try {
            await beneficiosApi.removeMedia(editingBeneficioId);
            setFormData((current) => ({
                ...current,
                mediaTipo: "none",
                existingImagenes: [],
                existingVideo: undefined,
            }));
            clearPendingMedia();
            await loadBeneficios();
            toast({
                title: "Video eliminado",
                description: "El video se eliminó del beneficio.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsRemovingMedia(false);
        }
    };

    const resetForm = () => {
        setEditingBeneficioId(null);
        setFormData(EMPTY_FORM);
        clearPendingMedia();
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

    const handleMediaSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) {
            return;
        }

        const mediaTipo = formData.mediaTipo;

        if (mediaTipo === "imagen") {
            const currentTotal =
                formData.existingImagenes.length + pendingMediaUploads.length;
            const remainingSlots = MAX_BENEFICIO_IMAGENES - currentTotal;

            if (remainingSlots <= 0) {
                toast({
                    variant: "destructive",
                    title: "Límite alcanzado",
                    description: `Solo puedes tener hasta ${MAX_BENEFICIO_IMAGENES} imágenes por beneficio.`,
                });
                event.target.value = "";
                return;
            }

            const acceptedFiles = files.slice(0, remainingSlots);
            const nextUploads: PendingMediaUpload[] = [];

            for (const file of acceptedFiles) {
                if (
                    !ALLOWED_BENEFICIO_IMAGE_TYPES.includes(
                        file.type as (typeof ALLOWED_BENEFICIO_IMAGE_TYPES)[number],
                    )
                ) {
                    toast({
                        variant: "destructive",
                        title: "Archivo inválido",
                        description: `${file.name}: solo JPG, PNG, WEBP o GIF.`,
                    });
                    continue;
                }

                if (file.size > MAX_BENEFICIO_IMAGE_SIZE_BYTES) {
                    toast({
                        variant: "destructive",
                        title: "Imagen demasiado grande",
                        description: `${file.name} no puede exceder 5 MB.`,
                    });
                    continue;
                }

                nextUploads.push({
                    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                    file,
                    name: file.name,
                    previewUrl: URL.createObjectURL(file),
                });
            }

            if (nextUploads.length > 0) {
                setPendingMediaUploads((current) => [...current, ...nextUploads]);
            }

            if (files.length > remainingSlots) {
                toast({
                    variant: "destructive",
                    title: "Algunas imágenes no se agregaron",
                    description: `Solo se aceptaron ${remainingSlots} imagen(es) adicionales.`,
                });
            }

            event.target.value = "";
            return;
        }

        if (mediaTipo === "video") {
            const file = files[0];

            if (!ALLOWED_BENEFICIO_VIDEO_TYPES.includes(file.type as typeof ALLOWED_BENEFICIO_VIDEO_TYPES[number])) {
                toast({
                    variant: "destructive",
                    title: "Archivo inválido",
                    description: "Solo se permiten videos MP4, WEBM o MOV.",
                });
                event.target.value = "";
                return;
            }

            if (file.size > MAX_BENEFICIO_VIDEO_SIZE_BYTES) {
                toast({
                    variant: "destructive",
                    title: "Video demasiado grande",
                    description: "El video no puede exceder 50 MB.",
                });
                event.target.value = "";
                return;
            }

            clearPendingMedia();
            setPendingMediaUploads([
                {
                    id: `${file.name}-${file.size}-${Date.now()}`,
                    file,
                    name: file.name,
                },
            ]);
        }

        event.target.value = "";
    };

    const openEditForm = async (beneficio: Beneficio) => {
        setEditingBeneficioId(beneficio.id);
        setIsDialogOpen(true);
        setIsLoadingDetail(true);
        clearPendingMedia();

        try {
            const detail = await beneficiosApi.getById(beneficio.id);
            setFormData(formFromBeneficio(detail));
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

    const buildPayloadBase = (titulo: string, descripcion: string) => {
        const redireccion = buildRedireccion(formData);

        return {
            titulo,
            descripcion,
            redireccion,
            puntosRecompensa: parsePuntosRecompensaInput(formData.puntosRecompensaInput),
        } satisfies CrearBeneficioDTO | ActualizarBeneficioDTO;
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

        const redirectError = validateRedirectForm(formData);
        if (redirectError) {
            toast({
                variant: "destructive",
                title: "Redirección incompleta",
                description: redirectError,
            });
            return;
        }

        const hasPendingMedia = pendingMediaUploads.length > 0;
        const hasExistingImages = formData.existingImagenes.length > 0;

        if (
            !editingBeneficioId &&
            formData.mediaTipo !== "none" &&
            !hasPendingMedia
        ) {
            toast({
                variant: "destructive",
                title: "Archivo requerido",
                description: "Sube al menos una imagen o un video para continuar.",
            });
            return;
        }

        if (
            editingBeneficioId &&
            formData.mediaTipo === "imagen" &&
            !hasPendingMedia &&
            !hasExistingImages
        ) {
            toast({
                variant: "destructive",
                title: "Imagen requerida",
                description: "Agrega al menos una imagen o cambia el tipo de media.",
            });
            return;
        }

        setIsSaving(true);

        try {
            if (editingBeneficioId) {
                const payload = buildPayloadBase(titulo, descripcion) as ActualizarBeneficioDTO;

                await beneficiosApi.update(editingBeneficioId, payload);

                if (hasPendingMedia && formData.mediaTipo === "imagen") {
                    const uploadResult = await beneficiosApi.appendImages(
                        editingBeneficioId,
                        pendingMediaUploads.map((upload) => upload.file),
                    );
                    const uploadedCount = uploadResult.beneficio.imagenes?.length ?? 0;
                    if (uploadedCount === 0) {
                        throw new Error(
                            "La imagen no se guardó en el servidor. Intenta subirla de nuevo.",
                        );
                    }
                } else if (hasPendingMedia && formData.mediaTipo === "video") {
                    await beneficiosApi.uploadVideo(
                        editingBeneficioId,
                        pendingMediaUploads[0].file,
                    );
                }

                toast({
                    title: "Beneficio actualizado",
                    description: `"${titulo}" ha sido actualizado.`,
                });
            } else {
                const payload = {
                    ...buildPayloadBase(titulo, descripcion),
                    estatus: formData.estatus,
                } as CrearBeneficioDTO;

                if (hasPendingMedia && formData.mediaTipo !== "none") {
                    await beneficiosApi.createWithMedia(
                        payload,
                        pendingMediaUploads.map((upload) => upload.file),
                        formData.mediaTipo,
                    );
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

    const handlePermanentDelete = async (beneficio: Beneficio) => {
        const confirmed = confirm(
            `¿Eliminar permanentemente "${beneficio.titulo}"?\n\nSe borrarán las fotos, videos y toda la información del beneficio. Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            await beneficiosApi.permanentlyDelete(beneficio.id);

            if (selectedBeneficioId === beneficio.id) {
                setSelectedBeneficioId("");
            }

            if (editingBeneficioId === beneficio.id) {
                closeDialog();
            }

            toast({
                title: "Beneficio eliminado",
                description: "Se eliminó permanentemente de la base de datos.",
            });
            await loadBeneficios();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
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
                                Administra beneficios con imagen o video y redirecciones a módulos de la app.
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
                                <TableHead>Media</TableHead>
                                <TableHead>Título</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Redirección</TableHead>
                                <TableHead>Puntos</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Creado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        Cargando beneficios...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedBeneficios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        No hay beneficios que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedBeneficios.map((beneficio) => {
                                    const imagenes = resolveBeneficioImagenes(beneficio);
                                    const previewImage = imagenes[0];

                                    return (
                                    <TableRow key={beneficio.id}>
                                        <TableCell>
                                            {previewImage ? (
                                                <Image
                                                    src={previewImage}
                                                    alt={`Imagen de ${beneficio.titulo}`}
                                                    width={64}
                                                    height={48}
                                                    className="h-12 w-16 rounded-md object-cover"
                                                />
                                            ) : beneficio.video ? (
                                                <div className="flex h-12 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                    <Film className="h-5 w-5" />
                                                </div>
                                            ) : (
                                                <div className="flex h-12 w-16 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                                    Sin media
                                                </div>
                                            )}
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                                {resolveMediaLabel(beneficio)}
                                            </p>
                                        </TableCell>
                                        <TableCell className="font-medium">{beneficio.titulo}</TableCell>
                                        <TableCell className="max-w-[320px] whitespace-normal text-sm text-muted-foreground">
                                            {beneficio.descripcion}
                                        </TableCell>
                                        <TableCell className="max-w-[180px] text-sm text-muted-foreground">
                                            {resolveRedirectLabel(beneficio)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {(beneficio.puntosRecompensa ?? 0) > 0
                                                ? `${beneficio.puntosRecompensa} pts`
                                                : "—"}
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
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                            onClick={() => void handleReactivate(beneficio)}
                                                            title="Habilitar beneficio"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => void handlePermanentDelete(beneficio)}
                                                            title="Eliminar permanentemente"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })
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

            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeDialog();
                        return;
                    }

                    setIsDialogOpen(true);
                }}
            >
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

                        <div className="space-y-2">
                            <Label htmlFor="puntosRecompensa">Puntos al reclamar</Label>
                            <Input
                                id="puntosRecompensa"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                placeholder="0"
                                value={formData.puntosRecompensaInput}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        puntosRecompensaInput: sanitizePuntosRecompensaInput(
                                            event.target.value,
                                        ),
                                    }))
                                }
                                onBlur={() =>
                                    setFormData((current) => ({
                                        ...current,
                                        puntosRecompensaInput:
                                            current.puntosRecompensaInput.trim() === ""
                                                ? "0"
                                                : formatPuntosRecompensaInput(
                                                      parsePuntosRecompensaInput(
                                                          current.puntosRecompensaInput,
                                                      ),
                                                  ),
                                    }))
                                }
                                disabled={isLoadingDetail || isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                                Cada usuario puede reclamar estos puntos una sola vez. Usa 0 si el beneficio no otorga puntos.
                            </p>
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-primary" />
                                <Label>Contenido visual</Label>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="mediaTipo">Tipo de media</Label>
                                <Select
                                    value={formData.mediaTipo}
                                    onValueChange={(value: FormState["mediaTipo"]) => {
                                        clearPendingMedia();
                                        setFormData((current) => ({
                                            ...current,
                                            mediaTipo: value,
                                        }));
                                    }}
                                    disabled={isLoadingDetail || isSaving}
                                >
                                    <SelectTrigger id="mediaTipo">
                                        <SelectValue placeholder="Selecciona tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                                        <SelectItem value="none">Sin media</SelectItem>
                                        <SelectItem
                                            value="imagen"
                                            hint={BENEFICIO_MEDIA_SIZE_RECOMMENDATIONS.imagen.hint}
                                        >
                                            Imagen
                                        </SelectItem>
                                        <SelectItem
                                            value="video"
                                            hint={BENEFICIO_MEDIA_SIZE_RECOMMENDATIONS.video.hint}
                                        >
                                            Video
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {(formData.mediaTipo === "imagen" ||
                                    formData.mediaTipo === "video") && (
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        <span className="font-medium text-foreground/80">
                                            Recomendación:
                                        </span>{" "}
                                        {
                                            BENEFICIO_MEDIA_SIZE_RECOMMENDATIONS[
                                                formData.mediaTipo
                                            ].summary
                                        }
                                    </p>
                                )}
                            </div>

                            {formData.mediaTipo !== "none" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="mediaFile">
                                            {formData.mediaTipo === "imagen"
                                                ? "Subir imágenes"
                                                : "Subir video"}
                                        </Label>
                                        <Input
                                            id="mediaFile"
                                            type="file"
                                            multiple={formData.mediaTipo === "imagen"}
                                            accept={
                                                formData.mediaTipo === "imagen"
                                                    ? "image/*"
                                                    : "video/mp4,video/webm,video/quicktime"
                                            }
                                            onChange={handleMediaSelect}
                                            disabled={isLoadingDetail || isSaving || isRemovingMedia}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {formData.mediaTipo === "imagen"
                                                ? `Puedes subir hasta ${MAX_BENEFICIO_IMAGENES} imágenes (5 MB c/u). Formatos: JPG, PNG, WEBP o GIF.`
                                                : "Máximo 50 MB. Formatos: MP4, WEBM o MOV."}
                                        </p>
                                    </div>

                                    {formData.mediaTipo === "imagen" && imagePreviewSlides.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="relative mx-auto max-w-md px-10">
                                                {imagePreviewSlides.length === 1 ? (
                                                    <div className="relative overflow-hidden rounded-md border bg-muted/20">
                                                        <Image
                                                            src={imagePreviewSlides[0].src}
                                                            alt="Vista previa"
                                                            width={480}
                                                            height={320}
                                                            unoptimized
                                                            className="h-52 w-full object-contain"
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="destructive"
                                                            className="absolute right-2 top-2 h-7 w-7"
                                                            onClick={() => {
                                                                const slide = imagePreviewSlides[0];
                                                                if (slide.kind === "pending") {
                                                                    removePendingMedia(slide.id);
                                                                    return;
                                                                }
                                                                void handleRemoveExistingImage(slide.id);
                                                            }}
                                                            disabled={isSaving || isRemovingMedia || isLoadingDetail}
                                                            aria-label="Eliminar imagen"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Carousel className="w-full">
                                                        <CarouselContent>
                                                            {imagePreviewSlides.map((slide) => (
                                                                <CarouselItem key={slide.id}>
                                                                    <div className="relative overflow-hidden rounded-md border bg-muted/20">
                                                                        <Image
                                                                            src={slide.src}
                                                                            alt="Vista previa"
                                                                            width={480}
                                                                            height={320}
                                                                            unoptimized
                                                                            className="h-52 w-full object-contain"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            size="icon"
                                                                            variant="destructive"
                                                                            className="absolute right-2 top-2 h-7 w-7"
                                                                            onClick={() => {
                                                                                if (slide.kind === "pending") {
                                                                                    removePendingMedia(slide.id);
                                                                                    return;
                                                                                }
                                                                                void handleRemoveExistingImage(slide.id);
                                                                            }}
                                                                            disabled={isSaving || isRemovingMedia || isLoadingDetail}
                                                                            aria-label="Eliminar imagen"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </CarouselItem>
                                                            ))}
                                                        </CarouselContent>
                                                        <CarouselPrevious className="-left-2" />
                                                        <CarouselNext className="-right-2" />
                                                    </Carousel>
                                                )}
                                            </div>
                                            <p className="text-center text-xs text-muted-foreground">
                                                {imagePreviewSlides.length} imagen
                                                {imagePreviewSlides.length === 1 ? "" : "es"} en carrusel.
                                                {" "}La primera imagen se usa como miniatura.
                                            </p>
                                        </div>
                                    )}

                                    {pendingMediaUploads.length > 0 && formData.mediaTipo === "video" && (
                                        <p className="text-sm text-muted-foreground">
                                            Video seleccionado: {pendingMediaUploads[0].name}
                                        </p>
                                    )}

                                    {editingBeneficioId &&
                                        pendingMediaUploads.length === 0 &&
                                        formData.mediaTipo === "video" &&
                                        formData.existingVideo && (
                                            <div className="relative rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2 pr-10">
                                                    <Film className="h-4 w-4 shrink-0" />
                                                    <span>Video cargado. Sube uno nuevo para reemplazarlo.</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute right-2 top-2 h-7 w-7"
                                                    onClick={() => void handleRemoveExistingVideo()}
                                                    disabled={isSaving || isRemovingMedia || isLoadingDetail}
                                                    aria-label="Eliminar video"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                </>
                            )}
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-primary" />
                                <Label>Redirección al tocar media</Label>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="redirectEnabled"
                                    type="checkbox"
                                    checked={formData.redirectEnabled}
                                    onChange={(event) =>
                                        setFormData((current) => ({
                                            ...current,
                                            redirectEnabled: event.target.checked,
                                            redirectModulo: event.target.checked
                                                ? current.redirectModulo === "none"
                                                    ? "home"
                                                    : current.redirectModulo
                                                : "none",
                                        }))
                                    }
                                    disabled={isLoadingDetail || isSaving}
                                    className="h-4 w-4 rounded border"
                                />
                                <Label htmlFor="redirectEnabled" className="font-normal">
                                    Activar redirección cuando el usuario toque la imagen o video
                                </Label>
                            </div>

                            {formData.redirectEnabled && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="redirectModulo">Destino</Label>
                                        <Select
                                            value={formData.redirectModulo}
                                            onValueChange={(value: BeneficioDestinoModulo) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    redirectModulo: value,
                                                }))
                                            }
                                            disabled={isLoadingDetail || isSaving}
                                        >
                                            <SelectTrigger id="redirectModulo">
                                                <SelectValue placeholder="Selecciona destino" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BENEFICIO_DESTINOS.filter((destino) => destino !== "none").map(
                                                    (destino) => (
                                                        <SelectItem key={destino} value={destino}>
                                                            {BENEFICIO_DESTINO_LABELS[destino]}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>
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
