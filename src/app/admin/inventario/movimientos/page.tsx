"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchProducts } from "@/lib/api/storefront";
import { inventarioApi } from "@/lib/api/inventario";
import { tallasApi } from "@/lib/api/tallas";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  InventoryMovement,
  InventoryMovementType,
  Product,
  ProductStockSnapshot,
  Talla,
} from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DEVOLUCIONES_POLITICA_ADMIN_NOTA,
  DEVOLUCIONES_POLITICA_TEXTO,
} from "@/lib/inventory-policy";
import { Info } from "lucide-react";

const TYPE_OPTIONS: Array<{
  label: string;
  value: InventoryMovementType | "all";
}> = [
  { label: "Todos", value: "all" },
  { label: "Entrada", value: "entrada" },
  { label: "Salida", value: "salida" },
  { label: "Ajuste", value: "ajuste" },
  { label: "Venta", value: "venta" },
  { label: "Devolución", value: "devolucion" },
];

function formatTallaOption(tallas: Talla[], tallaId: string) {
  const matched = tallas.find((item) => item.id === tallaId);
  return matched ? `${matched.codigo} (${tallaId})` : tallaId;
}

function getBadgeVariant(tipo: string) {
  switch (tipo) {
    case "entrada":
      return "default";
    case "salida":
      return "destructive";
    case "venta":
      return "secondary";
    case "devolucion":
      return "outline";
    default:
      return "outline";
  }
}

export default function InventoryMovementsPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [rows, setRows] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [filterProductQuery, setFilterProductQuery] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [filterProductStock, setFilterProductStock] =
    useState<ProductStockSnapshot | null>(null);
  const [filterTallaId, setFilterTallaId] = useState("");
  const [tipo, setTipo] = useState<InventoryMovementType | "all">("all");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [movTipo, setMovTipo] = useState<
    "entrada" | "salida" | "venta" | "devolucion"
  >("entrada");
  const [movProductQuery, setMovProductQuery] = useState("");
  const [movProductId, setMovProductId] = useState("");
  const [movStockSnapshot, setMovStockSnapshot] =
    useState<ProductStockSnapshot | null>(null);
  const [movTallaId, setMovTallaId] = useState("");
  const [movCantidad, setMovCantidad] = useState("1");
  const [movMotivo, setMovMotivo] = useState("");
  const [movReferencia, setMovReferencia] = useState("");
  const [movOrdenId, setMovOrdenId] = useState("");

  const canUseInventory = useMemo(
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

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => {
      map.set(product.id, product.name);
    });
    return map;
  }, [products]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [productsData, tallasData] = await Promise.all([
        fetchProducts(),
        tallasApi.getAll(),
      ]);
      setProducts(productsData);
      setTallas(tallasData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar catálogos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setCatalogLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!canUseInventory) return;
    void loadCatalog();
  }, [canUseInventory, loadCatalog]);

  const loadPage = useCallback(
    async (nextCursor?: string, append = false) => {
      if (!token) return;

      setLoading(true);
      try {
        const result = await inventarioApi.listMovements(token, {
          productoId: filterProductId || undefined,
          tallaId: filterTallaId || undefined,
          tipo: tipo === "all" ? undefined : tipo,
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          limit: 20,
          cursor: nextCursor,
        });

        setRows((prev) => (append ? [...prev, ...result.data] : result.data));
        setCursor(result.pagination?.nextCursor ?? undefined);
        setHasNextPage(result.pagination?.hasNextPage ?? false);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudieron cargar los movimientos",
          description: getApiErrorMessage(error),
        });
      } finally {
        setLoading(false);
      }
    },
    [fechaDesde, fechaHasta, filterProductId, filterTallaId, tipo, toast, token],
  );

  useEffect(() => {
    if (!canUseInventory) return;
    void loadPage(undefined, false);
  }, [canUseInventory, loadPage]);

  useEffect(() => {
    setMovTallaId("");
    setMovStockSnapshot(null);

    if (!movProductId) return;

    const loadStock = async () => {
      try {
        const snapshot = await inventarioApi.getProductStock(movProductId);
        setMovStockSnapshot(snapshot);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudo cargar stock del producto",
          description: getApiErrorMessage(error),
        });
      }
    };

    void loadStock();
  }, [movProductId, toast]);

  useEffect(() => {
    setFilterTallaId("");
    setFilterProductStock(null);

    if (!filterProductId) return;

    const loadStock = async () => {
      try {
        const snapshot = await inventarioApi.getProductStock(filterProductId);
        setFilterProductStock(snapshot);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudo cargar tallas para filtros",
          description: getApiErrorMessage(error),
        });
      }
    };

    void loadStock();
  }, [filterProductId, toast]);

  const onRegisterMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (!movProductId) {
      toast({
        variant: "destructive",
        title: "Producto requerido",
        description: "Selecciona un producto por nombre o clave.",
      });
      return;
    }

    try {
      const stockSnapshot =
        movStockSnapshot?.productoId === movProductId
          ? movStockSnapshot
          : await inventarioApi.getProductStock(movProductId);

      const hasSizeInventory = stockSnapshot.tallaIds.length > 0;

      if (hasSizeInventory && !movTallaId) {
        toast({
          variant: "destructive",
          title: "Talla requerida",
          description:
            "Este producto maneja inventario por talla. Selecciona una talla.",
        });
        return;
      }

      if (!hasSizeInventory && movTallaId) {
        toast({
          variant: "destructive",
          title: "Talla no permitida",
          description: "Este producto no maneja inventario por talla.",
        });
        return;
      }

      if (
        hasSizeInventory &&
        movTallaId &&
        !stockSnapshot.tallaIds.includes(movTallaId)
      ) {
        toast({
          variant: "destructive",
          title: "Talla inválida",
          description: "La talla no pertenece al producto seleccionado.",
        });
        return;
      }

      await inventarioApi.registerMovement(token, {
        tipo: movTipo,
        productoId: movProductId,
        tallaId: movTallaId || undefined,
        cantidad: Number(movCantidad),
        motivo: movMotivo.trim() || undefined,
        referencia: movReferencia.trim() || undefined,
        ordenId: movOrdenId.trim() || undefined,
      });

      toast({ title: "Movimiento registrado" });
      setMovProductId("");
      setMovProductQuery("");
      setMovTallaId("");
      setMovStockSnapshot(null);
      setMovCantidad("1");
      setMovMotivo("");
      setMovReferencia("");
      setMovOrdenId("");
      await loadPage(undefined, false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar el movimiento",
        description: getApiErrorMessage(error),
      });
    }
  };

  const registerTallas = movStockSnapshot?.tallaIds ?? [];
  const filterTallas =
    filterProductStock && filterProductStock.tallaIds.length > 0
      ? filterProductStock.tallaIds
      : tallas.map((item) => item.id);

  const isFiltered = Boolean(filterProductId || filterTallaId || tipo !== "all" || fechaDesde || fechaHasta);

  return (
    <div className="space-y-6">
      {movTipo === "devolucion" ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Política de devoluciones</AlertTitle>
          <AlertDescription>
            {DEVOLUCIONES_POLITICA_TEXTO} {DEVOLUCIONES_POLITICA_ADMIN_NOTA}
          </AlertDescription>
        </Alert>
      ) : null}
      {!canUseInventory ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Configura token y rol ADMIN desde el panel admin para
            consultar inventario.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Registrar movimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-12"
                onSubmit={onRegisterMovement}
              >
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-medium">Producto</label>
                  <div className="w-full">
                    <EntityPicker
                      label=""
                      searchLabel="Buscar producto..."
                      selectLabel="Selecciona producto"
                      query={movProductQuery}
                      value={movProductId}
                      options={productOptions}
                      onQueryChange={setMovProductQuery}
                      onValueChange={setMovProductId}
                      allowEmpty={false}
                      disabled={catalogLoading}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select
                    value={movTipo}
                    onValueChange={(value) =>
                      setMovTipo(
                        value as "entrada" | "salida" | "venta" | "devolucion",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                      <SelectItem value="venta">Venta</SelectItem>
                      <SelectItem value="devolucion">Devolución</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Talla</label>
                  {registerTallas.length > 0 ? (
                    <Select value={movTallaId || ""} onValueChange={setMovTallaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona talla" />
                      </SelectTrigger>
                      <SelectContent>
                        {registerTallas.map((id) => (
                          <SelectItem key={id} value={id}>
                            {formatTallaOption(tallas, id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value="No aplica para este producto" disabled />
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Cantidad</label>
                  <Input
                    required
                    type="number"
                    min={1}
                    value={movCantidad}
                    onChange={(event) => setMovCantidad(event.target.value)}
                  />
                </div>

                <div className="md:col-span-2 flex items-end">
                  <Button type="submit" disabled={!movProductId} className="w-full">
                    Registrar
                  </Button>
                </div>

                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-medium">Orden ID (opcional)</label>
                  <Input
                    placeholder="Venta / Devolución"
                    value={movOrdenId}
                    onChange={(event) => setMovOrdenId(event.target.value)}
                  />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-medium">Referencia (opcional)</label>
                  <Input
                    placeholder="Documento o persona"
                    value={movReferencia}
                    onChange={(event) => setMovReferencia(event.target.value)}
                  />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-medium">Motivo (opcional)</label>
                  <Input
                    placeholder="Justificación del movimiento"
                    value={movMotivo}
                    onChange={(event) => setMovMotivo(event.target.value)}
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border/50 mb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Historial</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">

              <div className="flex flex-wrap items-center gap-3 mb-6 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="w-[200px]">
                  <EntityPicker
                    label=""
                    searchLabel="Buscar producto"
                    selectLabel="Producto (Todos)"
                    query={filterProductQuery}
                    value={filterProductId}
                    options={productOptions}
                    onQueryChange={setFilterProductQuery}
                    onValueChange={setFilterProductId}
                    allowEmpty
                    disabled={catalogLoading}
                  />
                </div>

                <div className="w-[140px]">
                <Select
                  value={filterTallaId || "__all__"}
                  onValueChange={(value) =>
                    setFilterTallaId(value === "__all__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Talla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {filterTallas.map((id) => (
                      <SelectItem key={id} value={id}>
                        {formatTallaOption(tallas, id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                <div className="w-[140px]">
                <Select
                  value={tipo}
                  onValueChange={(value) =>
                    setTipo(value as InventoryMovementType | "all")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadPage(undefined, false)}
                  disabled={loading}
                >
                  Buscar
                </Button>

                {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterProductId("");
                    setFilterProductQuery("");
                    setFilterTallaId("");
                    setTipo("all");
                    setFechaDesde("");
                    setFechaHasta("");
                    void loadPage(undefined, false);
                  }}
                >
                  Limpiar
                </Button>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-text-muted">
                        No hay movimientos para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {productNameById.get(row.productoId) ?? row.productoId}
                          <span className="block text-[10px] text-text-muted font-mono">{row.id}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(row.tipo) as "default" | "destructive" | "secondary" | "outline"} className="capitalize">
                            {row.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.tallaId
                            ? formatTallaOption(tallas, row.tallaId)
                            : "-"}
                        </TableCell>
                        <TableCell>{row.cantidad}</TableCell>
                        <TableCell>{row.createdAt ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!hasNextPage || loading}
                  onClick={() => void loadPage(cursor, true)}
                >
                  Cargar más
                </Button>
                {hasNextPage ? (
                  <span className="text-xs text-muted-foreground">
                    Hay más resultados.
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No hay más páginas.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
