"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

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
    <div className="container space-y-6 py-8 mx-auto max-w-7xl">
      <header className="flex flex-col gap-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-text-secondary">
          Gestiona los movimientos, ajustes y alertas de stock de la tienda.
        </p>
      </header>

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/admin/inventario"
                ? pathname === "/admin/inventario"
                : pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:border-border hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
