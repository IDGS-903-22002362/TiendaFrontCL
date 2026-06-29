"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { inventarioApi } from "@/lib/api/inventario";
import { ordersApi } from "@/lib/api/orders";
import {
  calculateEarningsSummary,
  getMexicoMonthRange,
} from "@/lib/admin/earnings";
import {
  AdminInlineAlert,
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
  AdminQuickActionCard,
  AdminSection,
  formatAdminCurrency,
} from "@/components/admin/admin-ui";
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  Activity,
  Plus,
  ArrowRightLeft,
  Search,
  TrendingUp,
  CalendarDays,
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
  const [earnings, setEarnings] = useState({
    dailyTotal: 0,
    monthlyTotal: 0,
    dailyOrdersCount: 0,
    monthlyOrdersCount: 0,
  });

  useEffect(() => {
    async function loadDashboardData() {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);

        const monthRange = getMexicoMonthRange();

        const [summary, monthOrders] = await Promise.all([
          inventarioApi.getOperationalSummary(token),
          ordersApi.list({
            fechaDesde: monthRange.fechaDesde,
            fechaHasta: monthRange.fechaHasta,
          }),
        ]);

        setMetrics({
          productsCount: summary.activeProductsCount,
          lowStockCount: summary.lowStockCount,
          recentMovementsCount: summary.recentMovementsCount,
          pendingOrdersCount: summary.pendingOrdersCount,
        });

        setEarnings(calculateEarningsSummary(monthOrders));
      } catch {
        setError("No se pudo cargar el resumen operativo.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, [token]);

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Centro de control"
        title="Dashboard operativo"
        description="Resumen de ventas, inventario y acciones rápidas para la gestión diaria de la tienda."
      />

      {error ? <AdminInlineAlert>{error}</AdminInlineAlert> : null}

      <AdminSection
        title="Ganancias"
        description="Totales de órdenes pagadas en zona horaria de México (America/Mexico_City)."
        icon={TrendingUp}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminMetricCard
            variant="earnings"
            label="Ganancias del día"
            icon={TrendingUp}
            loading={loading}
            value={formatAdminCurrency(earnings.dailyTotal)}
            hint={
              loading
                ? undefined
                : `${earnings.dailyOrdersCount} ${
                    earnings.dailyOrdersCount === 1 ? "orden pagada" : "órdenes pagadas"
                  } hoy`
            }
          />
          <AdminMetricCard
            variant="featured"
            label="Ganancias del mes"
            icon={CalendarDays}
            loading={loading}
            value={formatAdminCurrency(earnings.monthlyTotal)}
            hint={
              loading
                ? undefined
                : `${earnings.monthlyOrdersCount} ${
                    earnings.monthlyOrdersCount === 1 ? "orden pagada" : "órdenes pagadas"
                  } en el mes actual`
            }
          />
        </div>
      </AdminSection>

      <AdminSection title="Resumen operativo" icon={Activity}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Órdenes pendientes"
            icon={ShoppingCart}
            loading={loading}
            value={metrics.pendingOrdersCount}
          />
          <AdminMetricCard
            label="Alertas de stock"
            icon={AlertTriangle}
            loading={loading}
            value={metrics.lowStockCount}
          />
          <AdminMetricCard
            label="Productos activos"
            icon={Package}
            loading={loading}
            value={metrics.productsCount}
          />
          <AdminMetricCard
            label="Movimientos recientes"
            icon={ArrowRightLeft}
            loading={loading}
            value={metrics.recentMovementsCount}
            hint="Últimos 7 días"
          />
        </div>
      </AdminSection>

      <AdminSection title="Acciones rápidas">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminQuickActionCard
            href="/admin/productos"
            label="Registrar producto"
            icon={Plus}
          />
          <AdminQuickActionCard
            href="/admin/inventario/movimientos"
            label="Registrar movimiento"
            icon={ArrowRightLeft}
          />
          <AdminQuickActionCard
            href="/admin/ordenes"
            label="Consultar órdenes"
            icon={Search}
          />
          <AdminQuickActionCard
            href="/admin/inventario/alertas-stock"
            label="Ver alertas de stock"
            icon={AlertTriangle}
          />
        </div>
      </AdminSection>

      <p className="text-xs text-text-muted">
        Las ganancias se calculan desde órdenes con pago confirmado, excluyendo canceladas y reembolsadas.{" "}
        <Link href="/admin/ordenes" className="text-primary underline-offset-4 hover:underline">
          Ver detalle en Órdenes
        </Link>
        .
      </p>
    </AdminPageShell>
  );
}
