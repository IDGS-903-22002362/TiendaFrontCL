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
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 font-headline text-4xl font-bold">Mis Pedidos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
          <CardDescription>
            Aquí puedes ver el historial de tus compras.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell colSpan={4}>Aún no tienes pedidos.</TableCell>
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
                    <TableCell className="text-right">
                      ${order.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
