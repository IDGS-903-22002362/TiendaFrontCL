"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    ImageIcon,
    X,
    Video,
    RotateCcw,
    GripVertical,
} from "lucide-react";
import { bannersAdminApi } from "@/lib/api/banners";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Banner, BannerButton, BannerContentConfig } from "@/lib/ai/types";
import { Category, Linea, Product, Talla } from "@/lib/types";
import { ContentConfigBuilder } from "./content-config-builder";

type ButtonDraft = BannerButton & { draftId: string };

const EMPTY_CONFIG: BannerContentConfig = {
    type: "novedades",
    limit: 8,
    sortBy: "createdAt",
    sortOrder: "desc",
};

const EMPTY_FORM = {
    title: "",
    subtitle: "",
    backgroundImage: "",
    videoUrl: "",
    buttons: [] as ButtonDraft[],
    contentConfig: EMPTY_CONFIG,
    active: true,
    order: 1,
};

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [lineas, setLineas] = useState<Linea[]>([]);
    const [tallas, setTallas] = useState<Talla[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const { toast } = useToast();

    const MAX_ACTIVE_BANNERS = 6;

    const loadBanners = useCallback(async () => {
        setIsLoading(true);
        try {
            const list = await bannersAdminApi.getAll();
            setBanners(list);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al cargar banners",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const loadMeta = useCallback(async () => {
        setIsLoadingMeta(true);
        try {
            const [cats, lines, sizes, prods] = await Promise.all([
                fetchCategories(),
                lineasApi.getAll(),
                tallasApi.getAll(),
                fetchProducts(),
            ]);
            setCategories(cats);
            setLineas(lines);
            setTallas(sizes);
            setProducts(prods);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "No se pudieron cargar catálogos",
                description: getApiErrorMessage(error),
            });
        } finally {
            setIsLoadingMeta(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadBanners();
        void loadMeta();
    }, [loadBanners, loadMeta]);

    const openForm = (banner?: Banner) => {
        if (banner) {
            setEditingBannerId(banner.id);
            setFormData({
                title: banner.title,
                subtitle: banner.subtitle || "",
                backgroundImage: banner.backgroundImage || "",
                videoUrl: banner.videoUrl || "",
                buttons: banner.buttons.map((btn) => ({
                    ...btn,
                    draftId: Math.random().toString(36).slice(2),
                })),
                contentConfig: banner.contentConfig,
                active: banner.active,
                order: banner.order,
            });
        } else {
            setEditingBannerId(null);
            setFormData(EMPTY_FORM);
        }
        setPendingImageFile(null);
        setPendingVideoFile(null);
        setIsDialogOpen(true);
    };

    const resetDialogState = () => {
        setIsDialogOpen(false);
        setEditingBannerId(null);
        setFormData(EMPTY_FORM);
        setPendingImageFile(null);
        setPendingVideoFile(null);
    };



    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast({ variant: "destructive", title: "El título es obligatorio" });
            return;
        }

        // Validar que no haya imagen Y video simultáneamente
        const hasImage = !!pendingImageFile || !!formData.backgroundImage.trim();
        const hasVideo = !!pendingVideoFile || !!formData.videoUrl.trim();

        if (hasImage && hasVideo) {
            toast({
                variant: "destructive",
                title: "No se puede guardar",
                description: "El banner debe tener solo imagen O vídeo, no ambos.",
            });
            return;
        }

        // Validar límite de banners activos
        if (formData.active) {
            const currentBanner = editingBannerId ? banners.find(b => b.id === editingBannerId) : null;
            const isActivatingNewBanner = !editingBannerId || (currentBanner && !currentBanner.active);

            if (isActivatingNewBanner && activeBannersCount >= MAX_ACTIVE_BANNERS) {
                toast({
                    variant: "destructive",
                    title: "Límite alcanzado",
                    description: `Solo puedes tener máximo ${MAX_ACTIVE_BANNERS} banners activos. Desactiva uno antes de crear este nuevo.`,
                });
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                title: formData.title.trim(),
                subtitle: formData.subtitle.trim() || undefined,
                backgroundImage: formData.backgroundImage || undefined,
                videoUrl: formData.videoUrl || undefined,
                buttons: formData.buttons.map(({ draftId, ...btn }) => btn),
                contentConfig: formData.contentConfig,
                active: formData.active,
                order: formData.order,
            };

            let bannerId = editingBannerId;
            if (bannerId) {
                await bannersAdminApi.update(bannerId, payload);
            } else {
                const newBanner = await bannersAdminApi.create(payload);
                bannerId = newBanner.id;
            }

            // Subir imagen si hay pendiente
            if (pendingImageFile && bannerId) {
                const { url } = await bannersAdminApi.uploadImage(bannerId, pendingImageFile);
                await bannersAdminApi.update(bannerId, { backgroundImage: url });
            }

            // Subir vídeo si hay pendiente
            if (pendingVideoFile && bannerId) {
                const { url } = await bannersAdminApi.uploadVideo(bannerId, pendingVideoFile);
                await bannersAdminApi.update(bannerId, { videoUrl: url });
            }

            toast({ title: editingBannerId ? "Banner actualizado" : "Banner creado" });
            resetDialogState();
            void loadBanners();
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
        if (!window.confirm("¿Desactivar este banner?")) return;
        try {
            await bannersAdminApi.update(id, { active: false });
            toast({ title: "Banner desactivado" });
            void loadBanners();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al desactivar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleReactivate = async (id: string) => {
        const activeBannersCount = banners.filter(b => b.active).length;
        if (activeBannersCount >= MAX_ACTIVE_BANNERS) {
            toast({
                variant: "destructive",
                title: "Límite alcanzado",
                description: `Solo puedes tener máximo ${MAX_ACTIVE_BANNERS} banners activos. Desactiva uno antes de reactivar este.`,
            });
            return;
        }

        try {
            await bannersAdminApi.update(id, { active: true });
            toast({ title: "Banner reactivado" });
            void loadBanners();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al reactivar",
                description: getApiErrorMessage(error),
            });
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            return;
        }

        const draggedIndex = banners.findIndex(b => b.id === draggedId);
        const targetIndex = banners.findIndex(b => b.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedId(null);
            return;
        }

        const newBanners = [...banners];
        [newBanners[draggedIndex], newBanners[targetIndex]] = [newBanners[targetIndex], newBanners[draggedIndex]];

        // Actualizar órdenes en el backend
        try {
            await Promise.all([
                bannersAdminApi.update(draggedId, { order: targetIndex + 1 }),
                bannersAdminApi.update(targetId, { order: draggedIndex + 1 }),
            ]);
            toast({ title: "Orden actualizado" });
            void loadBanners();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al reordenar",
                description: getApiErrorMessage(error),
            });
        } finally {
            setDraggedId(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedId(null);
    };

    const activeBannersCount = useMemo(() => {
        return banners.filter(b => b.active).length;
    }, [banners]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Banners</h1>
                    <p className="text-sm text-muted-foreground">
                        Administra los banners del carrusel principal. Puedes mostrar productos por categoría, línea, novedades, etc.
                    </p>
                </div>
                <Button onClick={() => openForm()}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Banner
                </Button>
            </div>

            <div className="rounded-md border bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Orden</TableHead>
                                <TableHead>Título</TableHead>
                                <TableHead>Tipo de contenido</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        Cargando banners...
                                    </TableCell>
                                </TableRow>
                            ) : banners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        No hay banners. ¡Crea el primero!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                banners.map((banner) => (
                                    <TableRow
                                        key={banner.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, banner.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, banner.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`cursor-move transition-colors ${draggedId === banner.id
                                                ? "bg-muted opacity-50"
                                                : draggedId
                                                    ? "hover:bg-muted/50"
                                                    : ""
                                            }`}
                                    >
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">{banner.order}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{banner.title}</div>
                                                {banner.subtitle && (
                                                    <div className="text-xs text-muted-foreground">{banner.subtitle}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {banner.contentConfig.type === "categoria" && "Categoría"}
                                                {banner.contentConfig.type === "linea" && "Línea"}
                                                {banner.contentConfig.type === "talla" && "Talla"}
                                                {banner.contentConfig.type === "productos" && "Productos específicos"}
                                                {banner.contentConfig.type === "novedades" && "Novedades"}
                                                {banner.contentConfig.type === "mas_vendidos" && "Más vendidos"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {banner.active ? (
                                                <Badge className="bg-green-100 text-green-800">Activo</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactivo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openForm(banner)}>
                                                    <Edit className="h-4 w-4 mr-1" /> Editar
                                                </Button>
                                                {banner.active ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(banner.id)}
                                                        title="Desactivar banner"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-green-600 hover:text-green-700"
                                                        onClick={() => handleReactivate(banner.id)}
                                                        title="Reactivar banner"
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
                <div className="px-6 py-3 border-t bg-muted/30 text-sm text-muted-foreground">
                    <span>Banners activos: <strong>{activeBannersCount}</strong> de {MAX_ACTIVE_BANNERS} máximo</span>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingBannerId ? "Editar Banner" : "Nuevo Banner"}
                        </DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="general" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="content">Contenido (productos)</TabsTrigger>
                            <TabsTrigger value="media">Imagen / Video</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subtitle">Subtítulo</Label>
                                <Input
                                    id="subtitle"
                                    value={formData.subtitle}
                                    onChange={(e) => setFormData((p) => ({ ...p, subtitle: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="order">Orden (1 = primero)</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    min={1}
                                    value={formData.order}
                                    onChange={(e) => setFormData((p) => ({ ...p, order: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                <div className="space-y-1">
                                    <Label htmlFor="active" className="text-sm font-medium">
                                        Activo
                                    </Label>
                                    {!formData.active && activeBannersCount < MAX_ACTIVE_BANNERS && (
                                        <p className="text-xs text-muted-foreground">
                                            Puedes activar este banner ({activeBannersCount}/{MAX_ACTIVE_BANNERS})
                                        </p>
                                    )}
                                    {formData.active && activeBannersCount >= MAX_ACTIVE_BANNERS && !editingBannerId && (
                                        <p className="text-xs text-yellow-600">
                                            Máximo {MAX_ACTIVE_BANNERS} banners activos al mismo tiempo
                                        </p>
                                    )}
                                </div>
                                <Switch
                                    id="active"
                                    checked={formData.active}
                                    onCheckedChange={(checked) => {
                                        if (!checked || activeBannersCount < MAX_ACTIVE_BANNERS || editingBannerId) {
                                            setFormData((p) => ({ ...p, active: checked }));
                                        }
                                    }}
                                    disabled={formData.active && activeBannersCount >= MAX_ACTIVE_BANNERS && !editingBannerId}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="content" className="space-y-4">
                            <ContentConfigBuilder
                                value={formData.contentConfig}
                                onChange={(config) => setFormData((p) => ({ ...p, contentConfig: config }))}
                                categories={categories}
                                lineas={lineas}
                                tallas={tallas}
                                isLoading={isLoadingMeta}
                            />
                        </TabsContent>

                        <TabsContent value="media" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Imagen de fondo</Label>
                                {formData.backgroundImage && (
                                    <div className="relative w-48 h-32 border rounded-md overflow-hidden">
                                        <img src={formData.backgroundImage} alt="Fondo" className="w-full h-full object-cover" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6"
                                            onClick={() => setFormData((p) => ({ ...p, backgroundImage: "" }))}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                                <Input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    disabled={!!pendingVideoFile || !!formData.videoUrl.trim()}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            // Si hay video pendiente o URL de video, mostrar error
                                            if (pendingVideoFile || formData.videoUrl.trim()) {
                                                toast({
                                                    variant: "destructive",
                                                    title: "No se puede seleccionar imagen",
                                                    description: "El banner ya tiene un vídeo. Debes elegir solo uno.",
                                                });
                                                return;
                                            }
                                            setPendingImageFile(file);
                                        }
                                    }}
                                />
                                {pendingImageFile && (
                                    <p className="text-sm text-muted-foreground">Imagen pendiente: {pendingImageFile.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">O sube un archivo de vídeo:</div>
                                <Input
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm"
                                    disabled={!!pendingImageFile || !!formData.backgroundImage.trim()}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            // Si hay imagen pendiente o URL de imagen, mostrar error
                                            if (pendingImageFile || formData.backgroundImage.trim()) {
                                                toast({
                                                    variant: "destructive",
                                                    title: "No se puede seleccionar vídeo",
                                                    description: "El banner ya tiene una imagen. Debes elegir solo uno.",
                                                });
                                                return;
                                            }
                                            setPendingVideoFile(file);
                                        }
                                    }}
                                />
                                {pendingVideoFile && (
                                    <p className="text-sm text-muted-foreground">Vídeo pendiente: {pendingVideoFile.name}</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <Button variant="outline" onClick={resetDialogState} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Guardando..." : "Guardar Banner"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}