"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  fetchCategories,
  fetchProducts,
  fetchProductById,
} from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { tallasApi } from "@/lib/api/tallas";
import { providersApi } from "@/lib/api/providers";
import { productsAdminApi } from "@/lib/api/products-admin";
import type {
  Category,
  Linea,
  Product,
  ProductSizeStock,
  Proveedor,
  Talla,
} from "@/lib/types";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type PendingImageUpload = {
  id: string;
  file: File;
  previewUrl: string;
};

const EMPTY_FORM = {
  descripcion: "",
  clave: "",
  precioPublico: "",
  precioCompra: "",
  existencias: "0",
  proveedorId: "",
  categoriaId: "",
  lineaId: "",
  tallaIds: [] as string[],
  inventarioPorTalla: [] as ProductSizeStock[],
  imagenes: [] as string[],
};

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value ? [value] : [];
  }

  return [];
}

function toNumberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapSizeInventory(input: unknown): ProductSizeStock[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      const item =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const tallaId = toStringValue(item.tallaId ?? item.id ?? item.codigo);
      return {
        tallaId,
        cantidad: toNumberValue(item.cantidad),
      };
    })
    .filter((entry) => Boolean(entry.tallaId));
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isGeneratedPlaceholderImage(url: string): boolean {
  return /picsum\.photos\/seed\//i.test(url);
}

function extractDetailRecord(value: unknown): Record<string, unknown> {
  const payload =
    value && typeof value === "object" && "data" in value
      ? (value as { data?: unknown }).data
      : value;

  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as Record<string, unknown>;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [lineaQuery, setLineaQuery] = useState("");
  const [categoriaQuery, setCategoriaQuery] = useState("");
  const [tallaQuery, setTallaQuery] = useState("");
  const [proveedorQuery, setProveedorQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [pendingImageUploads, setPendingImageUploads] = useState<
    PendingImageUpload[]
  >([]);
  const [pendingDeletedImages, setPendingDeletedImages] = useState<string[]>(
    [],
  );

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchProducts();
      setProducts(list);
      setSelectedProductId((current) =>
        current && !list.some((product) => product.id === current) ? "" : current,
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar productos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const loadMeta = useCallback(async () => {
    setIsLoadingMeta(true);
    try {
      const [lineasData, tallasData, categoriasData, proveedoresData] = await Promise.all([
        lineasApi.getAll(),
        tallasApi.getAll(),
        fetchCategories(),
        providersApi.getAll(),
      ]);

      setLineas(lineasData);
      setTallas(tallasData);
      setCategorias(categoriasData);
      setProveedores(proveedoresData);
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
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    return () => {
      // Prevent object URL leaks from local previews.
      pendingImageUploads.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, [pendingImageUploads]);

  const productOptions: EntityOption[] = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        label: product.name,
        subtitle: `${product.clave ?? ""} ${product.description}`.trim(),
      })),
    [products],
  );

  const lineOptions: EntityOption[] = useMemo(
    () =>
      lineas.map((linea) => ({
        id: linea.id,
        label: linea.nombre,
        subtitle: `Código ${linea.codigo}`,
      })),
    [lineas],
  );

  const categoryOptions: EntityOption[] = useMemo(
    () =>
      categorias.map((category) => ({
        id: category.id,
        label: category.name,
        subtitle: category.slug,
      })),
    [categorias],
  );

  const providerOptions: EntityOption[] = useMemo(
    () =>
      proveedores.map((provider) => ({
        id: provider.id,
        label: provider.nombre,
        subtitle: `${provider.codigo ?? ""} ${provider.contacto ?? ""}`.trim(),
      })),
    [proveedores],
  );

  const filteredTallas = useMemo(() => {
    const query = normalizeSearchValue(tallaQuery);
    if (!query) {
      return tallas;
    }

    return tallas.filter((talla) =>
      normalizeSearchValue(`${talla.codigo} ${talla.descripcion}`).includes(
        query,
      ),
    );
  }, [tallaQuery, tallas]);

  const filteredProducts = useMemo(() => {
    const query = normalizeSearchValue(productSearchQuery);

    return products.filter((product) => {
      if (selectedProductId && product.id !== selectedProductId) {
        return false;
      }

      if (!query) {
        return true;
      }

      return normalizeSearchValue(
        `${product.name} ${product.description} ${product.category} ${product.lineName ?? ""} ${product.clave ?? ""}`,
      ).includes(query);
    });
  }, [productSearchQuery, products, selectedProductId]);

  const clearPendingImageChanges = () => {
    pendingImageUploads.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPendingImageUploads([]);
    setPendingDeletedImages([]);
  };

  const openForm = async (product?: Product) => {
    if (product) {
      setEditingProductId(product.id);
      setIsDialogOpen(true);
      setIsLoadingDetail(true);

      try {
        const [detailRes, storefrontDetail] = await Promise.all([
          productsAdminApi.getById(product.id),
          fetchProductById(product.id),
        ]);

        const detailData = extractDetailRecord(detailRes);

        setFormData({
          descripcion: toStringValue(detailData.descripcion, product.name),
          clave: toStringValue(
            detailData.clave,
            product.name || `PROD-${product.id.slice(0, 6).toUpperCase()}`,
          ),
          precioPublico: toStringValue(
            detailData.precioPublico,
            String(product.price),
          ),
          precioCompra: toStringValue(detailData.precioCompra, "0"),
          existencias: toStringValue(
            detailData.existencias,
            String(product.stockTotal ?? product.stock ?? 0),
          ),
          proveedorId: toStringValue(detailData.proveedorId, ""),
          categoriaId: toStringValue(
            detailData.categoriaId,
            categorias.find((cat) => cat.name === product.category)?.id ?? "",
          ),
          lineaId: toStringValue(
            detailData.lineaId,
            storefrontDetail?.lineId ?? "",
          ),
          tallaIds: toStringArray(detailData.tallaIds),
          inventarioPorTalla:
            mapSizeInventory(detailData.inventarioPorTalla).length > 0
              ? mapSizeInventory(detailData.inventarioPorTalla)
              : storefrontDetail?.inventarioPorTalla ?? [],
          imagenes: toStringArray(detailData.imagenes).filter(
            (url) => !isGeneratedPlaceholderImage(url),
          ),
        });
        setSelectedProductId(product.id);
        setLineaQuery(
          lineas.find((linea) => linea.id === toStringValue(detailData.lineaId))
            ?.nombre ?? "",
        );
        setCategoriaQuery(
          categorias.find(
            (categoria) => categoria.id === toStringValue(detailData.categoriaId),
          )?.name ?? "",
        );
        setTallaQuery("");
        setProveedorQuery(
          proveedores.find(
            (proveedor) =>
              proveedor.id === toStringValue(detailData.proveedorId),
          )?.nombre ?? "",
        );
        clearPendingImageChanges();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudo cargar el detalle del producto",
          description: getApiErrorMessage(error),
        });
      } finally {
        setIsLoadingDetail(false);
      }
    } else {
      setEditingProductId(null);
      setFormData(EMPTY_FORM);
      setLineaQuery("");
      setCategoriaQuery("");
      setTallaQuery("");
      setProveedorQuery("");
      clearPendingImageChanges();
      setIsDialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (
      !formData.descripcion.trim() ||
      !formData.clave.trim() ||
      !formData.precioPublico.trim() ||
      !formData.precioCompra.trim() ||
      !formData.existencias.trim() ||
      !formData.proveedorId.trim()
    ) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description:
          "Nombre, clave, precio público, precio de compra, existencias y proveedor son obligatorios",
      });
      return;
    }

    const precioPublico = Number(formData.precioPublico);
    const precioCompra = Number(formData.precioCompra);
    const existencias = Number(formData.existencias);

    if (
      !Number.isFinite(precioPublico) ||
      !Number.isFinite(precioCompra) ||
      !Number.isFinite(existencias)
    ) {
      toast({
        variant: "destructive",
        title: "Datos inválidos",
        description: "Precio público, precio de compra y existencias deben ser numéricos",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        clave: formData.clave.trim(),
        descripcion: formData.descripcion.trim(),
        precioPublico,
        precioCompra,
        existencias,
        proveedorId: formData.proveedorId.trim(),
        categoriaId: formData.categoriaId || undefined,
        lineaId: formData.lineaId || undefined,
        tallaIds: formData.tallaIds,
      } as {
        clave: string;
        descripcion: string;
        precioPublico: number;
        precioCompra: number;
        existencias: number;
        proveedorId: string;
        categoriaId?: string;
        lineaId?: string;
        tallaIds: string[];
        inventarioPorTalla?: ProductSizeStock[];
      };

      if (formData.tallaIds.length > 0) {
        const normalizedInventory = formData.tallaIds.map((tallaId) => {
          const matched = formData.inventarioPorTalla.find(
            (entry) => entry.tallaId === tallaId,
          );
          return {
            tallaId,
            cantidad: matched?.cantidad ?? 0,
          };
        });

        payload.inventarioPorTalla = normalizedInventory;
        payload.existencias = normalizedInventory.reduce(
          (total, entry) => total + entry.cantidad,
          0,
        );
      }

      let targetProductId = editingProductId;

      if (editingProductId) {
        await productsAdminApi.update(editingProductId, payload);
        const updatedDetail = extractDetailRecord(
          await productsAdminApi.getById(editingProductId),
        );
        const persistedName = toStringValue(updatedDetail.descripcion).trim();
        const persistedClave = toStringValue(updatedDetail.clave).trim();
        const persistedPrice = Number(updatedDetail.precioPublico);
        const persistedPurchasePrice = Number(updatedDetail.precioCompra);
        const persistedStock = Number(updatedDetail.existencias);
        const persistedProvider = toStringValue(updatedDetail.proveedorId).trim();
        const expectedPrice = Number(payload.precioPublico);

        if (
          persistedName !== payload.descripcion ||
          persistedClave !== payload.clave ||
          persistedProvider !== payload.proveedorId ||
          (!Number.isNaN(persistedPrice) &&
            Math.abs(persistedPrice - expectedPrice) > 0.001) ||
          (!Number.isNaN(persistedPurchasePrice) &&
            Math.abs(persistedPurchasePrice - payload.precioCompra) > 0.001) ||
          (!Number.isNaN(persistedStock) &&
            Math.abs(persistedStock - payload.existencias) > 0.001)
        ) {
          throw new Error(
            "La API respondió 200, pero el producto no reflejó los cambios esperados.",
          );
        }

        toast({ title: "Producto actualizado con éxito" });
      } else {
        const created = (await productsAdminApi.create(payload)) as {
          id?: string;
          data?: { id?: string };
        };
        targetProductId = created.id ?? created.data?.id ?? null;
        toast({ title: "Producto creado con éxito" });
      }

      if (!targetProductId) {
        throw new Error("No se pudo resolver el ID del producto para imágenes");
      }

      if (pendingImageUploads.length > 0) {
        const uploadData = new FormData();
        pendingImageUploads.forEach((item) => {
          uploadData.append("images", item.file);
        });
        await productsAdminApi.uploadImages(targetProductId, uploadData);
      }

      if (pendingDeletedImages.length > 0) {
        for (const imageUrl of pendingDeletedImages) {
          try {
            await productsAdminApi.deleteImage(targetProductId, imageUrl);
          } catch (error) {
            if (
              error instanceof ApiError &&
              error.status === 404 &&
              /no existe/i.test(getApiErrorMessage(error))
            ) {
              continue;
            }
            throw error;
          }
        }
      }

      setIsDialogOpen(false);
      setEditingProductId(null);
      setFormData(EMPTY_FORM);
      setLineaQuery("");
      setCategoriaQuery("");
      setTallaQuery("");
      setProveedorQuery("");
      clearPendingImageChanges();
      void loadProducts();
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

  const handleToggleTalla = (tallaId: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        if (prev.tallaIds.includes(tallaId)) {
          return prev;
        }
        return {
          ...prev,
          tallaIds: [...prev.tallaIds, tallaId],
          inventarioPorTalla: prev.inventarioPorTalla.some(
            (entry) => entry.tallaId === tallaId,
          )
            ? prev.inventarioPorTalla
            : [...prev.inventarioPorTalla, { tallaId, cantidad: 0 }],
        };
      }

      return {
        ...prev,
        tallaIds: prev.tallaIds.filter((currentId) => currentId !== tallaId),
        inventarioPorTalla: prev.inventarioPorTalla.filter(
          (entry) => entry.tallaId !== tallaId,
        ),
      };
    });
  };

  const handleUploadImages = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const nextPending = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingImageUploads((prev) => [...prev, ...nextPending]);
    event.target.value = "";
  };

  const handleDeleteImage = async (imageUrl: string) => {
    const isPendingPreview = imageUrl.startsWith("blob:");

    if (isPendingPreview) {
      setPendingImageUploads((prev) => {
        const toRemove = prev.find((item) => item.previewUrl === imageUrl);
        if (toRemove) {
          URL.revokeObjectURL(toRemove.previewUrl);
        }
        return prev.filter((item) => item.previewUrl !== imageUrl);
      });
      return;
    }

    try {
      if (isGeneratedPlaceholderImage(imageUrl)) {
        setFormData((prev) => ({
          ...prev,
          imagenes: prev.imagenes.filter((url) => url !== imageUrl),
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        imagenes: prev.imagenes.filter((url) => url !== imageUrl),
      }));
      setPendingDeletedImages((prev) =>
        prev.includes(imageUrl) ? prev : [...prev, imageUrl],
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar la imagen",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de que deseas eliminar (soft delete) este producto?",
      )
    )
      return;

    try {
      await productsAdminApi.delete(id);
      if (selectedProductId === id) {
        setSelectedProductId("");
      }
      toast({ title: "Producto eliminado" });
      void loadProducts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al eliminar producto",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleEditSelectedProduct = async () => {
    if (!selectedProductId) {
      return;
    }

    const selected = products.find((product) => product.id === selectedProductId);
    if (!selected) {
      toast({
        variant: "destructive",
        title: "Selección inválida",
        description: "El producto seleccionado ya no existe en el listado.",
      });
      setSelectedProductId("");
      return;
    }

    await openForm(selected);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra el inventario visible en la tienda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadProducts()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => openForm()}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Producto
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <EntityPicker
            label="Búsqueda inteligente de producto"
            searchLabel="Buscar por nombre, clave, categoría o línea"
            selectLabel="Selecciona producto para editar"
            query={productSearchQuery}
            value={selectedProductId}
            options={productOptions}
            onQueryChange={setProductSearchQuery}
            onValueChange={setSelectedProductId}
            allowEmpty
            emptyLabel="Sin selección"
            disabled={isLoading}
          />
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => void handleEditSelectedProduct()}
              disabled={!selectedProductId || isLoading}
            >
              Editar seleccionado
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setProductSearchQuery("");
                setSelectedProductId("");
              }}
              disabled={isLoading}
            >
              Limpiar filtro
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría / Línea</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Inventario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Cargando productos del catálogo...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No hay productos disponibles para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const stockTotal = product.stockTotal ?? product.stock;
                  const hasSizeInventory = Boolean(product.hasSizeInventory);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-10 h-10 rounded-sm object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-sm bg-muted flex flex-col items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {product.description}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{product.category}</span>
                          <span className="text-xs text-muted-foreground">
                            {product.lineName || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        ${product.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span
                            className={`text-sm ${stockTotal <= 5 ? "text-destructive font-bold" : ""}`}
                          >
                            {stockTotal}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {hasSizeInventory ? "Por talla" : "General"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => openForm(product)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => void handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductId ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(isLoadingMeta || isLoadingDetail) && (
              <p className="text-sm text-muted-foreground">
                Cargando datos de formulario...
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Nombre del producto *</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    descripcion: e.target.value,
                  }))
                }
                disabled={isLoadingDetail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clave">Clave / SKU del producto *</Label>
              <Input
                id="clave"
                value={formData.clave}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, clave: e.target.value }))
                }
                disabled={isLoadingDetail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio">Precio Público ($) *</Label>
              <Input
                id="precio"
                type="number"
                min="0"
                step="0.01"
                value={formData.precioPublico}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    precioPublico: e.target.value,
                  }))
                }
                disabled={isLoadingDetail}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <EntityPicker
                label="Línea"
                searchLabel="Buscar línea por nombre"
                selectLabel="Selecciona línea"
                query={lineaQuery}
                value={formData.lineaId}
                options={lineOptions}
                onQueryChange={setLineaQuery}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    lineaId: value,
                  }))
                }
                allowEmpty
                emptyLabel="Sin línea"
                disabled={isLoadingMeta || isLoadingDetail}
              />
              <EntityPicker
                label="Categoría"
                searchLabel="Buscar categoría por nombre"
                selectLabel="Selecciona categoría"
                query={categoriaQuery}
                value={formData.categoriaId}
                options={categoryOptions}
                onQueryChange={setCategoriaQuery}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoriaId: value,
                  }))
                }
                allowEmpty
                emptyLabel="Sin categoría"
                disabled={isLoadingMeta || isLoadingDetail}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="precio-compra">Precio Compra ($) *</Label>
                <Input
                  id="precio-compra"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precioCompra}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      precioCompra: e.target.value,
                    }))
                  }
                  disabled={isLoadingDetail}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="existencias">Existencias *</Label>
                <Input
                  id="existencias"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.existencias}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      existencias: e.target.value,
                    }))
                  }
                  disabled={isLoadingDetail}
                />
              </div>
              <EntityPicker
                label="Proveedor *"
                searchLabel="Buscar proveedor por nombre o código"
                selectLabel="Selecciona proveedor"
                query={proveedorQuery}
                value={formData.proveedorId}
                options={providerOptions}
                onQueryChange={setProveedorQuery}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    proveedorId: value,
                  }))
                }
                disabled={isLoadingMeta || isLoadingDetail}
              />
            </div>

            <div className="space-y-2">
              <Label>Tallas por producto</Label>
              <Input
                placeholder="Buscar talla por código o descripción"
                value={tallaQuery}
                onChange={(event) => setTallaQuery(event.target.value)}
                disabled={isLoadingMeta || isLoadingDetail}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border p-3">
                {filteredTallas.length === 0 ? (
                  <span className="text-sm text-muted-foreground col-span-full">
                    No hay tallas disponibles para el filtro actual.
                  </span>
                ) : (
                  filteredTallas.map((talla) => (
                    <label
                      key={talla.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={formData.tallaIds.includes(talla.id)}
                        onCheckedChange={(checked) =>
                          handleToggleTalla(talla.id, checked === true)
                        }
                        disabled={isLoadingDetail}
                      />
                      <span>{talla.codigo || talla.descripcion}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imágenes del producto</Label>
              {editingProductId ? (
                <>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => void handleUploadImages(event)}
                    disabled={isSaving}
                  />
                  {(pendingImageUploads.length > 0 ||
                    pendingDeletedImages.length > 0) && (
                      <p className="text-xs text-muted-foreground">
                        Cambios de imágenes pendientes. Se aplican al guardar.
                      </p>
                    )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formData.imagenes.map((imageUrl) => (
                      <div
                        key={imageUrl}
                        className="relative border rounded-md overflow-hidden"
                      >
                        <img
                          src={imageUrl}
                          alt="Imagen del producto"
                          className="h-24 w-full object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-7 w-7"
                          onClick={() => void handleDeleteImage(imageUrl)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {pendingImageUploads.map((item) => (
                      <div
                        key={item.id}
                        className="relative border rounded-md overflow-hidden"
                      >
                        <img
                          src={item.previewUrl}
                          alt="Imagen nueva"
                          className="h-24 w-full object-cover"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-7 w-7"
                          onClick={() =>
                            void handleDeleteImage(item.previewUrl)
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Guarda el producto primero para gestionar imágenes.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingProductId(null);
                setFormData(EMPTY_FORM);
                setLineaQuery("");
                setCategoriaQuery("");
                setTallaQuery("");
                setProveedorQuery("");
                clearPendingImageChanges();
              }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={isSaving || isLoadingDetail}
            >
              {isSaving ? "Guardando..." : "Guardar Producto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

