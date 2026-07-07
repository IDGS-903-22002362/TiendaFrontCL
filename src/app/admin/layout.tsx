"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Tags,
  Ruler,
  Truck,
  Archive,
  LayoutDashboard,
  LogOut,
  Menu,
  Coins,
  BadgePercent,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";
import { AdminNotificationsPanel } from "@/components/admin/admin-notifications-panel";
import {
  getEmpleadoDefaultAdminPath,
  isEmpleadoAdminPath,
} from "@/lib/admin-access";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    title: "Operación",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
      { href: "/admin/ordenes", label: "Órdenes", icon: ShoppingCart, adminOnly: false },
      { href: "/admin/inventario", label: "Inventario", icon: Archive, adminOnly: false },
      { href: "/admin/puntos", label: "Puntos", icon: Coins, adminOnly: false },
    ],
  },
  {
    title: "Catálogo",
    links: [
      { href: "/admin/productos", label: "Productos", icon: Package, adminOnly: true },
      { href: "/admin/categorias", label: "Categorías", icon: Tags, adminOnly: true },
      { href: "/admin/lineas", label: "Líneas", icon: Tags, adminOnly: true },
      { href: "/admin/tallas", label: "Tallas", icon: Ruler, adminOnly: true },
      { href: "/admin/proveedores", label: "Proveedores", icon: Truck, adminOnly: true },
    ],
  },
  {
    title: "Marketing",
    links: [
      { href: "/admin/banners", label: "Vallas Publicitarias", icon: ImageIcon, adminOnly: true },
      { href: "/admin/ofertas", label: "Ofertas", icon: BadgePercent, adminOnly: true },
      { href: "/admin/recomendaciones", label: "Recomendaciones", icon: Sparkles, adminOnly: true },
    ],
  },
  {
    title: "Integraciones",
    links: [
      { href: "/admin/fedex", label: "FedEx", icon: Truck, adminOnly: true },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, role, user, clearSession, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasAdminAccess =
    isAuthenticated &&
    (role === "ADMIN" || role === "EMPLEADO" || role === "SUPER_ADMIN");

  const canRenderCurrentRoute = hasAdminAccess;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login?redirect=/admin");
        return;
      }

      if (user && user.perfilCompleto === false) {
        router.replace("/complete-profile");
        return;
      }

      if (role !== "ADMIN" && role !== "EMPLEADO" && role !== "SUPER_ADMIN") {
        router.replace("/");
        return;
      }

      if (role === "EMPLEADO" && pathname && !isEmpleadoAdminPath(pathname)) {
        router.replace(getEmpleadoDefaultAdminPath());
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    role,
    user,
    router,
    pathname,
  ]);

  if (isLoading || !canRenderCurrentRoute) {
    return (
      <div
        data-admin="true"
        className="flex min-h-screen items-center justify-center bg-background"
      >
        <p className="text-sm text-text-secondary">
          Verificando accesos administrativos...
        </p>
      </div>
    );
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col gap-6">
      {navGroups.map((group) => {
        const visibleLinks = group.links.filter((link) => {
          const isFullAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

          if (role === "EMPLEADO") {
            return isEmpleadoAdminPath(link.href);
          }

          return !link.adminOnly || isFullAdmin;
        });

        if (visibleLinks.length === 0) return null;

        return (
          <div key={group.title} className="flex flex-col gap-1">
            <h3 className="admin-nav-group-label px-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {group.title}
            </h3>
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (pathname.startsWith(link.href) && link.href !== "/admin");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  data-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "admin-nav-link flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      data-admin="true"
      className="flex min-h-screen w-full flex-col bg-background md:flex-row"
    >
      <header className="admin-mobile-header sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 md:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Abrir menú de administración">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(100vw-2rem,20rem)] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetHeader className="border-b border-sidebar-border px-5 py-5 text-left">
              <SheetTitle className="admin-sidebar-brand font-headline text-xl font-semibold">
                Admin Tienda
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 overflow-auto px-3 py-4" aria-label="Navegación administrativa">
              <NavLinks onNavigate={() => setIsMobileMenuOpen(false)} />
            </nav>
            <div className="border-t border-sidebar-border p-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => {
                  void clearSession();
                  router.push("/");
                }}
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between gap-3">
          <span className="font-headline text-base font-semibold">
            Panel de Administración
          </span>
          <div className="flex items-center gap-2">
            <AdminNotificationsPanel token={token} role={role} />
            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {role}
            </span>
          </div>
        </div>
      </header>

      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:self-start lg:w-72">
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/" className="admin-sidebar-brand flex min-w-0 items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent">
              <Package className="size-4 text-secondary" aria-hidden />
            </span>
            <span className="truncate font-headline text-lg font-semibold">
              Admin Tienda
            </span>
          </Link>
          <AdminNotificationsPanel
            token={token}
            role={role}
            className="shrink-0 text-sidebar-foreground"
          />
        </div>

        <div className="flex-1 overflow-auto px-3 py-4">
          <nav aria-label="Navegación administrativa">
            <NavLinks />
          </nav>
        </div>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-4 flex items-center gap-3 px-1">
            <div
              className="flex size-10 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-sm font-semibold uppercase"
              aria-hidden
            >
              {role?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="truncate text-sm font-medium">Personal</span>
              <span className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
                {role}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => {
              void clearSession();
              router.push("/");
            }}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="admin-main-surface flex w-full max-w-full flex-1 flex-col overflow-hidden p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
