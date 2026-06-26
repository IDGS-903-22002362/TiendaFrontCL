"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { inventarioApi } from "@/lib/api/inventario";
import { productsAdminApi } from "@/lib/api/products-admin";
import { fetchProductById } from "@/lib/api/storefront";
import { tallasApi } from "@/lib/api/tallas";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  InventoryMovement,
  InventoryMovementType,
  ProductStockSnapshot,
  Talla,
} from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { ProductSearchPicker } from "@/components/admin/product-search-picker";
import type { EntityOption } from "@/components/admin/entity-picker";
import { mergeProductNameMap } from "@/hooks/use-admin-product-search";
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
import { readMovementPrefillFromSearchParams } from "@/lib/inventory-prefill";
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

function formatMovementDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function extractProductDetail(value: unknown): {
  descripcion?: string;
  clave?: string;
} {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  return {
    descripcion:
      typeof data.descripcion === "string" ? data.descripcion : undefined,
    clave: typeof data.clave === "string" ? data.clave : undefined,
  };
}

export default function InventoryMovementsPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const urlPrefill = useMemo(
    () => readMovementPrefillFromSearchParams(searchParams),
    [searchParams],
  );
  const pendingTallaPrefill = useRef<string | null>(
    urlPrefill.tallaId || null,
  );

  const [tallas, setTallas] = useState<Talla[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [productNameById, setProductNameById] = useState<Map<string, string>>(
    () => new Map(),
  );

  const [rows, setRows] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);

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
  const [movProductId, setMovProductId] = useState(urlPrefill.productoId);
  const [movProductSeed, setMovProductSeed] = useState<EntityOption[]>(() =>
    urlPrefill.productoId
      ? [
          {
            id: urlPrefill.productoId,
            label: "Cargando producto...",
          },
        ]
      : [],
  );
  const [movStockSnapshot, setMovStockSnapshot] =
    useState<ProductStockSnapshot | null>(null);
  const [movTallaId, setMovTallaId] = useState("");
  const [movCantidad, setMovCantidad] = useState("1");
  const [movMotivo, setMovMotivo] = useState("");
  const [movReferencia, setMovReferencia] = useState("");
  const [movOrdenId, setMovOrdenId] = useState("");

  const canUseInventory = useMemo(
    () =>
      Boolean(token) &&
      (role === "ADMIN" || role === "EMPLEADO" || role === "SUPER_ADMIN"),
    [role, token],
  );

  const handleProductResults = useCallback((options: EntityOption[]) => {
    setProductNameById((current) => mergeProductNameMap(current, options));
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const tallasData = await tallasApi.getAll();
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

  useEffect(() => {
    if (!urlPrefill.productoId) return;

    pendingTallaPrefill.current = urlPrefill.tallaId || null;
    setMovProductId(urlPrefill.productoId);
    setMovTipo("entrada");
    setMovProductSeed((current) => {
      const cached = current.find((item) => item.id === urlPrefill.productoId);
      if (cached && cached.label !== urlPrefill.productoId) {
        return current;
      }

      return [
        {
          id: urlPrefill.productoId,
          label: cached?.label ?? "Cargando producto...",
          subtitle: cached?.subtitle,
        },
      ];
    });
  }, [urlPrefill.productoId, urlPrefill.tallaId]);

  useEffect(() => {
    if (!canUseInventory || !urlPrefill.productoId) return;

    void (async () => {
      let label = urlPrefill.productoId;
      let subtitle: string | undefined;

      try {
        const response = await productsAdminApi.getById(
          urlPrefill.productoId,
          token,
        );
        const product = extractProductDetail(response);

        if (product.descripcion?.trim()) {
          label = product.descripcion.trim();
        } else if (product.clave?.trim()) {
          label = product.clave.trim();
        }

        if (product.clave?.trim()) {
          subtitle = `Clave: ${product.clave.trim()}`;
        }
      } catch {
        const product = await fetchProductById(urlPrefill.productoId);
        if (product?.name?.trim()) {
          label = product.name.trim();
        }
        if (product?.description?.trim()) {
          subtitle = product.description.trim();
        }
      }

      setMovProductSeed([
        {
          id: urlPrefill.productoId,
          label,
          subtitle,
        },
      ]);
    })();
  }, [canUseInventory, token, urlPrefill.productoId]);

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
    setMovStockSnapshot(null);

    if (!movProductId) {
      setMovTallaId("");
      if (!urlPrefill.productoId) {
        pendingTallaPrefill.current = null;
      }
      return;
    }

    if (!pendingTallaPrefill.current) {
      setMovTallaId("");
    }

    const loadStock = async () => {
      try {
        const snapshot = await inventarioApi.getProductStock(movProductId);
        setMovStockSnapshot(snapshot);

        const pendingTalla = pendingTallaPrefill.current;
        if (pendingTalla) {
          pendingTallaPrefill.current = null;
          if (
            snapshot.tallaIds.length === 0 ||
            snapshot.tallaIds.includes(pendingTalla)
          ) {
            setMovTallaId(pendingTalla);
          }
        }
      } catch (error) {
        pendingTallaPrefill.current = null;
        toast({
          variant: "destructive",
          title: "No se pudo cargar stock del producto",
          description: getApiErrorMessage(error),
        });
      }
    };

    void loadStock();
  }, [movProductId, toast, urlPrefill.productoId]);

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
                    <ProductSearchPicker
                      label=""
                      searchLabel="Buscar producto..."
                      selectLabel="Selecciona producto"
                      value={movProductId}
                      onValueChange={setMovProductId}
                      token={token}
                      onResultsChange={handleProductResults}
                      allowEmpty
                      disabled={catalogLoading}
                      seedOptions={movProductSeed}
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
                  <ProductSearchPicker
                    label=""
                    searchLabel="Buscar producto"
                    selectLabel="Producto (Todos)"
                    value={filterProductId}
                    onValueChange={setFilterProductId}
                    token={token}
                    onResultsChange={handleProductResults}
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
                        <TableCell>{formatMovementDate(row.createdAt)}</TableCell>
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
