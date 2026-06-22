"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { inventarioApi } from "@/lib/api/inventario";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  Activity,
  Plus,
  ArrowRightLeft,
  Search,
} from "lucide-react";

export default function AdminHomePage() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    productsCount: 0,
    lowStockCount: 0,
    recentMovementsCount: 0,
    pendingOrdersCount: 0,
  });

  useEffect(() => {
    async function loadDashboardData() {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);
        const summary = await inventarioApi.getOperationalSummary(token);
        setMetrics({
          productsCount: summary.activeProductsCount,
          lowStockCount: summary.lowStockCount,
          recentMovementsCount: summary.recentMovementsCount,
          pendingOrdersCount: summary.pendingOrdersCount,
        });
      } catch {
        setError("No se pudo cargar el resumen operativo.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, [token]);

  return (
    <div className="container space-y-8 py-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Centro de Control</h1>
        <p className="text-text-secondary">
          Resumen operativo y acciones rápidas para la gestión de la tienda.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Resumen Operativo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-text-secondary">Órdenes Pendientes</p>
                <ShoppingCart className="h-4 w-4 text-text-muted" />
              </div>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <span className="text-3xl font-bold">{metrics.pendingOrdersCount}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-text-secondary">Alertas de Stock</p>
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <span className="text-3xl font-bold">{metrics.lowStockCount}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-text-secondary">Productos Activos</p>
                <Package className="h-4 w-4 text-text-muted" />
              </div>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <span className="text-3xl font-bold">{metrics.productsCount}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-text-secondary">Movimientos Recientes</p>
                <ArrowRightLeft className="h-4 w-4 text-text-muted" />
              </div>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <span className="text-3xl font-bold">{metrics.recentMovementsCount}</span>
                )}
                <span className="text-xs text-text-muted">últimos 7 días</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-3">
            <Link href="/admin/productos">
              <Plus className="h-6 w-6 mb-1 text-primary" />
              <span>Registrar Producto</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-3">
            <Link href="/admin/inventario/movimientos">
              <ArrowRightLeft className="h-6 w-6 mb-1 text-primary" />
              <span>Registrar Movimiento</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-3">
            <Link href="/admin/ordenes">
              <Search className="h-6 w-6 mb-1 text-primary" />
              <span>Consultar Órdenes</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-3">
            <Link href="/admin/inventario/alertas-stock">
              <AlertTriangle className="h-6 w-6 mb-1 text-primary" />
              <span>Ver Alertas de Stock</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
