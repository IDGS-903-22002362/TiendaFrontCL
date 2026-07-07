"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, LogOut, Package2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavSection } from "@/lib/storefront/navigation";

type NavLink = {
  href: string;
  label: string;
};

type MobileNavDrawerProps = {
  trigger: ReactNode;
  sections: NavSection[];
  links: NavLink[];
  isAuthenticated: boolean;
  role: string;
  email?: string;
  onLogout: () => void;
};

export function MobileNavDrawer({
  trigger,
  sections,
  links,
  isAuthenticated,
  role,
  email,
  onLogout,
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const closeDrawer = () => setOpen(false);

  const handleLogout = () => {
    closeDrawer();
    onLogout();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(90vw,360px)] border-r border-border bg-card-elevated px-0"
      >
        <SheetHeader className="border-b border-border px-5 pb-5">
          <p className="editorial-label text-primary/70">Tienda Oficial</p>
          <SheetTitle className="mt-2">La Guarida</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col overflow-y-auto px-5 pb-6 pt-5">
          <nav className="space-y-2" aria-label="Navegación móvil">
            {sections.map((section) => {
              const hasChildren = section.columns.some(
                (column) => column.links.length > 0,
              );

              if (!hasChildren) {
                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    onClick={closeDrawer}
                    className="flex min-h-11 items-center justify-between border border-border/80 bg-card/76 px-4 py-3 text-sm font-medium text-foreground transition-[background-color,border-color,transform] hover:-translate-y-px hover:border-primary/18 hover:bg-card"
                  >
                    <span>{section.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              }

              return (
                <Collapsible
                  key={section.id}
                  open={expandedSectionId === section.id}
                  onOpenChange={(nextOpen) =>
                    setExpandedSectionId(nextOpen ? section.id : null)
                  }
                >
                  <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between border border-border/80 bg-card/76 px-4 py-3 text-left text-sm font-medium text-foreground transition-[background-color,border-color] hover:border-primary/18 hover:bg-card">
                    <span>{section.label}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        expandedSectionId === section.id ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 px-1 pb-2 pt-1">
                    {section.columns.flatMap((column) =>
                      column.links.map((link) => (
                        <Link
                          key={`${section.id}-${link.href}`}
                          href={link.href}
                          onClick={closeDrawer}
                          className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      )),
                    )}
                    <Link
                      href={section.href}
                      onClick={closeDrawer}
                      className="flex min-h-11 items-center px-3 text-sm font-semibold text-primary"
                    >
                      Ver todo
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>

          <div className="mt-8 editorial-panel p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">
              Cuenta
            </p>
            {isAuthenticated ? (
              <div className="mt-3 space-y-3">
                <div className="border border-border/70 bg-card px-4 py-3">
                  <p className="truncate text-sm font-medium text-foreground">{email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {role}
                  </p>
                </div>
                <Link
                  href="/profile"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
                >
                  <UserRound className="h-4 w-4 text-primary" />
                  Mi perfil
                </Link>
                <Link
                  href="/order-history"
                  onClick={closeDrawer}
                  className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
                >
                  <Package2 className="h-4 w-4 text-primary" />
                  Mis pedidos
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full justify-start px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            ) : (
              <div className="mt-3">
                <Button asChild className="h-11 w-full">
                  <Link href="/login" onClick={closeDrawer}>
                    Iniciar sesión
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
