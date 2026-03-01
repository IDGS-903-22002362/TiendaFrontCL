"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { inventarioApi } from "@/lib/api/inventario";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { InventoryMovement, InventoryMovementType } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
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

export default function InventoryMovementsPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [productoId, setProductoId] = useState("");
  const [tallaId, setTallaId] = useState("");
  const [tipo, setTipo] = useState<InventoryMovementType | "all">("all");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [movTipo, setMovTipo] = useState<
    "entrada" | "salida" | "venta" | "devolucion"
  >("entrada");
  const [movProductoId, setMovProductoId] = useState("");
  const [movTallaId, setMovTallaId] = useState("");
  const [movCantidad, setMovCantidad] = useState("1");
  const [movMotivo, setMovMotivo] = useState("");
  const [movReferencia, setMovReferencia] = useState("");
  const [movOrdenId, setMovOrdenId] = useState("");

  const canUseInventory = useMemo(
    () => Boolean(token) && (role === "ADMIN" || role === "EMPLEADO"),
    [role, token],
  );

  const loadPage = useCallback(
    async (nextCursor?: string, append = false) => {
      if (!token) return;

      setLoading(true);
      try {
        const result = await inventarioApi.listMovements(token, {
          productoId: productoId || undefined,
          tallaId: tallaId || undefined,
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
    [fechaDesde, fechaHasta, productoId, tallaId, tipo, toast, token],
  );

  useEffect(() => {
    if (!canUseInventory) return;
    void loadPage(undefined, false);
  }, [canUseInventory, loadPage]);

  const onRegisterMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    try {
      await inventarioApi.registerMovement(token, {
        tipo: movTipo,
        productoId: movProductoId.trim(),
        tallaId: movTallaId.trim() || undefined,
        cantidad: Number(movCantidad),
        motivo: movMotivo.trim() || undefined,
        referencia: movReferencia.trim() || undefined,
        ordenId: movOrdenId.trim() || undefined,
      });

      toast({ title: "Movimiento registrado" });
      setMovProductoId("");
      setMovTallaId("");
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
            Configura token y rol ADMIN/EMPLEADO desde el panel admin para
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
                <Input
                  required
                  placeholder="Producto ID"
                  value={movProductoId}
                  onChange={(event) => setMovProductoId(event.target.value)}
                />
                <Input
                  placeholder="Talla ID"
                  value={movTallaId}
                  onChange={(event) => setMovTallaId(event.target.value)}
                />
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
                  <Button type="submit">Registrar</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <Input
                placeholder="Producto ID"
                value={productoId}
                onChange={(event) => setProductoId(event.target.value)}
              />
              <Input
                placeholder="Talla ID"
                value={tallaId}
                onChange={(event) => setTallaId(event.target.value)}
              />
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
                    setProductoId("");
                    setTallaId("");
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
                        <TableCell>{row.productoId}</TableCell>
                        <TableCell>{row.tallaId ?? "-"}</TableCell>
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
