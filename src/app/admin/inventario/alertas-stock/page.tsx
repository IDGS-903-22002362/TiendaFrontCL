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
import { Checkbox } from "@/components/ui/checkbox";
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
              <EntityPicker
                label="Producto"
                searchLabel="Buscar producto por nombre o clave"
                selectLabel="Filtrar por producto"
                query={productQuery}
                value={productoId}
                options={productOptions}
                onQueryChange={setProductQuery}
                onValueChange={setProductoId}
                allowEmpty
                disabled={catalogLoading}
              />

              <EntityPicker
                label="Línea"
                searchLabel="Buscar línea por nombre"
                selectLabel="Filtrar por línea"
                query={lineaQuery}
                value={lineaId}
                options={lineOptions}
                onQueryChange={setLineaQuery}
                onValueChange={setLineaId}
                allowEmpty
                disabled={catalogLoading}
              />

              <EntityPicker
                label="Categoría"
                searchLabel="Buscar categoría por nombre"
                selectLabel="Filtrar por categoría"
                query={categoriaQuery}
                value={categoriaId}
                options={categoryOptions}
                onQueryChange={setCategoriaQuery}
                onValueChange={setCategoriaId}
                allowEmpty
                disabled={catalogLoading}
              />

              <div className="flex items-center gap-2 rounded-md border px-3 py-2 self-end">
                <Checkbox
                  id="solo-criticas"
                  checked={soloCriticas}
                  onCheckedChange={(checked) => setSoloCriticas(Boolean(checked))}
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
                      <TableRow key={`${row.productoId}-${row.tallaId ?? "na"}`}>
                        <TableCell>{row.productoNombre ?? row.productoId}</TableCell>
                        <TableCell>{row.tallaCodigo ?? row.tallaId ?? "-"}</TableCell>
                        <TableCell>{row.stockActual}</TableCell>
                        <TableCell>{row.stockMinimo ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={row.esCritica ? "destructive" : "secondary"}>
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
