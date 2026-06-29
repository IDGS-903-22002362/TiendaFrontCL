"use client";

import { AdminRecomendacionesPanel } from "@/components/admin/recomendaciones/admin-recomendaciones-panel";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui";

export default function AdminRecomendacionesPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Marketing"
        title="Recomendaciones"
        description="Configura secciones, pesos, exclusiones y revisa métricas del motor de personalización."
      />

      <AdminRecomendacionesPanel />
    </AdminPageShell>
  );
}
