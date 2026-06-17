"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Copy,
  CreditCard,
  RefreshCw,
  Filter,
  Search,
  X,
  Truck,
  PackageCheck,
} from "lucide-react";
import {
  ordersApi,
  fulfillmentAdminApi,
  type ManualShippingStatusInput,
} from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import type { Orden, Pago } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  getPaymentStateLabel,
  getPaymentStateVariant,
  getPreparationStatusLabel,
  getShippingStatusLabel,
  getPickupStatusLabel,
  isOrderPaid,
} from "@/lib/orders/status";
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

type PaymentProvider = "stripe" | "unknown";

function getPaymentProvider(payment: Pago | null): PaymentProvider {
  const provider = payment?.provider?.toLowerCase();
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
  const [isLoading, setIsLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Orden | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Pago | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [refundFormError, setRefundFormError] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("TODOS");

  // Dialogo de gestion de entrega (envio manual / pickup)
  const [isFulfillmentOpen, setIsFulfillmentOpen] = useState(false);
  const [fulfillmentOrder, setFulfillmentOrder] = useState<Orden | null>(null);
  const [isFulfillmentSubmitting, setIsFulfillmentSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [realShippingCost, setRealShippingCost] = useState("");
  const [fulfillmentNotes, setFulfillmentNotes] = useState("");
  const [pickupCode, setPickupCode] = useState("");
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

  const resetRefundForm = () => {
    setRefundAmount("");
    setRefundReason("");
    setRefundFormError("");
    setPaymentError("");
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

    if (provider !== "stripe" || !selectedPayment.id) {
      setRefundFormError("Pago no disponible para reembolso.");
      return;
    }

    setIsRefunding(true);
    setRefundFormError("");

    try {
      await paymentsApi.reembolsoAdmin(selectedPayment.id, {
        refundReason: reason,
        ...(amount !== undefined ? { refundAmount: amount } : {}),
      });

      toast({ title: "Reembolso solicitado exitosamente" });
      setRefundAmount("");
      setRefundReason("");
      await refreshSelectedPayment();
      void loadOrders(estadoFilter);
    } catch (error) {
      const message = getApiErrorMessage(error);
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

  const openFulfillmentDialog = (order: Orden) => {
    setFulfillmentOrder(order);
    setTrackingNumber(order.shipping?.trackingNumber ?? "");
    setServiceName(order.shipping?.serviceName ?? "");
    setRealShippingCost(
      typeof order.shipping?.manualEvidence?.realShippingCost === "number"
        ? String(order.shipping.manualEvidence.realShippingCost)
        : "",
    );
    setFulfillmentNotes("");
    setPickupCode("");
    setIsFulfillmentOpen(true);
  };

  const runFulfillmentAction = async (
    action: () => Promise<unknown>,
    successTitle: string,
  ) => {
    if (!fulfillmentOrder) return;
    setIsFulfillmentSubmitting(true);
    try {
      await action();
      toast({ title: successTitle });
      const refreshedList = await ordersApi.list(
        estadoFilter && estadoFilter !== "TODOS" ? { estado: estadoFilter } : {},
      );
      refreshedList.sort((a, b) => {
        const first = new Date(a.createdAt ?? 0).getTime();
        const second = new Date(b.createdAt ?? 0).getTime();
        return second - first;
      });
      setOrders(refreshedList);
      const updated = refreshedList.find((o) => o.id === fulfillmentOrder.id);
      if (updated) {
        setFulfillmentOrder(updated);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar la entrega",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsFulfillmentSubmitting(false);
    }
  };

  const handleCaptureTracking = () => {
    if (!fulfillmentOrder) return;
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: "Número de guía requerido",
        description: "Captura el número de guía de FedEx para continuar.",
      });
      return;
    }
    const costText = realShippingCost.trim();
    const cost = costText ? Number(costText) : undefined;
    if (costText && (!Number.isFinite(cost) || Number(cost) < 0)) {
      toast({
        variant: "destructive",
        title: "Costo inválido",
        description: "El costo real de envío debe ser un número válido.",
      });
      return;
    }
    void runFulfillmentAction(
      () =>
        fulfillmentAdminApi.captureTracking(fulfillmentOrder.id, {
          trackingNumber: trimmed,
          serviceName: serviceName.trim() || undefined,
          realShippingCost: cost,
          notes: fulfillmentNotes.trim() || undefined,
        }),
      "Guía capturada y pedido entregado a paquetería",
    );
  };

  const handleManualStatus = (status: ManualShippingStatusInput) => {
    if (!fulfillmentOrder) return;
    void runFulfillmentAction(
      () =>
        fulfillmentAdminApi.updateShippingStatus(
          fulfillmentOrder.id,
          status,
          fulfillmentNotes.trim() || undefined,
        ),
      "Estado de envío actualizado",
    );
  };

  const handlePickupComplete = () => {
    if (!fulfillmentOrder) return;
    const code = pickupCode.trim();
    if (!code) {
      toast({
        variant: "destructive",
        title: "Código requerido",
        description: "Captura el código de recolección del cliente.",
      });
      return;
    }
    void runFulfillmentAction(
      () =>
        fulfillmentAdminApi.pickupComplete(fulfillmentOrder.id, { code }),
      "Pedido entregado al cliente",
    );
  };

  const filteredOrders = orders.filter((order) => {
    if (methodFilter !== "TODOS" && (order.fulfillmentMethod ?? "DELIVERY") !== methodFilter) {
      return false;
    }
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
    selectedProvider === "stripe" &&
    isRefundableStatus(selectedPayment?.status);
  const selectedRefunds = selectedPayment?.refunds ?? [];
  const selectedCurrency = selectedPayment?.moneda ?? "MXN";

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
                  <SelectItem value="PENDIENTE">Pendiente de pago</SelectItem>
                  <SelectItem value="CONFIRMADA">Pagada / Confirmada</SelectItem>
                  <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                  <SelectItem value="ENVIADA">Enviada</SelectItem>
                  <SelectItem value="ENTREGADA">Entregada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
           </div>

           <div className="w-full sm:w-[200px]">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los métodos</SelectItem>
                  <SelectItem value="DELIVERY">Envío a domicilio</SelectItem>
                  <SelectItem value="PICKUP">Recoger en tienda</SelectItem>
                </SelectContent>
              </Select>
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
                <TableHead>Entrega</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado Actual</TableHead>
                <TableHead>Envío / Recolección</TableHead>
                <TableHead className="text-right min-w-[200px]">Acciones Operativas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Cargando órdenes de la base de datos...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="text-xs">
                      <Badge
                        variant={
                          order.fulfillmentMethod === "PICKUP"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {order.fulfillmentMethod === "PICKUP"
                          ? "Recoger en tienda"
                          : "Envío a domicilio"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={getPaymentStateVariant(order)}>
                        {getPaymentStateLabel(order)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariants[order.estado] || "default"}>
                        {order.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {order.fulfillmentMethod === "PICKUP" ? (
                        <div className="space-y-1">
                          <Badge variant="outline">
                            {getPickupStatusLabel(order.fulfillmentStatus)}
                          </Badge>
                          {order.pickupCodeLast4 ? (
                            <p className="text-muted-foreground">
                              Código •••• {order.pickupCodeLast4}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline">
                            {getShippingStatusLabel(order.shipping?.status)}
                          </Badge>
                          {order.shipping?.trackingNumber ? (
                            <p className="max-w-[160px] truncate text-muted-foreground">
                              Guía: {order.shipping.trackingNumber}
                            </p>
                          ) : null}
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-2"
                        onClick={() => openFulfillmentDialog(order)}
                        disabled={order.estado === "CANCELADA"}
                      >
                        {order.fulfillmentMethod === "PICKUP" ? (
                          <PackageCheck className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <Truck className="mr-1 h-3.5 w-3.5" />
                        )}
                        Entrega
                      </Button>
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
                    {selectedProvider === "stripe" ? "Stripe" : "No identificado"}
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
                      selectedPayment.totalRefundedAmount,
                      selectedCurrency,
                    )}
                  </p>
                </div>
              </div>

              {!canRefundSelectedPayment ? (
                <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Este pago no está en un estado reembolsable o no tiene los identificadores requeridos.
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

              {selectedRefunds.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Reembolsos</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void refreshSelectedPayment()}
                      disabled={isRefunding}
                    >
                      Refrescar estado
                    </Button>
                  </div>

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
        open={isFulfillmentOpen}
        onOpenChange={(open) => {
          setIsFulfillmentOpen(open);
          if (!open) {
            setFulfillmentOrder(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestión de entrega</DialogTitle>
            <DialogDescription>
              {fulfillmentOrder
                ? `Orden ${fulfillmentOrder.id}`
                : "Administra el envío o la recolección del pedido."}
            </DialogDescription>
          </DialogHeader>

          {fulfillmentOrder
            ? (() => {
                const order = fulfillmentOrder;
                const isPickup = order.fulfillmentMethod === "PICKUP";
                const paid = isOrderPaid(order);
                const cancelled = order.estado === "CANCELADA";
                const actionsDisabled =
                  !paid || cancelled || isFulfillmentSubmitting;
                const direccion = order.direccionEnvio;

                return (
                  <div className="space-y-5">
                    {/* Estado general */}
                    <div className="grid gap-3 rounded-md border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Pago
                        </p>
                        <Badge className="mt-1" variant={getPaymentStateVariant(order)}>
                          {getPaymentStateLabel(order)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Preparación
                        </p>
                        <p className="mt-1 font-medium">
                          {getPreparationStatusLabel(order)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Método
                        </p>
                        <p className="mt-1 font-medium">
                          {isPickup ? "Recoger en tienda" : "Envío a domicilio"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          Total
                        </p>
                        <p className="mt-1 font-medium">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>

                    {!paid ? (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                        Esta orden aún no tiene el pago confirmado. Las acciones de
                        entrega se habilitan cuando el pago esté confirmado.
                      </div>
                    ) : null}
                    {cancelled ? (
                      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Orden cancelada. No se permiten acciones de entrega.
                      </div>
                    ) : null}

                    {/* Productos */}
                    {(order.items ?? []).length > 0 ? (
                      <div className="rounded-md border p-4">
                        <p className="mb-2 text-sm font-semibold">Productos</p>
                        <div className="space-y-1 text-sm">
                          {(order.items ?? []).map((item, index) => (
                            <div
                              key={`${item.productoId}-${item.tallaId ?? ""}-${index}`}
                              className="flex justify-between gap-3"
                            >
                              <span className="min-w-0 truncate text-muted-foreground">
                                {item.cantidad} ×{" "}
                                {item.producto?.descripcion ||
                                  item.producto?.clave ||
                                  item.productoId}
                                {item.tallaId ? ` · Talla ${item.tallaId}` : ""}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Domicilio */}
                    {!isPickup ? (
                      <div className="space-y-4">
                        {direccion ? (
                          <div className="rounded-md border p-4 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {direccion.nombre || direccion.nombreCompleto}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  {[
                                    direccion.calle,
                                    direccion.numero,
                                    direccion.numeroInterior
                                      ? `Int. ${direccion.numeroInterior}`
                                      : "",
                                    direccion.colonia,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                </p>
                                <p className="text-muted-foreground">
                                  {[
                                    direccion.ciudad,
                                    direccion.estado,
                                    direccion.codigoPostal,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                                {direccion.telefono ? (
                                  <p className="mt-1 text-muted-foreground">
                                    Tel: {direccion.telefono}
                                  </p>
                                ) : null}
                                {direccion.referencias ? (
                                  <p className="mt-1 text-muted-foreground">
                                    Ref: {direccion.referencias}
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const text = [
                                    direccion.nombre || direccion.nombreCompleto,
                                    [
                                      direccion.calle,
                                      direccion.numero,
                                      direccion.numeroInterior
                                        ? `Int. ${direccion.numeroInterior}`
                                        : "",
                                      direccion.colonia,
                                    ]
                                      .filter(Boolean)
                                      .join(" "),
                                    [
                                      direccion.ciudad,
                                      direccion.estado,
                                      direccion.codigoPostal,
                                    ]
                                      .filter(Boolean)
                                      .join(", "),
                                    direccion.telefono
                                      ? `Tel: ${direccion.telefono}`
                                      : "",
                                    direccion.referencias
                                      ? `Ref: ${direccion.referencias}`
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join("\n");
                                  void navigator.clipboard.writeText(text);
                                  toast({ description: "Dirección copiada" });
                                }}
                              >
                                <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Sin dirección de envío registrada.
                          </p>
                        )}

                        {/* Captura manual de guía */}
                        <div className="space-y-4 rounded-md border p-4">
                          <p className="text-sm font-semibold">
                            Captura manual de guía FedEx
                          </p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="ff-tracking">Número de guía</Label>
                              <Input
                                id="ff-tracking"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Ej. 7948 1234 5678"
                                disabled={actionsDisabled}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ff-service">Servicio (opcional)</Label>
                              <Input
                                id="ff-service"
                                value={serviceName}
                                onChange={(e) => setServiceName(e.target.value)}
                                placeholder="FedEx Express"
                                disabled={actionsDisabled}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ff-cost">
                                Costo real de envío (opcional)
                              </Label>
                              <Input
                                id="ff-cost"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={realShippingCost}
                                onChange={(e) =>
                                  setRealShippingCost(e.target.value)
                                }
                                placeholder="150.00"
                                disabled={actionsDisabled}
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="ff-notes">Notas (opcional)</Label>
                              <Textarea
                                id="ff-notes"
                                value={fulfillmentNotes}
                                onChange={(e) =>
                                  setFulfillmentNotes(e.target.value)
                                }
                                placeholder="Notas internas del envío"
                                disabled={actionsDisabled}
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            className="w-full"
                            onClick={handleCaptureTracking}
                            disabled={actionsDisabled}
                          >
                            Capturar guía (entregado a FedEx)
                          </Button>
                        </div>

                        {/* Acciones de estado domicilio */}
                        <div className="space-y-2 rounded-md border p-4">
                          <p className="text-sm font-semibold">
                            Acciones de estado
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void runFulfillmentAction(
                                  () =>
                                    fulfillmentAdminApi.markPreparing(order.id),
                                  "Pedido en preparación",
                                )
                              }
                              disabled={actionsDisabled}
                            >
                              Preparando
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void runFulfillmentAction(
                                  () =>
                                    fulfillmentAdminApi.markReadyToShip(order.id),
                                  "Pedido listo para enviar",
                                )
                              }
                              disabled={actionsDisabled}
                            >
                              Listo para enviar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualStatus("IN_TRANSIT")}
                              disabled={actionsDisabled}
                            >
                              En tránsito
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualStatus("DELIVERED")}
                              disabled={actionsDisabled}
                            >
                              Entregado
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualStatus("INCIDENT")}
                              disabled={actionsDisabled}
                            >
                              Incidencia
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualStatus("RETURNED")}
                              disabled={actionsDisabled}
                            >
                              Devuelto
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Pickup */
                      <div className="space-y-4">
                        {order.pickupLocation ? (
                          <div className="rounded-md border p-4 text-sm">
                            <p className="font-medium">
                              {order.pickupLocation.name}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {[
                                order.pickupLocation.address,
                                order.pickupLocation.city,
                                order.pickupLocation.state,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {order.pickupCodeLast4 ? (
                              <p className="mt-2 text-muted-foreground">
                                Código termina en {order.pickupCodeLast4}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="space-y-2 rounded-md border p-4">
                          <p className="text-sm font-semibold">
                            Acciones de recolección
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void runFulfillmentAction(
                                  () =>
                                    fulfillmentAdminApi.pickupPrepare(order.id),
                                  "Pedido en preparación",
                                )
                              }
                              disabled={actionsDisabled}
                            >
                              Preparando
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void runFulfillmentAction(
                                  () =>
                                    fulfillmentAdminApi.pickupReady(order.id),
                                  "Pedido listo para recoger",
                                )
                              }
                              disabled={actionsDisabled}
                            >
                              Listo para recoger
                            </Button>
                          </div>

                          <div className="mt-3 space-y-2">
                            <Label htmlFor="ff-pickup-code">
                              Código de recolección del cliente
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="ff-pickup-code"
                                value={pickupCode}
                                onChange={(e) => setPickupCode(e.target.value)}
                                placeholder="Código completo"
                                inputMode="numeric"
                                disabled={actionsDisabled}
                              />
                              <Button
                                type="button"
                                onClick={handlePickupComplete}
                                disabled={actionsDisabled}
                              >
                                Entregar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
