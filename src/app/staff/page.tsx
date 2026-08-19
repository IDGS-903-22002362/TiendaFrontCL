"use client";

import Link from "next/link";
import { ArrowRight, LogOut, ScanLine, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { puedeAsignarPuntos, type UserRole } from "@/lib/types";

function workspaceFor(role: UserRole | ""): { href: string; label: string } | null {
  if (role === "SUPER_ADMIN") return { href: "/super-admin/usuarios", label: "Abrir Super Admin" };
  if (role === "ADMIN") return { href: "/admin", label: "Abrir administración" };
  if (role === "EMPLEADO") return { href: "/admin/pos", label: "Abrir punto de venta" };
  if (role === "CONCESION_VENDEDOR") return { href: "/empleado/puntos", label: "Abrir espacio de empleado" };
  if (role === "EMPLEADO_CLUB") return { href: "/empleado-club/beneficios", label: "Abrir espacio Club León" };
  return null;
}

export default function StaffLandingPage() {
  const { role, user, clearSession } = useAuth();
  const workspace = workspaceFor(role);

  return (
    <main className="grid min-h-screen place-items-center bg-[#edf3ef] p-5">
      <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#c8d8cf] bg-white shadow-sm">
        <div className="bg-[#073b2a] px-6 py-8 text-white sm:px-10">
          <ShieldCheck className="mb-5 h-9 w-9 text-[#9dd6b5]" />
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#9dd6b5]">Acceso interno</p>
          <h1 className="mt-2 text-3xl font-bold">Hola, {user?.nombre || "equipo Club León"}</h1>
          <p className="mt-3 max-w-xl text-white/75">
            Esta cuenta está destinada a operación interna y no puede realizar compras en la tienda pública.
          </p>
        </div>
        <div className="space-y-5 p-6 sm:p-10">
          {puedeAsignarPuntos(role) ? (
            <div className="flex gap-3 rounded-xl bg-[#eff8f2] p-4 text-[#173d2d]">
              <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-[#087443]" />
              <p className="text-sm">El escáner de clientes está activo. Puedes escanear un QR desde esta pantalla o desde cualquier sección autorizada.</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            {workspace ? (
              <Button asChild className="flex-1 bg-[#087443] hover:bg-[#066338]">
                <Link href={workspace.href}>{workspace.label}<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void clearSession()} className="flex-1">
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
