"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCategories, fetchProducts } from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { inventarioApi } from "@/lib/api/inventario";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Category, InventoryAlert, Linea, Product } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { EntityPicker, type EntityOption } from "@/components/admin/entity-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

export default function InventoryLowStockAlertsPage() {
  const { token, role } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [rows, setRows] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const [productQuery, setProductQuery] = useState("");
  const [productoId, setProductoId] = useState("");

  const [lineaQuery, setLineaQuery] = useState("");
  const [lineaId, setLineaId] = useState("");

  const [categoriaQuery, setCategoriaQuery] = useState("");
  const [categoriaId, setCategoriaId] = useState("");

  const [soloCriticas, setSoloCriticas] = useState(false);

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
      categorias.map((categoria) => ({
        id: categoria.id,
        label: categoria.name,
        subtitle: categoria.slug,
      })),
    [categorias],
  );

  useEffect(() => {
    if (!canUseInventory) return;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const [productsData, lineasData, categoriasData] = await Promise.all([
          fetchProducts(),
          lineasApi.getAll(),
          fetchCategories(),
        ]);

        setProducts(productsData);
        setLineas(lineasData);
        setCategorias(categoriasData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudieron cargar catálogos",
          description: getApiErrorMessage(error),
        });
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, [canUseInventory, toast]);

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

  const isFiltered = Boolean(productoId || lineaId || categoriaId || soloCriticas);

  return (
    <div className="space-y-6">
      {!canUseInventory ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Configura token y rol ADMIN desde el panel admin para
            consultar alertas.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3 border-b border-border/50 mb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Historial de Alertas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>

              <div className="flex flex-wrap items-center gap-3 mb-6 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="w-[200px]">
                  <EntityPicker
                    label=""
                    searchLabel="Buscar producto"
                    selectLabel="Producto (Todos)"
                    query={productQuery}
                    value={productoId}
                    options={productOptions}
                    onQueryChange={setProductQuery}
                    onValueChange={setProductoId}
                    allowEmpty
                    disabled={catalogLoading}
                  />
                </div>

                <div className="w-[180px]">
                  <EntityPicker
                    label=""
                    searchLabel="Buscar línea"
                    selectLabel="Línea (Todas)"
                    query={lineaQuery}
                    value={lineaId}
                    options={lineOptions}
                    onQueryChange={setLineaQuery}
                    onValueChange={setLineaId}
                    allowEmpty
                    disabled={catalogLoading}
                  />
                </div>

                <div className="w-[180px]">
                  <EntityPicker
                    label=""
                    searchLabel="Buscar categoría"
                    selectLabel="Categoría (Todas)"
                    query={categoriaQuery}
                    value={categoriaId}
                    options={categoryOptions}
                    onQueryChange={setCategoriaQuery}
                    onValueChange={setCategoriaId}
                    allowEmpty
                    disabled={catalogLoading}
                  />
                </div>

                <div className="flex items-center gap-2 bg-background border rounded-md px-3 h-12 ml-2">
                  <Switch
                    id="solo-criticas"
                    checked={soloCriticas}
                    onCheckedChange={(checked) => setSoloCriticas(Boolean(checked))}
                  />
                  <label htmlFor="solo-criticas" className="text-sm cursor-pointer select-none">
                    Críticas
                  </label>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => void onSearch()}
                  disabled={loading}
                >
                  Buscar
                </Button>

                {isFiltered && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setProductQuery("");
                      setProductoId("");
                      setLineaQuery("");
                      setLineaId("");
                      setCategoriaQuery("");
                      setCategoriaId("");
                      setSoloCriticas(false);
                      void onSearch();
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
                    <TableHead>Talla</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Stock Mín.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-24 inline-block" /></TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                        No hay alertas para los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={`${row.productoId}-${row.tallaId ?? "na"}`}>
                        <TableCell>
                          {row.productoNombre ?? row.productoId}
                          <span className="block text-[10px] text-text-muted font-mono">{row.productoId}</span>
                        </TableCell>
                        <TableCell>{row.tallaCodigo ?? row.tallaId ?? "-"}</TableCell>
                        <TableCell className="font-semibold">{row.stockActual}</TableCell>
                        <TableCell className="text-text-muted">{row.stockMinimo ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={row.esCritica ? "destructive" : "secondary"}>
                            {row.esCritica ? "Crítico" : "Bajo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href="/admin/inventario/ajustes">
                              <ArrowRightLeft className="h-3 w-3" />
                              Ajustar
                            </Link>
                          </Button>
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
