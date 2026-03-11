"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { fetchProducts } from "@/lib/api/storefront";
import { inventarioApi } from "@/lib/api/inventario";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  Product,
  ProductStockSnapshot,
  ProductStockUpdatePayload,
} from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type UpdateMode = "puntual" | "masivo";
type UpdateType = NonNullable<ProductStockUpdatePayload["tipo"]>;

const UPDATE_TYPE_OPTIONS: UpdateType[] = [
  "ajuste",
  "entrada",
  "salida",
  "venta",
  "devolucion",
];

export default function InventoryAdjustmentsPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  const [mode, setMode] = useState<UpdateMode>("puntual");
  const [stockSnapshot, setStockSnapshot] = useState<ProductStockSnapshot | null>(
    null,
  );
  const [loadingStock, setLoadingStock] = useState(false);

  const [cantidadNueva, setCantidadNueva] = useState("0");
  const [tallaId, setTallaId] = useState("");
  const [tipo, setTipo] = useState<UpdateType>("ajuste");
  const [motivo, setMotivo] = useState("");
  const [referencia, setReferencia] = useState("");

  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [bulkMotivo, setBulkMotivo] = useState("");
  const [bulkReferencia, setBulkReferencia] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const canUseInventory = useMemo(
    () => Boolean(token) && (role === "ADMIN" || role === "EMPLEADO"),
    [role, token],
  );

  const productOptions: EntityOption[] = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        label: product.name,
        subtitle: product.description,
      })),
    [products],
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const hasSizeInventory = Boolean(stockSnapshot && stockSnapshot.tallaIds.length > 0);

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const list = await fetchProducts();
        setProducts(list);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudieron cargar productos",
          description: getApiErrorMessage(error),
        });
      } finally {
        setProductsLoading(false);
      }
    };

    void loadProducts();
  }, [toast]);

  useEffect(() => {
    setStockSnapshot(null);
    setTallaId("");
    setBulkValues({});
  }, [selectedProductId]);

  const hydrateBulkFromSnapshot = (snapshot: ProductStockSnapshot) => {
    const bySize = new Map(
      snapshot.inventarioPorTalla.map((entry) => [entry.tallaId, entry.cantidad]),
    );

    const next: Record<string, string> = {};
    snapshot.tallaIds.forEach((id) => {
      next[id] = String(bySize.get(id) ?? 0);
    });
    setBulkValues(next);
  };

  const loadStock = async () => {
    if (!selectedProductId) {
      toast({
        variant: "destructive",
        title: "Producto requerido",
        description: "Selecciona un producto por nombre o clave.",
      });
      return null;
    }

    setLoadingStock(true);
    try {
      const snapshot = await inventarioApi.getProductStock(selectedProductId);
      setStockSnapshot(snapshot);
      hydrateBulkFromSnapshot(snapshot);

      if (snapshot.tallaIds.length === 0) {
        setTallaId("");
      } else if (!snapshot.tallaIds.includes(tallaId)) {
        setTallaId(snapshot.tallaIds[0]);
      }

      return snapshot;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo consultar stock",
        description: getApiErrorMessage(error),
      });
      return null;
    } finally {
      setLoadingStock(false);
    }
  };

  const ensureSnapshot = async () => {
    if (stockSnapshot?.productoId === selectedProductId) {
      return stockSnapshot;
    }

    return loadStock();
  };

  const onSubmitPuntual = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) return;
    if (!selectedProductId) {
      toast({
        variant: "destructive",
        title: "Producto requerido",
        description: "Selecciona un producto antes de guardar.",
      });
      return;
    }

    const snapshot = await ensureSnapshot();
    if (!snapshot) return;

    const requiredTalla = snapshot.tallaIds.length > 0;

    if (requiredTalla && !tallaId) {
      toast({
        variant: "destructive",
        title: "Talla requerida",
        description: "Este producto maneja inventario por talla.",
      });
      return;
    }

    if (!requiredTalla && tallaId) {
      toast({
        variant: "destructive",
        title: "Talla no permitida",
        description: "Este producto no maneja inventario por talla.",
      });
      return;
    }

    if (requiredTalla && !snapshot.tallaIds.includes(tallaId)) {
      toast({
        variant: "destructive",
        title: "Talla inválida",
        description: "La talla no pertenece al producto seleccionado.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await inventarioApi.updateProductStock(token, selectedProductId, {
        cantidadNueva: Number(cantidadNueva),
        tipo,
        ...(tallaId ? { tallaId } : {}),
        motivo: motivo.trim() || undefined,
        referencia: referencia.trim() || undefined,
      });

      toast({ title: "Stock actualizado" });
      await loadStock();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar stock",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitMasivo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) return;
    if (!selectedProductId) {
      toast({
        variant: "destructive",
        title: "Producto requerido",
        description: "Selecciona un producto antes de guardar.",
      });
      return;
    }

    const snapshot = await ensureSnapshot();
    if (!snapshot) return;

    if (snapshot.tallaIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Producto sin tallas",
        description: "Usa ajuste puntual para productos sin inventario por talla.",
      });
      return;
    }

    const inventarioPorTalla = snapshot.tallaIds.map((id) => ({
      tallaId: id,
      cantidad: Number(bulkValues[id] ?? 0),
    }));

    setIsSaving(true);
    try {
      await inventarioApi.replaceProductSizeInventory(token, selectedProductId, {
        inventarioPorTalla,
        motivo: bulkMotivo.trim() || undefined,
        referencia: bulkReferencia.trim() || undefined,
      });

      toast({ title: "Inventario por talla actualizado" });
      await loadStock();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar inventario por talla",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Ajustes de inventario</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste puntual y reemplazo masivo por talla.
        </p>
      </header>

      {!canUseInventory ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Configura token y rol ADMIN/EMPLEADO desde el panel admin para registrar ajustes.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Producto y stock actual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-3">
                <EntityPicker
                  label="Producto"
                  searchLabel="Buscar por nombre, clave o descripción"
                  selectLabel="Selecciona producto"
                  query={productQuery}
                  value={selectedProductId}
                  options={productOptions}
                  onQueryChange={setProductQuery}
                  onValueChange={setSelectedProductId}
                  allowEmpty={false}
                  disabled={productsLoading}
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button
                  type="button"
                  onClick={() => void loadStock()}
                  disabled={loadingStock || !selectedProductId}
                  className="w-full"
                >
                  {loadingStock ? "Consultando..." : "Consultar stock"}
                </Button>
              </div>

              <div className="md:col-span-4 text-sm text-muted-foreground rounded-md border p-3">
                {stockSnapshot ? (
                  <>
                    <p>Producto: {selectedProduct?.name ?? stockSnapshot.productoId}</p>
                    <p>ID: {stockSnapshot.productoId}</p>
                    <p>Existencias totales: {stockSnapshot.existencias}</p>
                    <p>
                      Modo inventario: {hasSizeInventory ? "Por talla" : "General"}
                    </p>
                  </>
                ) : (
                  <p>Selecciona un producto y consulta stock para validar reglas de talla.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modo de actualización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Select value={mode} onValueChange={(value) => setMode(value as UpdateMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="puntual">Ajuste puntual</SelectItem>
                    <SelectItem value="masivo">Reemplazo masivo por talla</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "puntual" ? (
                <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmitPuntual}>
                  <div className="space-y-2">
                    <Label>Cantidad nueva</Label>
                    <Input
                      type="number"
                      min={0}
                      required
                      value={cantidadNueva}
                      onChange={(event) => setCantidadNueva(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Talla</Label>
                    {hasSizeInventory ? (
                      <Select value={tallaId || ""} onValueChange={setTallaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona talla" />
                        </SelectTrigger>
                        <SelectContent>
                          {stockSnapshot?.tallaIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              {id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value="No aplica para este producto" disabled />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={(value) => setTipo(value as UpdateType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {UPDATE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Referencia</Label>
                    <Input
                      value={referencia}
                      onChange={(event) => setReferencia(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Motivo</Label>
                    <Textarea
                      value={motivo}
                      onChange={(event) => setMotivo(event.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Button type="submit" disabled={isSaving || !selectedProductId}>
                      {isSaving ? "Guardando..." : "Guardar ajuste puntual"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={onSubmitMasivo}>
                  {!hasSizeInventory ? (
                    <div className="rounded-md border p-3 text-sm text-muted-foreground">
                      Este producto no maneja inventario por talla.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {stockSnapshot?.tallaIds.map((id) => (
                        <div key={id} className="space-y-2">
                          <Label>{`Talla ${id}`}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={bulkValues[id] ?? "0"}
                            onChange={(event) =>
                              setBulkValues((prev) => ({ ...prev, [id]: event.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Referencia</Label>
                      <Input
                        value={bulkReferencia}
                        onChange={(event) => setBulkReferencia(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Motivo</Label>
                      <Textarea
                        value={bulkMotivo}
                        onChange={(event) => setBulkMotivo(event.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSaving || !hasSizeInventory || !selectedProductId}
                  >
                    {isSaving ? "Guardando..." : "Guardar inventario por talla"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
