"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, Loader2, RefreshCw, ScanLine } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getAdminTransactions, type LoyaltyTransaction } from "@/lib/api/loyalty";
import { puedeAsignarPuntos } from "@/lib/types";

export function StaffPointsWorkspace() {
  const { isAuthenticated, role, token, user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated || !puedeAsignarPuntos(role)) return;
    setLoading(true);
    try {
      const response = await getAdminTransactions({
        limit: 50,
        token,
        actorId: role === "EMPLEADO" ? user?.uid : undefined,
      });
      setItems(response.items);
    } catch (error) {
      toast({
        title: "No se pudo cargar el historial",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, role, toast, token, user?.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!puedeAsignarPuntos(role)) {
    return <p className="p-8 text-center text-destructive">No tienes permisos para asignar puntos.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <Card className="overflow-hidden border-[#c8d8cf]">
        <div className="bg-[#073b2a] p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-white/12 p-3"><ScanLine className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold">Asignación por QR</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/75">
                El lector está activo en todas las pantallas de personal. Escanea el QR del cliente; no es necesario abrir esta sección ni capturar su identificador.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Historial reciente</CardTitle>
            <CardDescription>Asignaciones registradas por el sistema de lealtad.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Aún no hay asignaciones para mostrar.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {items.map((item) => (
                <div key={item.transactionId} className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium">Cliente {item.memberId}</p>
                    <p className="text-sm text-muted-foreground">{item.description || "Venta en tienda"}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="font-bold text-[#087443]">+{item.points} puntos</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
