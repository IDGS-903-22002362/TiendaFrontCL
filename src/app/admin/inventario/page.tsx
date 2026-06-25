"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { inventarioApi } from "@/lib/api/inventario";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type DashboardRow = {
  productoId: string;
  clave: string;
  descripcion: string;
  existencias: number;
  fisica: number;
  reservada: number;
  noDisponible: number;
  entrante: number;
  disponible: number;
  bajoStock: boolean;
  inventarioPorTalla: Array<{
    tallaId: string;
    cantidad: number;
    fisica: number;
    reservada: number;
  }>;
};

export default function AdminInventoryDashboardPage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [diagnostic, setDiagnostic] = useState<Record<string, unknown> | null>(
    null,
  );
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const loadDashboard = useCallback(
    async (nextCursor?: string, append = false) => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await inventarioApi.listDashboard(token, {
          q: q.trim() || undefined,
          soloBajoStock,
          limit: 50,
          cursor: nextCursor,
        });

        const mapped = (response.data as DashboardRow[]).filter(
          (item) => item?.productoId,
        );

        setRows((prev) => (append ? [...prev, ...mapped] : mapped));
        setCursor(response.pagination?.nextCursor ?? undefined);
        setHasNextPage(Boolean(response.pagination?.hasNextPage));
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudo cargar inventario",
          description: getApiErrorMessage(error),
        });
      } finally {
        setLoading(false);
      }
    },
    [token, q, soloBajoStock, toast],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const resumen = useMemo(() => {
    const bajoStock = rows.filter((row) => row.bajoStock).length;
    const reservado = rows.reduce((acc, row) => acc + (row.reservada || 0), 0);
    const fisico = rows.reduce((acc, row) => acc + (row.fisica || 0), 0);
    return { total: rows.length, bajoStock, reservado, fisico };
  }, [rows]);

  const runDiagnostic = async (productoId: string) => {
    if (!token || !productoId) return;
    setSelectedProductId(productoId);
    setDiagnosticLoading(true);
    try {
      const result = await inventarioApi.getDiagnostic(token, productoId);
      setDiagnostic(result as Record<string, unknown>);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Diagnóstico fallido",
        description: getApiErrorMessage(error),
      });
    } finally {
      setDiagnosticLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{resumen.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bajo stock</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">
            {resumen.bajoStock}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reservado checkout</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{resumen.reservado}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Físico (página)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{resumen.fisico}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock por producto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="inventory-search">Buscar SKU o nombre</Label>
              <Input
                id="inventory-search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Clave, nombre o ID"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="solo-bajo-stock"
                checked={soloBajoStock}
                onCheckedChange={(checked) =>
                  setSoloBajoStock(checked === true)
                }
              />
              <Label htmlFor="solo-bajo-stock">Solo bajo stock</Label>
            </div>
            <Button onClick={() => void loadDashboard()} disabled={loading}>
              Buscar
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Físico</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">No disp.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Sin resultados para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((row) => (
                  <TableRow key={row.productoId}>
                    <TableCell className="font-mono text-xs">{row.clave}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.descripcion}</div>
                      {row.inventarioPorTalla.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {row.inventarioPorTalla
                            .map(
                              (size) =>
                                `${size.tallaId}: ${size.cantidad}${
                                  size.reservada > 0
                                    ? ` (${size.reservada} res.)`
                                    : ""
                                }`,
                            )
                            .join(" · ")}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{row.disponible}</TableCell>
                    <TableCell className="text-right">{row.fisica}</TableCell>
                    <TableCell className="text-right">{row.reservada}</TableCell>
                    <TableCell className="text-right">{row.noDisponible}</TableCell>
                    <TableCell>
                      {row.bajoStock ? (
                        <Badge variant="destructive">Bajo stock</Badge>
                      ) : (
                        <Badge variant="outline">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void runDiagnostic(row.productoId)}
                      >
                        Diagnóstico
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => void loadDashboard(cursor, true)}
              >
                Cargar más
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedProductId ? (
        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico — {selectedProductId}</CardTitle>
          </CardHeader>
          <CardContent>
            {diagnosticLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(diagnostic, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
