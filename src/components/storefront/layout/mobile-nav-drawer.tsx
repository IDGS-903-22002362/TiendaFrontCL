"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, LogOut, Package2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavLink = {
  href: string;
  label: string;
};

type MobileNavDrawerProps = {
  trigger: ReactNode;
  links: NavLink[];
  isAuthenticated: boolean;
  role: string;
  email?: string;
  onLogout: () => void;
};

export function MobileNavDrawer({
  trigger,
  links,
  isAuthenticated,
  role,
  email,
  onLogout,
}: MobileNavDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(90vw,360px)] border-r border-border bg-card px-0"
      >
        <SheetHeader className="border-b border-border px-5 pb-5">
          <SheetTitle>La Guarida</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col px-5 pb-6 pt-5">
          <nav className="space-y-1.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-muted/55"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-[1.75rem] border border-border bg-muted/45 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">
              Cuenta
            </p>
            {isAuthenticated ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl bg-card px-4 py-3">
                  <p className="truncate text-sm font-medium text-foreground">{email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {role}
                  </p>
                </div>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  <UserRound className="h-4 w-4 text-primary" />
                  Mi perfil
                </Link>
                <Link
                  href="/order-history"
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  <Package2 className="h-4 w-4 text-primary" />
                  Mis pedidos
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full justify-start rounded-2xl px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            ) : (
              <div className="mt-3">
                <Button asChild className="h-11 w-full">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
