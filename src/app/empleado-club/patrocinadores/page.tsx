"use client";

import Image from "next/image";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, Crown, Handshake, ImageIcon, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/api/errors";
import {
    MAX_PATROCINADOR_IMAGE_SIZE_BYTES,
    MAX_PATROCINADOR_IMAGE_SIZE_MB,
    PATROCINADOR_EXCLUSIVE_IMAGE_RECOMMENDATION,
    PATROCINADOR_IMAGE_ACCEPT,
    PATROCINADOR_IMAGE_RECOMMENDATION,
    hasBothSponsorLogos,
    hasExclusiveImage,
    isAllowedPatrocinadorImageFile,
    isGifSource,
    isPatrocinadorExclusivo,
    patrocinadoresApi,
    type Patrocinador,
    type PatrocinadorLogoVariante,
} from "@/lib/api/patrocinadores";
import { useToast } from "@/hooks/use-toast";

type FormState = {
    nombre: string;
    existingImagenBlanca?: string;
    existingImagenNegra?: string;
    existingImagenExclusiva?: string;
    existingImagenLegacy?: string;
};

const EMPTY_FORM: FormState = {
    nombre: "",
};

const LOGO_VARIANT_LABEL: Record<PatrocinadorLogoVariante, string> = {
    blanca: "Logo blanco",
    negra: "Logo negro",
    exclusiva: "Imagen exclusiva",
};

type PendingImageUpload = {
    id: string;
    file: File;
    previewUrl: string;
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

function formFromPatrocinador(patrocinador: Patrocinador): FormState {
    return {
        nombre: patrocinador.nombre,
        existingImagenBlanca: patrocinador.imagenBlanca,
        existingImagenNegra: patrocinador.imagenNegra,
        existingImagenExclusiva: patrocinador.imagen,
        existingImagenLegacy: patrocinador.imagen,
    };
}

function logoPreviewSrc(
    variante: PatrocinadorLogoVariante,
    pending: PendingImageUpload | null,
    formData: FormState,
) {
    if (pending?.previewUrl) {
        return pending.previewUrl;
    }

    if (variante === "blanca") {
        return formData.existingImagenBlanca;
    }

    if (variante === "negra") {
        return formData.existingImagenNegra;
    }

    return formData.existingImagenExclusiva;
}

function SponsorLogoThumb({
    src,
    nombre,
    variante,
}: {
    src?: string;
    nombre: string;
    variante: PatrocinadorLogoVariante;
}) {
    const isWhiteLogo = variante === "blanca";

    if (!src) {
        return (
            <div className="flex h-12 w-16 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                Sin logo
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={`${LOGO_VARIANT_LABEL[variante]} de ${nombre}`}
            width={64}
            height={48}
            unoptimized={isGifSource(src)}
            className={`h-12 w-16 rounded-md object-contain ${
                isWhiteLogo ? "bg-zinc-950" : "border bg-white"
            }`}
        />
    );
}

export default function EmpleadoClubPatrocinadoresPage() {
    const [patrocinadores, setPatrocinadores] = useState<Patrocinador[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatrocinadorId, setSelectedPatrocinadorId] = useState("");
    const [estatusFilter, setEstatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPatrocinadorId, setEditingPatrocinadorId] = useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
    const [isExclusiveForm, setIsExclusiveForm] = useState(false);
    const [pendingImages, setPendingImages] = useState<
        Partial<Record<PatrocinadorLogoVariante, PendingImageUpload>>
    >({});
    const [removingVariante, setRemovingVariante] = useState<PatrocinadorLogoVariante | null>(null);
    const pendingImagesRef = useRef(pendingImages);
    pendingImagesRef.current = pendingImages;
    const { toast } = useToast();

    const itemsPerPage = 5;

    const loadPatrocinadores = useCallback(async () => {
        setIsLoading(true);

        try {
            const data = await patrocinadoresApi.getAll();
            setPatrocinadores(data);
            setSelectedPatrocinadorId((current) =>
                current && !data.some((item) => item.id === current) ? "" : current,
            );
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar patrocinadores",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadPatrocinadores();
    }, [loadPatrocinadores]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedPatrocinadorId, estatusFilter]);

    useEffect(() => {
        return () => {
            Object.values(pendingImagesRef.current).forEach((image) => {
                if (image?.previewUrl) {
                    URL.revokeObjectURL(image.previewUrl);
                }
            });
        };
    }, []);

    const exclusivePatrocinador = useMemo(
        () => patrocinadores.find((item) => isPatrocinadorExclusivo(item)) ?? null,
        [patrocinadores],
    );

    const regularPatrocinadores = useMemo(
        () => patrocinadores.filter((item) => !isPatrocinadorExclusivo(item)),
        [patrocinadores],
    );

    const patrocinadorOptions: EntityOption[] = useMemo(
        () =>
            regularPatrocinadores.map((item) => ({
                id: item.id,
                label: item.nombre,
            })),
        [regularPatrocinadores],
    );

    const filteredPatrocinadores = useMemo(() => {
        const query = normalizeSearch(searchQuery);

        return regularPatrocinadores
            .filter((item) => {
                if (selectedPatrocinadorId && item.id !== selectedPatrocinadorId) {
                    return false;
                }

                if (estatusFilter === "activo") {
                    return item.estatus === true;
                }

                if (estatusFilter === "inactivo") {
                    return item.estatus === false;
                }

                return true;
            })
            .filter((item) => {
                if (!query) {
                    return true;
                }

                return normalizeSearch(item.nombre).includes(query);
            });
    }, [estatusFilter, regularPatrocinadores, searchQuery, selectedPatrocinadorId]);

    const totalPages = Math.ceil(filteredPatrocinadores.length / itemsPerPage);

    const paginatedPatrocinadores = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPatrocinadores.slice(start, start + itemsPerPage);
    }, [currentPage, filteredPatrocinadores]);

    const clearPendingImage = (variante?: PatrocinadorLogoVariante) => {
        setPendingImages((current) => {
            const next = { ...current };
            const keys = variante ? [variante] : (Object.keys(next) as PatrocinadorLogoVariante[]);

            keys.forEach((key) => {
                const image = next[key];
                if (image?.previewUrl) {
                    URL.revokeObjectURL(image.previewUrl);
                }
                delete next[key];
            });

            return next;
        });
    };

    const resetForm = () => {
        setEditingPatrocinadorId(null);
        setIsExclusiveForm(false);
        setFormData(EMPTY_FORM);
        clearPendingImage();
        setRemovingVariante(null);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setIsLoadingDetail(false);
        resetForm();
    };

    const openCreateForm = () => {
        resetForm();
        setIsExclusiveForm(false);
        setIsDialogOpen(true);
    };

    const openExclusiveForm = async (patrocinador?: Patrocinador) => {
        resetForm();
        setIsExclusiveForm(true);
        setIsDialogOpen(true);

        if (!patrocinador) {
            return;
        }

        setEditingPatrocinadorId(patrocinador.id);
        setIsLoadingDetail(true);

        try {
            const detail = await patrocinadoresApi.getById(patrocinador.id);
            setFormData(formFromPatrocinador(detail));
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

    const handleImageSelect = (
        variante: PatrocinadorLogoVariante,
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!isAllowedPatrocinadorImageFile(file)) {
            toast({
                variant: "destructive",
                title: "Archivo inválido",
                description: "Solo JPG, PNG, WEBP o GIF.",
            });
            event.target.value = "";
            return;
        }

        if (file.size > MAX_PATROCINADOR_IMAGE_SIZE_BYTES) {
            toast({
                variant: "destructive",
                title: "Imagen demasiado grande",
                description: `La imagen no puede exceder ${MAX_PATROCINADOR_IMAGE_SIZE_MB} MB.`,
            });
            event.target.value = "";
            return;
        }

        clearPendingImage(variante);
        setPendingImages((current) => ({
            ...current,
            [variante]: {
                id: `${variante}-${file.name}-${file.size}-${Date.now()}`,
                file,
                name: file.name,
                previewUrl: URL.createObjectURL(file),
            },
        }));
        event.target.value = "";
    };

    const handleRemoveExistingImage = async (variante: PatrocinadorLogoVariante) => {
        if (!editingPatrocinadorId) {
            return;
        }

        setRemovingVariante(variante);

        try {
            await patrocinadoresApi.removeImage(editingPatrocinadorId, variante);
            setFormData((current) => ({
                ...current,
                ...(variante === "blanca"
                    ? { existingImagenBlanca: undefined }
                    : variante === "negra"
                      ? { existingImagenNegra: undefined }
                      : { existingImagenExclusiva: undefined }),
            }));
            await loadPatrocinadores();
            toast({
                title: `${LOGO_VARIANT_LABEL[variante]} eliminado`,
                description: "Sube la nueva versión del logo antes de guardar.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        } finally {
            setRemovingVariante(null);
        }
    };

    const openEditForm = async (patrocinador: Patrocinador) => {
        if (isPatrocinadorExclusivo(patrocinador)) {
            await openExclusiveForm(patrocinador);
            return;
        }

        setEditingPatrocinadorId(patrocinador.id);
        setIsExclusiveForm(false);
        setIsDialogOpen(true);
        setIsLoadingDetail(true);
        clearPendingImage();

        try {
            const detail = await patrocinadoresApi.getById(patrocinador.id);
            setFormData(formFromPatrocinador(detail));
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
        const nombre = formData.nombre.trim();

        if (!nombre) {
            toast({
                variant: "destructive",
                title: "Campo requerido",
                description: "El nombre del patrocinador es obligatorio.",
            });
            return;
        }

        if (isExclusiveForm) {
            const pendingExclusiva = pendingImages.exclusiva;
            const hasExclusiva = Boolean(pendingExclusiva || formData.existingImagenExclusiva);

            if (!hasExclusiva) {
                toast({
                    variant: "destructive",
                    title: "Imagen requerida",
                    description: "El patrocinador exclusivo necesita una imagen.",
                });
                return;
            }

            setIsSaving(true);

            try {
                if (editingPatrocinadorId) {
                    await patrocinadoresApi.update(editingPatrocinadorId, {
                        nombre,
                        exclusivo: true,
                    });

                    if (pendingExclusiva) {
                        const uploadResult = await patrocinadoresApi.uploadImage(
                            editingPatrocinadorId,
                            pendingExclusiva.file,
                            "exclusiva",
                        );
                        if (!hasExclusiveImage(uploadResult.patrocinador)) {
                            throw new Error("La imagen exclusiva no se guardó. Intenta de nuevo.");
                        }
                    }

                    toast({
                        title: "Patrocinador exclusivo actualizado",
                        description: `"${nombre}" queda como el único exclusivo.`,
                    });
                } else if (pendingExclusiva) {
                    await patrocinadoresApi.createExclusive(
                        { nombre, estatus: true, exclusivo: true },
                        pendingExclusiva.file,
                    );

                    toast({
                        title: "Patrocinador exclusivo creado",
                        description: `"${nombre}" se mostrará en el espacio exclusivo.`,
                    });
                }

                closeDialog();
                await loadPatrocinadores();
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error al guardar",
                    description: getApiErrorMessage(error),
                });
            } finally {
                setIsSaving(false);
            }

            return;
        }

        const pendingBlanca = pendingImages.blanca;
        const pendingNegra = pendingImages.negra;
        const hasBlanca = Boolean(pendingBlanca || formData.existingImagenBlanca);
        const hasNegra = Boolean(pendingNegra || formData.existingImagenNegra);

        if (!hasBlanca || !hasNegra) {
            toast({
                variant: "destructive",
                title: "Logos requeridos",
                description: "Cada patrocinador debe tener logo blanco y logo negro.",
            });
            return;
        }

        setIsSaving(true);

        try {
            if (editingPatrocinadorId) {
                await patrocinadoresApi.update(editingPatrocinadorId, { nombre, exclusivo: false });

                let latest: Pick<Patrocinador, "imagenBlanca" | "imagenNegra"> = {
                    imagenBlanca: formData.existingImagenBlanca,
                    imagenNegra: formData.existingImagenNegra,
                };

                if (pendingBlanca) {
                    const uploadResult = await patrocinadoresApi.uploadImage(
                        editingPatrocinadorId,
                        pendingBlanca.file,
                        "blanca",
                    );
                    latest = uploadResult.patrocinador;
                }

                if (pendingNegra) {
                    const uploadResult = await patrocinadoresApi.uploadImage(
                        editingPatrocinadorId,
                        pendingNegra.file,
                        "negra",
                    );
                    latest = uploadResult.patrocinador;
                }

                if (!hasBothSponsorLogos(latest)) {
                    throw new Error(
                        "No se guardaron ambos logos. Intenta subirlos de nuevo.",
                    );
                }

                toast({
                    title: "Patrocinador actualizado",
                    description: `"${nombre}" ha sido actualizado.`,
                });
            } else if (pendingBlanca && pendingNegra) {
                await patrocinadoresApi.createWithImages(
                    { nombre, estatus: true },
                    { blanca: pendingBlanca.file, negra: pendingNegra.file },
                );

                toast({
                    title: "Patrocinador creado",
                    description: `"${nombre}" ha sido creado.`,
                });
            }

            closeDialog();
            await loadPatrocinadores();
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
        const isExclusive = patrocinadores.some(
            (item) => item.id === id && isPatrocinadorExclusivo(item),
        );
        if (
            !confirm(
                isExclusive
                    ? "¿Desactivar el patrocinador exclusivo? Dejará de verse en la app."
                    : "¿Desactivar este patrocinador?",
            )
        ) {
            return;
        }

        try {
            await patrocinadoresApi.delete(id);

            if (selectedPatrocinadorId === id) {
                setSelectedPatrocinadorId("");
            }

            toast({ title: "Patrocinador desactivado" });
            await loadPatrocinadores();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al desactivar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleReactivate = async (patrocinador: Patrocinador) => {
        if (!confirm("¿Habilitar de nuevo este patrocinador?")) {
            return;
        }

        try {
            await patrocinadoresApi.update(patrocinador.id, { estatus: true });
            toast({ title: "Patrocinador habilitado" });
            await loadPatrocinadores();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al habilitar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handlePermanentDelete = async (patrocinador: Patrocinador) => {
        const mediaLabel = isPatrocinadorExclusivo(patrocinador)
            ? "la imagen"
            : "ambos logos";
        const confirmed = confirm(
            `¿Eliminar permanentemente "${patrocinador.nombre}"?\n\nSe borrarán ${mediaLabel} y el registro. Esta acción no se puede deshacer.`,
        );

        if (!confirmed) {
            return;
        }

        try {
            await patrocinadoresApi.permanentlyDelete(patrocinador.id);

            if (selectedPatrocinadorId === patrocinador.id) {
                setSelectedPatrocinadorId("");
            }

            if (editingPatrocinadorId === patrocinador.id) {
                closeDialog();
            }

            toast({
                title: "Patrocinador eliminado",
                description: "Se eliminó permanentemente de la base de datos.",
            });
            await loadPatrocinadores();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleEditSelected = async () => {
        if (!selectedPatrocinadorId) {
            return;
        }

        const selected = patrocinadores.find((item) => item.id === selectedPatrocinadorId);

        if (!selected) {
            toast({
                variant: "destructive",
                title: "Selección inválida",
                description: "El patrocinador seleccionado ya no existe.",
            });
            setSelectedPatrocinadorId("");
            return;
        }

        await openEditForm(selected);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Handshake className="size-6" />
                    </div>
                    <div>
                        <h1 className="font-headline text-3xl font-bold">Gestión de Patrocinadores</h1>
                        <p className="text-sm text-muted-foreground">
                            Carrusel con logos blanco y negro, más un espacio exclusivo de una sola imagen.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => void loadPatrocinadores()}>
                        <RefreshCw />
                    </Button>
                    <Button onClick={openCreateForm}>
                        <Plus data-icon="inline-start" /> Agregar patrocinador
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <Crown className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-headline text-lg font-semibold">Patrocinador exclusivo</h2>
                            <p className="text-sm text-muted-foreground">
                                Banner 1920 × 300 px (recomendado) o 1280 × 200 px. También GIF con esas medidas.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant={exclusivePatrocinador ? "outline" : "default"}
                            onClick={() => void openExclusiveForm(exclusivePatrocinador ?? undefined)}
                        >
                            {exclusivePatrocinador ? "Editar exclusivo" : "Agregar exclusivo"}
                        </Button>
                        {exclusivePatrocinador?.estatus ? (
                            <Button
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => void handleDelete(exclusivePatrocinador.id)}
                            >
                                <Ban data-icon="inline-start" />
                                Desactivar
                            </Button>
                        ) : exclusivePatrocinador ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                                    onClick={() => void handleReactivate(exclusivePatrocinador)}
                                >
                                    <RotateCcw data-icon="inline-start" />
                                    Habilitar
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => void handlePermanentDelete(exclusivePatrocinador)}
                                >
                                    <Trash2 data-icon="inline-start" />
                                    Eliminar
                                </Button>
                            </>
                        ) : null}
                    </div>
                </div>

                {exclusivePatrocinador ? (
                    <div className="mt-4 flex flex-col gap-4 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-center">
                        {exclusivePatrocinador.imagen ? (
                            <Image
                                src={exclusivePatrocinador.imagen}
                                alt={`Imagen exclusiva de ${exclusivePatrocinador.nombre}`}
                                width={220}
                                height={88}
                                unoptimized={isGifSource(exclusivePatrocinador.imagen)}
                                className="h-20 w-44 rounded-md border bg-background object-contain"
                            />
                        ) : (
                            <div className="flex h-20 w-44 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                Sin imagen
                            </div>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <p className="truncate font-medium">{exclusivePatrocinador.nombre}</p>
                            <div className="flex items-center gap-2">
                                {exclusivePatrocinador.estatus ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Activo</Badge>
                                ) : (
                                    <Badge variant="secondary">Inactivo</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {formatDate(exclusivePatrocinador.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                        Aún no hay un patrocinador exclusivo. El carrusel de la app sigue mostrando los demás.
                    </p>
                )}
            </div>

            <div className="rounded-md border bg-card p-4">
                <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                    <EntityPicker
                        label="Búsqueda de patrocinadores"
                        searchLabel="Buscar por nombre"
                        selectLabel="Selecciona un patrocinador"
                        query={searchQuery}
                        value={selectedPatrocinadorId}
                        options={patrocinadorOptions}
                        onQueryChange={setSearchQuery}
                        onValueChange={setSelectedPatrocinadorId}
                        allowEmpty
                        emptyLabel="Todos los patrocinadores"
                        disabled={isLoading}
                    />

                    <div className="flex min-w-[140px] flex-col gap-1">
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
                        disabled={!selectedPatrocinadorId || isLoading}
                    >
                        Editar seleccionado
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedPatrocinadorId("");
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
                                <TableHead>Logo blanco</TableHead>
                                <TableHead>Logo negro</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Creado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        Cargando patrocinadores...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedPatrocinadores.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        No hay patrocinadores que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPatrocinadores.map((patrocinador) => (
                                    <TableRow key={patrocinador.id}>
                                        <TableCell>
                                            <SponsorLogoThumb
                                                src={patrocinador.imagenBlanca}
                                                nombre={patrocinador.nombre}
                                                variante="blanca"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <SponsorLogoThumb
                                                src={patrocinador.imagenNegra}
                                                nombre={patrocinador.nombre}
                                                variante="negra"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col gap-1">
                                                <span>{patrocinador.nombre}</span>
                                                {!hasBothSponsorLogos(patrocinador) && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Falta logo blanco o negro
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {patrocinador.estatus ? (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactivo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(patrocinador.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => void openEditForm(patrocinador)}
                                                >
                                                    Editar
                                                </Button>
                                                {patrocinador.estatus ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => void handleDelete(patrocinador.id)}
                                                        title="Desactivar patrocinador"
                                                    >
                                                        <Ban />
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="size-8 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                            onClick={() => void handleReactivate(patrocinador)}
                                                            title="Habilitar patrocinador"
                                                        >
                                                            <RotateCcw />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => void handlePermanentDelete(patrocinador)}
                                                            title="Eliminar permanentemente"
                                                        >
                                                            <Trash2 />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {filteredPatrocinadores.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t p-4 sm:flex-row">
                        <p className="text-sm text-muted-foreground">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPatrocinadores.length)} de {filteredPatrocinadores.length} patrocinadores
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
                            {isExclusiveForm
                                ? editingPatrocinadorId
                                    ? "Editar patrocinador exclusivo"
                                    : "Nuevo patrocinador exclusivo"
                                : editingPatrocinadorId
                                  ? "Editar patrocinador"
                                  : "Nuevo patrocinador"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-4">
                        {isLoadingDetail && (
                            <p className="text-sm text-muted-foreground">Cargando datos...</p>
                        )}

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="nombre">Nombre *</Label>
                            <Input
                                id="nombre"
                                value={formData.nombre}
                                onChange={(event) =>
                                    setFormData((current) => ({
                                        ...current,
                                        nombre: event.target.value,
                                    }))
                                }
                                disabled={isLoadingDetail || isSaving}
                            />
                        </div>

                        {formData.existingImagenLegacy &&
                            !isExclusiveForm &&
                            !formData.existingImagenBlanca &&
                            !formData.existingImagenNegra && (
                                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                    Este patrocinador todavía tiene un logo anterior. Sube las versiones blanca y negra para reemplazarlo.
                                </p>
                            )}

                        {isExclusiveForm ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="size-4 text-primary" />
                                    <Label>Imagen exclusiva *</Label>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    {PATROCINADOR_EXCLUSIVE_IMAGE_RECOMMENDATION.summary} Máximo {MAX_PATROCINADOR_IMAGE_SIZE_MB} MB.
                                </p>
                                <Input
                                    id="imagen-exclusiva"
                                    type="file"
                                    accept={PATROCINADOR_IMAGE_ACCEPT}
                                    onChange={(event) => handleImageSelect("exclusiva", event)}
                                    disabled={isLoadingDetail || isSaving || removingVariante !== null}
                                />
                                {logoPreviewSrc("exclusiva", pendingImages.exclusiva ?? null, formData) && (
                                    <div className="relative overflow-hidden rounded-md border bg-muted/20">
                                        <Image
                                            src={logoPreviewSrc("exclusiva", pendingImages.exclusiva ?? null, formData)!}
                                            alt="Vista previa de la imagen exclusiva"
                                            width={640}
                                            height={240}
                                            unoptimized
                                            className="h-40 w-full object-contain"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="absolute right-2 top-2 size-7"
                                            onClick={() => {
                                                if (pendingImages.exclusiva) {
                                                    clearPendingImage("exclusiva");
                                                    return;
                                                }
                                                void handleRemoveExistingImage("exclusiva");
                                            }}
                                            disabled={isSaving || removingVariante !== null || isLoadingDetail}
                                            aria-label="Eliminar imagen exclusiva"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="size-4 text-primary" />
                                <Label>Logos *</Label>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                <span className="font-medium text-foreground/80">Recomendación:</span>{" "}
                                {PATROCINADOR_IMAGE_RECOMMENDATION.summary} Máximo {MAX_PATROCINADOR_IMAGE_SIZE_MB} MB por archivo.
                            </p>

                            <div className="grid gap-4 md:grid-cols-2">
                                {(["blanca", "negra"] as const).map((variante) => {
                                    const pending = pendingImages[variante] ?? null;
                                    const previewSrc = logoPreviewSrc(variante, pending, formData);
                                    const isDarkPreview = variante === "blanca";

                                    return (
                                        <div key={variante} className="flex flex-col gap-2 rounded-md border p-3">
                                            <Label htmlFor={`imagen-${variante}`}>
                                                {LOGO_VARIANT_LABEL[variante]} *
                                            </Label>
                                            <Input
                                                id={`imagen-${variante}`}
                                                type="file"
                                                accept={PATROCINADOR_IMAGE_ACCEPT}
                                                onChange={(event) => handleImageSelect(variante, event)}
                                                disabled={isLoadingDetail || isSaving || removingVariante !== null}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {variante === "blanca"
                                                    ? "Versión clara para fondos oscuros."
                                                    : "Versión oscura para fondos claros."}
                                            </p>
                                            {previewSrc && (
                                                <div
                                                    className={`relative overflow-hidden rounded-md border ${
                                                        isDarkPreview ? "bg-zinc-950" : "bg-white"
                                                    }`}
                                                >
                                                    <Image
                                                        src={previewSrc}
                                                        alt={`Vista previa del ${LOGO_VARIANT_LABEL[variante].toLowerCase()}`}
                                                        width={480}
                                                        height={240}
                                                        unoptimized
                                                        className="h-36 w-full object-contain"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="destructive"
                                                        className="absolute right-2 top-2 size-7"
                                                        onClick={() => {
                                                            if (pending) {
                                                                clearPendingImage(variante);
                                                                return;
                                                            }
                                                            void handleRemoveExistingImage(variante);
                                                        }}
                                                        disabled={isSaving || removingVariante !== null || isLoadingDetail}
                                                        aria-label={`Eliminar ${LOGO_VARIANT_LABEL[variante].toLowerCase()}`}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            )}
                                            {pending && (
                                                <p className="text-sm text-muted-foreground">
                                                    Seleccionado: {pending.name}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                        <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={() => void handleSave()} disabled={isSaving || isLoadingDetail}>
                            {isSaving ? "Guardando..." : editingPatrocinadorId ? "Guardar cambios" : "Guardar patrocinador"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
