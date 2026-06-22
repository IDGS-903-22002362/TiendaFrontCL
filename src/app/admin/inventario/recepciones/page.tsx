"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { fetchProducts } from "@/lib/api/storefront";
import { inventarioApi } from "@/lib/api/inventario";
import { getApiErrorMessage } from "@/lib/api/errors";
import { DEVOLUCIONES_POLITICA_TEXTO } from "@/lib/inventory-policy";
import type { Product, RecepcionMercancia, RecepcionEstado } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Info } from "lucide-react";

function mapRecepcion(input: unknown): RecepcionMercancia {
  const item = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const lineas = Array.isArray(item.lineas)
    ? item.lineas.map((raw) => {
        const linea = (raw && typeof raw === "object" ? raw : {}) as Record<
          string,
          unknown
        >;
        return {
          productoId: String(linea.productoId ?? ""),
          tallaId: linea.tallaId ? String(linea.tallaId) : null,
          cantidadEsperada: Number(linea.cantidadEsperada ?? 0),
          cantidadAceptada: Number(linea.cantidadAceptada ?? 0),
          cantidadRechazada: Number(linea.cantidadRechazada ?? 0),
          cantidadPendiente: Number(linea.cantidadPendiente ?? 0),
        };
      })
    : [];

  return {
    id: String(item.id ?? ""),
    proveedorNombre: item.proveedorNombre
      ? String(item.proveedorNombre)
      : undefined,
    referencia: String(item.referencia ?? ""),
    fechaRecepcion: String(item.fechaRecepcion ?? ""),
    responsableId: String(item.responsableId ?? ""),
    estado: String(item.estado ?? "borrador") as RecepcionEstado,
    lineas,
    notas: item.notas ? String(item.notas) : undefined,
  };
}

function estadoBadge(estado: RecepcionEstado) {
  if (estado === "cerrada") return <Badge variant="secondary">Cerrada</Badge>;
  if (estado === "parcial") return <Badge variant="outline">Parcial</Badge>;
  if (estado === "cancelada") return <Badge variant="destructive">Cancelada</Badge>;
  return <Badge>Borrador</Badge>;
}

export default function InventoryRecepcionesPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [recepciones, setRecepciones] = useState<RecepcionMercancia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [referencia, setReferencia] = useState("");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notas, setNotas] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [cantidadEsperada, setCantidadEsperada] = useState("1");
  const [lineasDraft, setLineasDraft] = useState<
    Array<{ productoId: string; cantidadEsperada: number; label: string }>
  >([]);

  const [selectedId, setSelectedId] = useState("");
  const [confirmAceptadas, setConfirmAceptadas] = useState("0");
  const [confirmRechazadas, setConfirmRechazadas] = useState("0");
  const [confirmProductId, setConfirmProductId] = useState("");

  const canUse = useMemo(
    () => Boolean(token) && role === "ADMIN",
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

  const loadRecepciones = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await inventarioApi.listRecepciones(token, { limit: 50 });
      setRecepciones((response.data as unknown[]).map(mapRecepcion));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar recepciones",
        description: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (!canUse) return;
    void fetchProducts().then(setProducts).catch(() => undefined);
    void loadRecepciones();
  }, [canUse, loadRecepciones]);

  const selectedRecepcion = recepciones.find((item) => item.id === selectedId);

  const addLineaDraft = () => {
    if (!productId) return;
    const qty = Math.max(1, Number(cantidadEsperada) || 1);
    const label =
      productOptions.find((item) => item.id === productId)?.label ?? productId;
    setLineasDraft((prev) => [
      ...prev.filter((item) => item.productoId !== productId),
      { productoId: productId, cantidadEsperada: qty, label },
    ]);
    setProductId("");
    setCantidadEsperada("1");
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !referencia.trim()) return;
    setSaving(true);
    try {
      await inventarioApi.createRecepcion(token, {
        referencia: referencia.trim(),
        proveedorNombre: proveedorNombre.trim() || undefined,
        fechaRecepcion: new Date(fechaRecepcion).toISOString(),
        notas: notas.trim() || undefined,
        lineas: lineasDraft.map((linea) => ({
          productoId: linea.productoId,
          cantidadEsperada: linea.cantidadEsperada,
        })),
      });
      toast({ title: "Recepcion creada" });
      setReferencia("");
      setProveedorNombre("");
      setNotas("");
      setLineasDraft([]);
      await loadRecepciones();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo crear la recepcion",
        description: getApiErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!token || !selectedRecepcion?.id || !confirmProductId) return;
    setSaving(true);
    try {
      await inventarioApi.confirmRecepcion(
        token,
        selectedRecepcion.id,
        {
          lineas: [
            {
              productoId: confirmProductId,
              cantidadAceptada: Math.max(0, Number(confirmAceptadas) || 0),
              cantidadRechazada: Math.max(0, Number(confirmRechazadas) || 0),
            },
          ],
        },
        `confirm-${selectedRecepcion.id}-${Date.now()}`,
      );
      toast({ title: "Confirmacion registrada" });
      setConfirmAceptadas("0");
      setConfirmRechazadas("0");
      await loadRecepciones();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al confirmar",
        description: getApiErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (recepcionId: string) => {
    if (!token) return;
    setSaving(true);
    try {
      await inventarioApi.closeRecepcion(token, recepcionId);
      toast({ title: "Recepcion cerrada" });
      await loadRecepciones();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo cerrar",
        description: getApiErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canUse) {
    return (
      <p className="text-muted-foreground">
        Inicia sesion como administrador para gestionar recepciones.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Devoluciones de clientes</AlertTitle>
        <AlertDescription>{DEVOLUCIONES_POLITICA_TEXTO}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Nueva recepcion de mercancia</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ref">Referencia / PO</Label>
                <Input
                  id="ref"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prov">Proveedor</Label>
                <Input
                  id="prov"
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha recepcion</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fechaRecepcion}
                  onChange={(e) => setFechaRecepcion(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <p className="text-sm font-medium">Lineas esperadas</p>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <EntityPicker
                    label="Producto"
                    searchLabel="Buscar producto"
                    selectLabel="Selecciona producto"
                    query={productQuery}
                    onQueryChange={setProductQuery}
                    options={productOptions}
                    value={productId}
                    onValueChange={setProductId}
                    allowEmpty={false}
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label htmlFor="qty-esperada">Esperadas</Label>
                  <Input
                    id="qty-esperada"
                    type="number"
                    min={1}
                    value={cantidadEsperada}
                    onChange={(e) => setCantidadEsperada(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={addLineaDraft}>
                  Agregar linea
                </Button>
              </div>
              {lineasDraft.length > 0 ? (
                <ul className="text-sm text-muted-foreground list-disc pl-5">
                  {lineasDraft.map((linea) => (
                    <li key={linea.productoId}>
                      {linea.label} - {linea.cantidadEsperada} uds.
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <Button type="submit" disabled={saving || lineasDraft.length === 0}>
              Crear recepcion
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recepciones registradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <Skeleton className="h-24 w-full" /> : null}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Lineas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recepciones.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.referencia}</TableCell>
                    <TableCell>{item.proveedorNombre ?? "-"}</TableCell>
                    <TableCell>{estadoBadge(item.estado)}</TableCell>
                    <TableCell>{item.lineas.length}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedId(item.id ?? "")}
                      >
                        Ver / confirmar
                      </Button>
                      {item.estado !== "cerrada" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => void handleClose(item.id!)}
                        >
                          Cerrar
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {selectedRecepcion ? (
            <div className="rounded-md border p-4 space-y-4">
              <h3 className="font-semibold">
                Detalle - {selectedRecepcion.referencia} ({selectedRecepcion.estado})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Esperada</TableHead>
                    <TableHead className="text-right">Aceptada</TableHead>
                    <TableHead className="text-right">Rechazada</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRecepcion.lineas.map((linea) => (
                    <TableRow key={linea.productoId}>
                      <TableCell className="font-mono text-xs">{linea.productoId}</TableCell>
                      <TableCell className="text-right">{linea.cantidadEsperada}</TableCell>
                      <TableCell className="text-right">{linea.cantidadAceptada}</TableCell>
                      <TableCell className="text-right">{linea.cantidadRechazada}</TableCell>
                      <TableCell className="text-right">{linea.cantidadPendiente}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedRecepcion.estado !== "cerrada" ? (
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Producto a confirmar</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={confirmProductId}
                      onChange={(e) => setConfirmProductId(e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      {selectedRecepcion.lineas
                        .filter((linea) => linea.cantidadPendiente > 0)
                        .map((linea) => (
                          <option key={linea.productoId} value={linea.productoId}>
                            {linea.productoId} (pend. {linea.cantidadPendiente})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="w-28 space-y-2">
                    <Label>Aceptadas</Label>
                    <Input
                      type="number"
                      min={0}
                      value={confirmAceptadas}
                      onChange={(e) => setConfirmAceptadas(e.target.value)}
                    />
                  </div>
                  <div className="w-28 space-y-2">
                    <Label>Rechazadas</Label>
                    <Input
                      type="number"
                      min={0}
                      value={confirmRechazadas}
                      onChange={(e) => setConfirmRechazadas(e.target.value)}
                    />
                  </div>
                  <Button disabled={saving || !confirmProductId} onClick={() => void handleConfirm()}>
                    Confirmar lote
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Recepcion cerrada - no admite mas confirmaciones.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
