"use client";

import { User, Mail, Shield, ShoppingBag, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { user, role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8 text-center text-muted-foreground">
        Cargando perfil...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8 text-center">
        <h2 className="mb-4 text-2xl font-bold">No has iniciado sesión</h2>
        <p className="mb-8 text-text-secondary">
          Por favor inicia sesión para ver tu perfil y tus pedidos.
        </p>
        <Button asChild>
          <Link href="/login">Ir al Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-5 md:py-8">
      <h1 className="mb-6 font-headline text-3xl font-bold md:mb-8 md:text-4xl">Mi Perfil</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {/* User Info Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10 md:h-24 md:w-24">
              <User className="h-10 w-10 text-primary md:h-12 md:w-12" />
            </div>
            <CardTitle className="text-xl">Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col space-y-1">
              <span className="flex items-center text-sm text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" /> Email
              </span>
              <span className="font-medium break-all">{user.email}</span>
            </div>
            
            <div className="flex flex-col space-y-1">
              <span className="flex items-center text-sm text-muted-foreground">
                <Shield className="mr-2 h-4 w-4" /> Rol
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={role === "ADMIN" ? "destructive" : role === "EMPLEADO" ? "default" : "secondary"}>
                  {role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Summary */}
        <div className="flex flex-col gap-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Mis Compras
              </CardTitle>
              <CardDescription>
                Accede rápidamente a tu historial y da seguimiento a tus pedidos
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:gap-4">
              <Link href="/order-history" className="group rounded-[20px] border border-border p-4 transition-colors hover:bg-muted/50 md:rounded-[22px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Historial de Pedidos</p>
                    <p className="text-sm text-text-secondary">Revisa todas tus compras anteriores</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
              
              <Link href="/order-history" className="group rounded-[20px] border border-border p-4 transition-colors hover:bg-muted/50 md:rounded-[22px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Seguimiento</p>
                    <p className="text-sm text-text-secondary">Revisa el estatus de pedidos recientes</p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </CardContent>
          </Card>
          
          {role === "ADMIN" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Accesos del Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/admin" className="group flex items-center justify-between rounded-[20px] border border-border p-4 transition-colors hover:bg-muted/50 md:rounded-[22px]">
                  <div className="space-y-1">
                    <p className="font-medium font-headline">Panel de Administración</p>
                    <p className="text-sm text-text-secondary">Gestionar productos, inventario y órdenes de clientes</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
