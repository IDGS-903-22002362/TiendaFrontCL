"use client";

import { AdminRecomendacionesPanel } from "@/components/admin/recomendaciones/admin-recomendaciones-panel";

export default function AdminRecomendacionesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Recomendaciones</h1>
        <p className="text-sm text-muted-foreground">
          Configura secciones, pesos, exclusiones y revisa métricas del motor de personalización.
        </p>
      </div>

      <AdminRecomendacionesPanel />
    </div>
  );
}
