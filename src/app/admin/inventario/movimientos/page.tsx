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

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">
          Movimientos de inventario
        </h1>
        <p className="text-sm text-muted-foreground">
          Historial con filtros y paginación cursor-based.
        </p>
      </header>

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
                className="grid gap-3 md:grid-cols-4"
                onSubmit={onRegisterMovement}
              >
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

                <div className="md:col-span-2">
                  <EntityPicker
                    label="Producto"
                    searchLabel="Buscar por nombre, clave o descripción"
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

                <div className="space-y-2">
                  <p className="text-sm font-medium">Talla</p>
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

                <Input
                  required
                  type="number"
                  min={1}
                  value={movCantidad}
                  onChange={(event) => setMovCantidad(event.target.value)}
                />
                <Input
                  placeholder="Orden ID (venta/devolución)"
                  value={movOrdenId}
                  onChange={(event) => setMovOrdenId(event.target.value)}
                  className="md:col-span-2"
                />
                <Input
                  placeholder="Referencia"
                  value={movReferencia}
                  onChange={(event) => setMovReferencia(event.target.value)}
                  className="md:col-span-2"
                />
                <Textarea
                  placeholder="Motivo"
                  value={movMotivo}
                  onChange={(event) => setMovMotivo(event.target.value)}
                  className="md:col-span-4"
                />

                <div className="md:col-span-4">
                  <Button type="submit" disabled={!movProductId}>
                    Registrar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <EntityPicker
                  label="Producto"
                  searchLabel="Buscar por nombre, clave o descripción"
                  selectLabel="Filtrar por producto"
                  query={filterProductQuery}
                  value={filterProductId}
                  options={productOptions}
                  onQueryChange={setFilterProductQuery}
                  onValueChange={setFilterProductId}
                  allowEmpty
                  disabled={catalogLoading}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Talla</p>
                <Select
                  value={filterTallaId || "__all__"}
                  onValueChange={(value) =>
                    setFilterTallaId(value === "__all__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
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
                <p className="text-xs text-muted-foreground">
                  {filterTallaId ? `ID talla: ${filterTallaId}` : "Sin filtro de talla"}
                </p>
              </div>

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
              <Input
                type="datetime-local"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
              />

              <div className="md:col-span-5 flex flex-wrap gap-2">
                <Button
                  onClick={() => void loadPage(undefined, false)}
                  disabled={loading}
                >
                  Aplicar filtros
                </Button>
                <Button
                  variant="outline"
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Cargando...</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Sin resultados.</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.tipo}</TableCell>
                        <TableCell>
                          {productNameById.get(row.productoId) ?? row.productoId}
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
