"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ordersApi } from "@/lib/api/orders";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Orden } from "@/lib/types";

type BadgeVariant = "default" | "secondary" | "destructive";

const statusVariant: Record<string, BadgeVariant> = {
  ENTREGADA: "default",
  CONFIRMADA: "secondary",
  ENVIADA: "secondary",
  CANCELADA: "destructive",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Orden[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await ordersApi.list();
      setOrders(list);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron cargar tus pedidos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const first = new Date(a.createdAt ?? 0).getTime();
        const second = new Date(b.createdAt ?? 0).getTime();
        return second - first;
      }),
    [orders],
  );

  return (
    <div className="container py-5 md:py-8">
      <div className="mb-6 rounded-[26px] border border-border bg-card/90 p-5 shadow-[var(--shadow-card)] md:mb-8 md:rounded-[30px] md:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
          Historial
        </p>
        <h1 className="mt-2 font-headline text-3xl font-bold md:text-4xl">Mis Pedidos</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
          <CardDescription>
            Aquí puedes ver el historial de tus compras.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 md:hidden">
            {isLoading ? (
              <div className="rounded-[22px] border border-border bg-muted/35 p-4 text-sm text-text-secondary">
                Cargando pedidos...
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="rounded-[22px] border border-border bg-muted/35 p-4 text-sm text-text-secondary">
                Aún no tienes pedidos.
              </div>
            ) : (
              sortedOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[22px] border border-border bg-muted/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                        Pedido
                      </p>
                      <p className="mt-1 truncate font-medium">{order.id}</p>
                    </div>
                    <Badge variant={statusVariant[order.estado] || "default"}>
                      {order.estado}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-text-secondary">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <p className="font-headline text-lg font-bold text-secondary">
                      ${order.total.toFixed(2)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Cargando pedidos...</TableCell>
                  </TableRow>
                ) : sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-text-secondary">Aún no tienes pedidos.</TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[order.estado] || "default"}>
                          {order.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-headline text-secondary">
                        ${order.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
