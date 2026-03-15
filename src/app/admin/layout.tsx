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
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const adminNavLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/ordenes", label: "Órdenes", icon: ShoppingCart },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/inventario", label: "Inventario", icon: Archive },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/lineas", label: "Líneas", icon: Tags },
  { href: "/admin/tallas", label: "Tallas", icon: Ruler },
  { href: "/admin/proveedores", label: "Proveedores", icon: Truck },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, role, clearSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || (role !== "ADMIN" && role !== "EMPLEADO")) {
        router.replace("/login?redirect=/admin");
      }
    }
  }, [isAuthenticated, isLoading, role, router]);

  if (isLoading || (!isAuthenticated && role !== "ADMIN" && role !== "EMPLEADO")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Verificando accesos administrativos...</p>
      </div>
    );
  }

  const NavLinks = () => (
    <>
      {adminNavLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/admin");

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            <Icon className="h-5 w-5" />
            {link.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
      {/* Mobile Header & Nav */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="sm:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sm:max-w-xs">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle className="font-headline text-2xl font-bold">Admin Tienda</SheetTitle>
            </SheetHeader>
            <nav className="grid gap-2 text-lg font-medium">
              <NavLinks />
            </nav>
            <div className="absolute bottom-4 left-4 right-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  void clearSession();
                  router.push("/");
                }}
              >
                <LogOut className="h-5 w-5" /> Cerrar Sesión
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between">
          <span className="font-headline font-bold text-lg">Panel de Administración</span>
          <span className="text-xs text-muted-foreground uppercase">{role}</span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-background md:block md:w-64 lg:w-72">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package className="h-6 w-6" />
              <span className="font-headline text-xl">Admin Tienda</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
              <NavLinks />
            </nav>
          </div>
          <div className="mt-auto p-4 border-t">
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {role?.charAt(0) || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Personal</span>
                <span className="text-xs text-muted-foreground uppercase">{role}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                void clearSession();
                router.push("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 w-full max-w-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
