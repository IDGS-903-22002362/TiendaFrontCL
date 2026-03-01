"use client";

import { useMemo, useState } from "react";
import { inventarioApi } from "@/lib/api/inventario";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { InventoryAlert } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function InventoryLowStockAlertsPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [productoId, setProductoId] = useState("");
  const [lineaId, setLineaId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [soloCriticas, setSoloCriticas] = useState(false);

  const canUseInventory = useMemo(
    () => Boolean(token) && (role === "ADMIN" || role === "EMPLEADO"),
    [role, token],
  );

  const onSearch = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await inventarioApi.listLowStockAlerts(token, {
        productoId: productoId || undefined,
        lineaId: lineaId || undefined,
        categoriaId: categoriaId || undefined,
        soloCriticas,
        limit: 100,
      });
      setRows(result.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar las alertas",
        description: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header>
        <h1 className="font-headline text-3xl font-bold">Alertas de stock</h1>
        <p className="text-sm text-muted-foreground">
          Consulta de inventario bajo y alertas críticas.
        </p>
      </header>

      {!canUseInventory ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Configura token y rol ADMIN/EMPLEADO desde el panel admin para
            consultar alertas.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Producto ID"
                value={productoId}
                onChange={(event) => setProductoId(event.target.value)}
              />
              <Input
                placeholder="Línea ID"
                value={lineaId}
                onChange={(event) => setLineaId(event.target.value)}
              />
              <Input
                placeholder="Categoría ID"
                value={categoriaId}
                onChange={(event) => setCategoriaId(event.target.value)}
              />
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Checkbox
                  id="solo-criticas"
                  checked={soloCriticas}
                  onCheckedChange={(checked) =>
                    setSoloCriticas(Boolean(checked))
                  }
                />
                <label htmlFor="solo-criticas" className="text-sm">
                  Solo críticas
                </label>
              </div>

              <div className="md:col-span-4">
                <Button onClick={() => void onSearch()} disabled={loading}>
                  {loading ? "Consultando..." : "Consultar alertas"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Stock actual</TableHead>
                    <TableHead>Stock mínimo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5}>Cargando...</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        Sin alertas para los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        key={`${row.productoId}-${row.tallaId ?? "na"}`}
                      >
                        <TableCell>
                          {row.productoNombre ?? row.productoId}
                        </TableCell>
                        <TableCell>
                          {row.tallaCodigo ?? row.tallaId ?? "-"}
                        </TableCell>
                        <TableCell>{row.stockActual}</TableCell>
                        <TableCell>{row.stockMinimo ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.esCritica ? "destructive" : "secondary"
                            }
                          >
                            {row.esCritica ? "Crítica" : "Baja"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
