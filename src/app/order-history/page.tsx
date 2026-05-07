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
import { paymentsApi } from "@/lib/api/payments";
import {
  getApiErrorMessage,
  getAplazoRefundRequestErrorMessage,
} from "@/lib/api/errors";
import type { AplazoRefundRequest, Orden } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BadgeVariant = "default" | "secondary" | "destructive";

const statusVariant: Record<string, BadgeVariant> = {
  ENTREGADA: "default",
  CONFIRMADA: "secondary",
  ENVIADA: "secondary",
  CANCELADA: "destructive",
};

const refundStatusLabel: Record<string, string> = {
  pending: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
  processed: "Procesada",
};

function isAplazoOrder(order: Orden) {
  return order.metodoPago?.toLowerCase().includes("aplazo") ?? false;
}

function canRequestRefund(order: Orden) {
  const status = order.estado.trim().toUpperCase();
  return isAplazoOrder(order) && status !== "CANCELADA";
}

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
  const [selectedOrder, setSelectedOrder] = useState<Orden | null>(null);
  const [refundRequests, setRefundRequests] = useState<AplazoRefundRequest[]>(
    [],
  );
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [isLoadingRefunds, setIsLoadingRefunds] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
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

  const loadRefundRequests = useCallback(async (orderId: string) => {
    setIsLoadingRefunds(true);
    setRefundError("");

    try {
      const response = await paymentsApi.listAplazoRefundRequests({ orderId });
      setRefundRequests(response.data);
    } catch (error) {
      setRefundError(getAplazoRefundRequestErrorMessage(error));
      setRefundRequests([]);
    } finally {
      setIsLoadingRefunds(false);
    }
  }, []);

  const openRefundDialog = (order: Orden) => {
    setSelectedOrder(order);
    setRefundReason("");
    setRefundError("");
    setRefundRequests([]);
    void loadRefundRequests(order.id);
  };

  const submitRefundRequest = async () => {
    if (!selectedOrder) return;

    const reason = refundReason.trim();
    if (!reason) {
      setRefundError("Captura el motivo de la devolución.");
      return;
    }

    setIsSubmittingRefund(true);
    setRefundError("");

    try {
      await paymentsApi.createAplazoRefundRequest({
        orderId: selectedOrder.id,
        reason,
      });
      toast({ title: "Solicitud de devolución enviada" });
      setRefundReason("");
      await loadRefundRequests(selectedOrder.id);
    } catch (error) {
      const message = getAplazoRefundRequestErrorMessage(error);
      setRefundError(message);
      toast({
        variant: "destructive",
        title: "No se pudo solicitar la devolución",
        description: message,
      });
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const first = new Date(a.createdAt ?? 0).getTime();
        const second = new Date(b.createdAt ?? 0).getTime();
        return second - first;
      }),
    [orders],
  );

  const hasOpenRefundRequest = refundRequests.some((request) =>
    ["pending", "approved"].includes(request.status),
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
                  {canRequestRefund(order) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => openRefundDialog(order)}
                    >
                      Devolución Aplazo
                    </Button>
                  ) : null}
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Cargando pedidos...</TableCell>
                  </TableRow>
                ) : sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-text-secondary">Aún no tienes pedidos.</TableCell>
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
                      <TableCell className="text-right">
                        {canRequestRefund(order) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openRefundDialog(order)}
                          >
                            Devolución Aplazo
                          </Button>
                        ) : (
                          <span className="text-xs text-text-muted">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setRefundRequests([]);
            setRefundReason("");
            setRefundError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitud de devolución Aplazo</DialogTitle>
            <DialogDescription>
              {selectedOrder
                ? `Pedido ${selectedOrder.id}`
                : "Consulta o crea una solicitud para tu pedido."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingRefunds ? (
              <div className="rounded-md border border-dashed px-4 py-5 text-sm text-text-secondary">
                Consultando solicitudes...
              </div>
            ) : refundRequests.length > 0 ? (
              <div className="space-y-2">
                {refundRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-md border bg-muted/30 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">Solicitud</span>
                      <Badge variant="outline">
                        {refundStatusLabel[request.status] ?? request.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-text-secondary">
                      {request.reason}
                    </p>
                    {request.rejectionReason ? (
                      <p className="mt-2 text-destructive">
                        Motivo de rechazo: {request.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {!hasOpenRefundRequest ? (
              <div className="space-y-2">
                <Label htmlFor="aplazo-refund-reason">
                  Motivo de la devolución
                </Label>
                <Textarea
                  id="aplazo-refund-reason"
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  placeholder="Describe el motivo de la devolución"
                  disabled={isSubmittingRefund}
                />
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-text-secondary">
                Ya hay una solicitud abierta para este pago.
              </div>
            )}

            {refundError ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {refundError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (selectedOrder) void loadRefundRequests(selectedOrder.id);
              }}
              disabled={isLoadingRefunds || isSubmittingRefund}
            >
              Actualizar
            </Button>
            <Button
              type="button"
              onClick={() => void submitRefundRequest()}
              disabled={
                isLoadingRefunds || isSubmittingRefund || hasOpenRefundRequest
              }
            >
              {isSubmittingRefund ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
