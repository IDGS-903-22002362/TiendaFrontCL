"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  AdminPageHeader,
  AdminPageShell,
  AdminPanelCard,
} from "@/components/admin/admin-ui";
import { AdminAssistantPanel } from "@/components/admin/asistente/admin-assistant-panel";

export default function AdminAssistantPage() {
  const { role, isLoading } = useAuth();
  // El backend AI admin exige rol ADMIN; mostramos lo mismo para no ofrecer
  // una vista que la API va a rechazar.
  const isAdmin = role === "ADMIN";

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Analítica"
        title="Asistente Administrativo"
        description="Analiza ventas, pedidos, productos, inventario y promociones con datos reales de la tienda. Solo lectura."
      />

      {isLoading ? (
        <AdminPanelCard>
          <p className="text-sm text-text-secondary">Verificando permisos...</p>
        </AdminPanelCard>
      ) : isAdmin ? (
        <AdminAssistantPanel />
      ) : (
        <AdminPanelCard>
          <p className="text-sm text-text-secondary">
            Este módulo está disponible solo para cuentas administrativas. El
            backend valida el rol en cada consulta.
          </p>
        </AdminPanelCard>
      )}
    </AdminPageShell>
  );
}
