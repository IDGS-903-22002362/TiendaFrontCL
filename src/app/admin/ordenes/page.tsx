"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, CreditCard, RefreshCw, Filter, Search, X, Truck } from "lucide-react";
import { ordersApi } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import { fedexAdminApi } from "@/lib/api/fedex";
import type {
  AplazoRefundRequest,
  AplazoRefundRequestStatus,
  AplazoRefundStatusResponse,
  Orden,
  Pago,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  getAplazoAdminErrorMessage,
  getApiErrorMessage,
} from "@/lib/api/errors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const badgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDIENTE: "outline",
  CONFIRMADA: "secondary",
  ENVIADA: "default",
  ENTREGADA: "default",
  CANCELADA: "destructive",
};

const refundRequestLabels: Record<AplazoRefundRequestStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  processed: "Procesada",
};

const refundRequestBadgeVariants: Record<
  AplazoRefundRequestStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  approved: "secondary",
  rejected: "destructive",
  processed: "default",
};

type PaymentProvider = "stripe" | "aplazo" | "unknown";

function getPaymentProvider(payment: Pago | null): PaymentProvider {
  const provider = payment?.provider?.toLowerCase();
  if (provider?.includes("aplazo") || payment?.paymentAttemptId) {
    return "aplazo";
  }
  if (provider?.includes("stripe") || provider?.includes("tarjeta") || payment?.id) {
    return "stripe";
  }
  return "unknown";
}

function isRefundableStatus(status?: string) {
  if (!status) return true;

  const normalized = status.trim().toLowerCase();
  if (
    normalized.includes("cancel") ||
    normalized.includes("fall") ||
    normalized.includes("failed") ||
    normalized === "refunded" ||
    normalized === "reembolsado"
  ) {
    return false;
  }

  return [
    "paid",
    "pagada",
    "completado",
    "completed",
    "partially_refunded",
  ].includes(normalized);
}

function formatCurrency(value?: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(value ?? 0);
}

function formatRefundDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Orden[]>([]);
  const [refundRequests, setRefundRequests] = useState<AplazoRefundRequest[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRefundRequests, setIsLoadingRefundRequests] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [refundStatusFilter, setRefundStatusFilter] =
    useState<AplazoRefundRequestStatus | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isRefundRequestDialogOpen, setIsRefundRequestDialogOpen] =
    useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Orden | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Pago | null>(null);
  const [selectedRefundRequest, setSelectedRefundRequest] =
    useState<AplazoRefundRequest | null>(null);
  const [refundRequestAction, setRefundRequestAction] = useState<
    "approve" | "reject"
  >("approve");
  const [refundStatus, setRefundStatus] =
    useState<AplazoRefundStatusResponse | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundRequestAmount, setRefundRequestAmount] = useState("");
  const [refundRequestReason, setRefundRequestReason] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [refundFormError, setRefundFormError] = useState("");
  const [refundRequestError, setRefundRequestError] = useState("");
  const { toast } = useToast();

  const loadOrders = useCallback(async (estado?: string) => {
    setIsLoading(true);
    try {
      const query = estado && estado !== "TODOS" ? { estado } : {};
      const list = await ordersApi.list(query);
      
      // Sort newest first
      list.sort((a, b) => {
        const first = new Date(a.createdAt ?? 0).getTime();
        const second = new Date(b.createdAt ?? 0).getTime();
        return second - first;
      });

      setOrders(list);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar órdenes",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrders(estadoFilter);
  }, [loadOrders, estadoFilter]);

  const loadRefundRequests = useCallback(async () => {
    setIsLoadingRefundRequests(true);
    try {
      const response = await paymentsApi.listAdminAplazoRefundRequests({
        status: refundStatusFilter,
      });
      setRefundRequests(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar solicitudes Aplazo",
        description: getAplazoAdminErrorMessage(error),
      });
    } finally {
      setIsLoadingRefundRequests(false);
    }
  }, [refundStatusFilter, toast]);

  useEffect(() => {
    void loadRefundRequests();
  }, [loadRefundRequests]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.updateEstado(orderId, newStatus);
      toast({ title: "Estado actualizado exitosamente" });
      void loadOrders(estadoFilter);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error al cambiar estado",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta orden permanentemente?")) return;
    try {
      await ordersApi.cancel(orderId);
      toast({ title: "Orden cancelada exitosamente" });
      void loadOrders(estadoFilter);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error al cancelar orden",
        description: getApiErrorMessage(error),
      });
    }
  }

  const handleCreateFedExShipment = async (order: Orden) => {
    try {
      await fedexAdminApi.shipOrder(order.id);
      toast({ title: "Guia FedEx solicitada" });
      void loadOrders(estadoFilter);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error FedEx",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleCancelFedExShipment = async (order: Orden) => {
    if (order.shipping?.status === "DELIVERED") {
      toast({
        variant: "destructive",
        title: "Guia entregada",
        description: "FedEx ya marco esta guia como entregada; no puede cancelarse desde la UI.",
      });
      return;
    }

    const reason = window.prompt("Motivo para cancelar la guia FedEx");
    if (!reason?.trim()) return;

    try {
      await fedexAdminApi.cancelShipment(order.id, {
        reason: reason.trim(),
        forceRefreshTracking: true,
      });
      toast({ title: "Cancelacion FedEx solicitada" });
      void loadOrders(estadoFilter);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error FedEx",
        description: getApiErrorMessage(error),
      });
    }
  };

  const resetRefundForm = () => {
    setRefundAmount("");
    setRefundReason("");
    setRefundFormError("");
    setPaymentError("");
    setRefundStatus(null);
  };

  const openRefundRequestAction = (
    request: AplazoRefundRequest,
    action: "approve" | "reject",
  ) => {
    setSelectedRefundRequest(request);
    setRefundRequestAction(action);
    setRefundRequestAmount(
      request.refundAmountMinor
        ? String(request.refundAmountMinor / 100)
        : request.refundAmount
        ? String(request.refundAmount)
        : "",
    );
    setRefundRequestReason("");
    setRefundRequestError("");
    setIsRefundRequestDialogOpen(true);
  };

  const loadPaymentForOrder = async (order: Orden) => {
    setSelectedOrder(order);
    setSelectedPayment(null);
    resetRefundForm();
    setIsPaymentDialogOpen(true);
    setIsLoadingPayment(true);

    try {
      const payment = await ordersApi.getPago(order.id);
      setSelectedPayment(payment);

      if (!payment) {
        setPaymentError("Pago no disponible para reembolso.");
        return;
      }

      const provider = getPaymentProvider(payment);
      if (provider === "aplazo" && payment.paymentAttemptId) {
        try {
          const status = await paymentsApi.getAplazoRefundStatus(
            payment.paymentAttemptId,
          );
          setRefundStatus(status);
        } catch {
          setRefundStatus(null);
        }
      }
    } catch (error) {
      setPaymentError(getApiErrorMessage(error));
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const refreshSelectedPayment = async () => {
    if (!selectedOrder) return;

    try {
      const payment = await ordersApi.getPago(selectedOrder.id);
      setSelectedPayment(payment);

      if (payment?.paymentAttemptId && getPaymentProvider(payment) === "aplazo") {
        const status = await paymentsApi.getAplazoRefundStatus(
          payment.paymentAttemptId,
        );
        setRefundStatus(status);
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      setPaymentError(message);
      toast({
        variant: "destructive",
        title: "Error al actualizar pago",
        description: message,
      });
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment) {
      setRefundFormError("Pago no disponible para reembolso.");
      return;
    }

    const provider = getPaymentProvider(selectedPayment);
    const reason = refundReason.trim();
    const amountText = refundAmount.trim();
    const amount = amountText ? Number(amountText) : undefined;

    if (!reason) {
      setRefundFormError("Captura un motivo para el reembolso.");
      return;
    }

    if (amountText && (!Number.isFinite(amount) || Number(amount) <= 0)) {
      setRefundFormError("El monto parcial debe ser mayor a 0.");
      return;
    }

    if (!isRefundableStatus(selectedPayment.status)) {
      setRefundFormError("Este pago no está en un estado reembolsable.");
      return;
    }

    setIsRefunding(true);
    setRefundFormError("");

    try {
      if (provider === "aplazo") {
        if (!selectedOrder) {
          throw new Error("Orden no disponible para crear solicitud.");
        }

        await paymentsApi.createAplazoRefundRequest({
          orderId: selectedOrder.id,
          reason,
        });
      } else if (provider === "stripe") {
        if (!selectedPayment.id) {
          throw new Error("Pago no disponible para reembolso.");
        }

        await paymentsApi.reembolsoAdmin(selectedPayment.id, {
          refundReason: reason,
          ...(amount !== undefined ? { refundAmount: amount } : {}),
        });
      } else {
        throw new Error("Pago no disponible para reembolso.");
      }

      toast({
        title:
          provider === "aplazo"
            ? "Solicitud Aplazo creada"
            : "Reembolso solicitado exitosamente",
      });
      setRefundAmount("");
      setRefundReason("");
      await refreshSelectedPayment();
      await loadRefundRequests();
      void loadOrders(estadoFilter);
    } catch (error) {
      const message =
        provider === "aplazo"
          ? getAplazoAdminErrorMessage(error)
          : getApiErrorMessage(error);
      setRefundFormError(message);
      toast({
        variant: "destructive",
        title: "Error al procesar reembolso",
        description: message,
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleRefundRequestAction = async () => {
    if (!selectedRefundRequest) return;

    const reason = refundRequestReason.trim();
    if (!reason) {
      setRefundRequestError(
        refundRequestAction === "approve"
          ? "Captura una nota de aprobación."
          : "Captura el motivo de rechazo.",
      );
      return;
    }

    try {
      setIsRefunding(true);
      setRefundRequestError("");

      if (refundRequestAction === "approve") {
        const amount = Number(refundRequestAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          setRefundRequestError("El monto del reembolso debe ser mayor a 0.");
          return;
        }

        await paymentsApi.approveAplazoRefundRequest(selectedRefundRequest.id, {
          refundAmountMinor: Math.round(amount * 100),
          reason,
        });
        toast({ title: "Solicitud Aplazo aprobada" });
      } else {
        await paymentsApi.rejectAplazoRefundRequest(selectedRefundRequest.id, {
          reason,
        });
        toast({ title: "Solicitud Aplazo rechazada" });
      }

      setIsRefundRequestDialogOpen(false);
      setSelectedRefundRequest(null);
      await loadRefundRequests();
      void loadOrders(estadoFilter);
    } catch (error) {
      const message = getAplazoAdminErrorMessage(error);
      setRefundRequestError(message);
      toast({
        variant: "destructive",
        title: "Error en solicitud Aplazo",
        description: message,
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    return order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (order.usuarioId && order.usuarioId.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const selectedProvider = getPaymentProvider(selectedPayment);
  const canRefundSelectedPayment =
    Boolean(selectedPayment) &&
    selectedProvider !== "unknown" &&
    selectedProvider !== "aplazo" &&
    isRefundableStatus(selectedPayment?.status);
  const selectedRefunds =
    refundStatus?.refunds ?? selectedPayment?.refunds ?? [];
  const selectedCurrency =
    refundStatus?.currency ?? selectedPayment?.moneda ?? "MXN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h1 className="font-headline text-3xl font-bold">Gestión de Órdenes</h1>
            <p className="text-sm text-muted-foreground">Administra y da seguimiento a los pedidos logísticos.</p>
         </div>
         <Button variant="outline" size="sm" onClick={() => void loadOrders(estadoFilter)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refrescar
         </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
             <Filter className="h-4 w-4 text-muted-foreground"/> Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID de orden o usuario..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button title="Limpiar búsqueda" type="button" onClick={() => setSearchTerm("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4"/>
                </button>
              )}
           </div>
           
           <div className="w-full sm:w-[200px]">
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las etapas</SelectItem>
                  <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                  <SelectItem value="CONFIRMADA">CONFIRMADA</SelectItem>
                  <SelectItem value="ENVIADA">ENVIADA</SelectItem>
                  <SelectItem value="ENTREGADA">ENTREGADA</SelectItem>
                  <SelectItem value="CANCELADA">CANCELADA</SelectItem>
                </SelectContent>
              </Select>
           </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Solicitudes Aplazo</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={refundStatusFilter}
                onValueChange={(value) =>
                  setRefundStatusFilter(
                    value as AplazoRefundRequestStatus | "all",
                  )
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobadas</SelectItem>
                  <SelectItem value="processed">Procesadas</SelectItem>
                  <SelectItem value="rejected">Rechazadas</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadRefundRequests()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refrescar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitud</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRefundRequests ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Cargando solicitudes Aplazo...
                    </TableCell>
                  </TableRow>
                ) : refundRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No hay solicitudes Aplazo con este filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  refundRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs">
                        {request.id}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {request.orderId}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-sm">
                        {request.reason}
                        {request.lastProcessingError ? (
                          <p className="mt-1 truncate text-xs text-destructive">
                            {request.lastProcessingError}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={refundRequestBadgeVariants[request.status]}
                        >
                          {refundRequestLabels[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(request.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {request.status === "pending" ||
                          request.status === "approved" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() =>
                                openRefundRequestAction(request, "approve")
                              }
                            >
                              {request.status === "approved"
                                ? "Reintentar"
                                : "Aprobar"}
                            </Button>
                          ) : null}
                          {request.status === "pending" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs"
                              onClick={() =>
                                openRefundRequestAction(request, "reject")
                              }
                            >
                              Rechazar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">ID Orden</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado Actual</TableHead>
                <TableHead>FedEx</TableHead>
                <TableHead className="text-right min-w-[200px]">Acciones Operativas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando órdenes de la base de datos...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay órdenes con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-xs font-mono">
                       <div className="flex items-center gap-1">
                          {order.id}
                          <button
                            title="Copiar ID"
                            type="button" 
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              void navigator.clipboard.writeText(order.id);
                              toast({ description: "ID copiado al portapapeles" });
                            }}
                          >
                             <Copy className="h-3 w-3" />
                          </button>
                       </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-sm">
                      {order.usuarioId ? (
                        <span className="truncate max-w-[120px] block" title={order.usuarioId}>{order.usuarioId}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Anónimo</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">${order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariants[order.estado] || "default"}>
                        {order.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {order.fulfillmentMethod === "PICKUP" ? (
                        <span className="text-muted-foreground">Pickup</span>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline">
                            {order.shipping?.status ?? "Sin guia"}
                          </Badge>
                          <p className="max-w-[160px] truncate text-muted-foreground">
                            {order.shipping?.trackingNumber ??
                              order.shipping?.serviceName ??
                              order.shipping?.serviceType ??
                              "FedEx"}
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Select 
                        value={order.estado} 
                        onValueChange={(val) => void handleStatusChange(order.id, val)}
                        disabled={order.estado === "CANCELADA" || order.estado === "ENTREGADA"}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Cambiar a..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDIENTE" disabled>PENDIENTE</SelectItem>
                          <SelectItem value="CONFIRMADA">CONFIRMADA</SelectItem>
                          <SelectItem value="ENVIADA">ENVIADA</SelectItem>
                          <SelectItem value="ENTREGADA">ENTREGADA</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {(order.estado === "PENDIENTE" || order.estado === "CONFIRMADA") && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8 text-xs px-2"
                          onClick={() => void handleCancelOrder(order.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-2"
                        onClick={() => void loadPaymentForOrder(order)}
                      >
                        <CreditCard className="mr-1 h-3.5 w-3.5" />
                        Pago
                      </Button>
                      {order.fulfillmentMethod !== "PICKUP" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => void handleCreateFedExShipment(order)}
                          >
                            <Truck className="mr-1 h-3.5 w-3.5" />
                            Guia
                          </Button>
                          {order.shipping?.trackingNumber ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs px-2"
                              onClick={() => void handleCancelFedExShipment(order)}
                              disabled={order.shipping?.status === "DELIVERED"}
                            >
                              Cancelar guia
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          setIsPaymentDialogOpen(open);
          if (!open) {
            setSelectedOrder(null);
            setSelectedPayment(null);
            resetRefundForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pago y reembolso</DialogTitle>
            <DialogDescription>
              {selectedOrder
                ? `Orden ${selectedOrder.id}`
                : "Consulta el pago asociado a la orden."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingPayment ? (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Cargando pago asociado...
            </div>
          ) : paymentError ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {paymentError}
            </div>
          ) : selectedPayment ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-md border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Proveedor
                  </p>
                  <p className="mt-1 font-medium">
                    {selectedProvider === "aplazo"
                      ? "Aplazo"
                      : selectedProvider === "stripe"
                      ? "Stripe"
                      : "No identificado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Estado
                  </p>
                  <Badge className="mt-1" variant="outline">
                    {selectedPayment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Pago ID
                  </p>
                  <p className="mt-1 break-all font-mono text-xs">
                    {selectedPayment.id || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Intento Aplazo
                  </p>
                  <p className="mt-1 break-all font-mono text-xs">
                    {selectedPayment.paymentAttemptId || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Monto
                  </p>
                  <p className="mt-1 font-medium">
                    {formatCurrency(selectedPayment.monto, selectedCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Reembolsado
                  </p>
                  <p className="mt-1 font-medium">
                    {formatCurrency(
                      refundStatus?.totalRefundedAmount ??
                        selectedPayment.totalRefundedAmount,
                      selectedCurrency,
                    )}
                  </p>
                </div>
              </div>

              {!canRefundSelectedPayment ? (
                <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {selectedProvider === "aplazo"
                    ? "Los reembolsos Aplazo se gestionan desde la bandeja de solicitudes. El cliente inicia la solicitud y admin aprueba o rechaza."
                    : "Este pago no está en un estado reembolsable o no tiene los identificadores requeridos."}
                </div>
              ) : (
                <div className="space-y-4 rounded-md border p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="refund-amount">
                        Monto parcial opcional
                      </Label>
                      <Input
                        id="refund-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Vacío = reembolso total"
                        value={refundAmount}
                        onChange={(event) => setRefundAmount(event.target.value)}
                        disabled={isRefunding}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="refund-reason">Motivo</Label>
                      <Textarea
                        id="refund-reason"
                        value={refundReason}
                        onChange={(event) => setRefundReason(event.target.value)}
                        placeholder="Describe el motivo del reembolso"
                        disabled={isRefunding}
                      />
                    </div>
                  </div>

                  {refundFormError ? (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {refundFormError}
                    </div>
                  ) : null}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void refreshSelectedPayment()}
                      disabled={isRefunding}
                    >
                      Actualizar pago
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleRefund()}
                      disabled={isRefunding}
                    >
                      {isRefunding ? "Procesando..." : "Solicitar reembolso"}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {selectedProvider === "aplazo" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      Reembolsos Aplazo
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void refreshSelectedPayment()}
                      disabled={isRefunding || !selectedPayment.paymentAttemptId}
                    >
                      Refrescar estado
                    </Button>
                  </div>

                  {selectedRefunds.length === 0 ? (
                    <div className="rounded-md border border-dashed px-4 py-4 text-sm text-muted-foreground">
                      No hay reembolsos registrados para este intento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Fecha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRefunds.map((refund, index) => (
                            <TableRow key={refund.id ?? `refund-${index}`}>
                              <TableCell className="font-mono text-xs">
                                {refund.id ?? "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {refund.refundState ?? refund.status ?? "-"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(refund.amount, selectedCurrency)}
                              </TableCell>
                              <TableCell>
                                {formatRefundDate(refund.refundDate)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Pago no disponible para reembolso.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRefundRequestDialogOpen}
        onOpenChange={(open) => {
          setIsRefundRequestDialogOpen(open);
          if (!open) {
            setSelectedRefundRequest(null);
            setRefundRequestAmount("");
            setRefundRequestReason("");
            setRefundRequestError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {refundRequestAction === "approve"
                ? "Aprobar devolución Aplazo"
                : "Rechazar devolución Aplazo"}
            </DialogTitle>
            <DialogDescription>
              {selectedRefundRequest
                ? `Solicitud ${selectedRefundRequest.id} · Orden ${selectedRefundRequest.orderId}`
                : "Gestiona la solicitud seleccionada."}
            </DialogDescription>
          </DialogHeader>

          {selectedRefundRequest ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Motivo del cliente
                </p>
                <p className="mt-1">{selectedRefundRequest.reason}</p>
                {selectedRefundRequest.lastProcessingError ? (
                  <p className="mt-2 text-destructive">
                    Último error: {selectedRefundRequest.lastProcessingError}
                  </p>
                ) : null}
              </div>

              {refundRequestAction === "approve" ? (
                <div className="space-y-2">
                  <Label htmlFor="refund-request-amount">
                    Monto a reembolsar
                  </Label>
                  <Input
                    id="refund-request-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={refundRequestAmount}
                    onChange={(event) =>
                      setRefundRequestAmount(event.target.value)
                    }
                    disabled={isRefunding}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="refund-request-reason">
                  {refundRequestAction === "approve"
                    ? "Nota de aprobación"
                    : "Motivo de rechazo"}
                </Label>
                <Textarea
                  id="refund-request-reason"
                  value={refundRequestReason}
                  onChange={(event) =>
                    setRefundRequestReason(event.target.value)
                  }
                  disabled={isRefunding}
                />
              </div>

              {refundRequestError ? (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {refundRequestError}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRefundRequestDialogOpen(false)}
              disabled={isRefunding}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant={
                refundRequestAction === "reject" ? "destructive" : "default"
              }
              onClick={() => void handleRefundRequestAction()}
              disabled={isRefunding}
            >
              {isRefunding
                ? "Procesando..."
                : refundRequestAction === "approve"
                ? "Aprobar y procesar"
                : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
