"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-ui";

const tabs = [
  { name: "Resumen", href: "/admin/inventario" },
  { name: "Recepciones", href: "/admin/inventario/recepciones" },
  { name: "Movimientos", href: "/admin/inventario/movimientos" },
  { name: "Ajustes", href: "/admin/inventario/ajustes" },
  { name: "Alertas", href: "/admin/inventario/alertas-stock" },
];

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Operación"
        title="Inventario"
        description="Gestiona movimientos, recepciones, ajustes y alertas de stock de la tienda."
      />

      <div className="admin-panel-card rounded-2xl border border-border/80 bg-card p-1.5 shadow-[var(--shadow-card)]">
        <nav
          className="flex gap-1 overflow-x-auto pb-0.5"
          aria-label="Secciones de inventario"
        >
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/admin/inventario"
                ? pathname === "/admin/inventario"
                : pathname === tab.href;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary hover:bg-muted hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </AdminPageShell>
  );
}
