import type { Orden } from "@/lib/types";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// Estado general de la orden (EstadoOrden backend)
export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  EN_PROCESO: "En proceso",
  ENVIADA: "Enviada",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
  PAGADA: "Pagada",
};

export const ORDER_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDIENTE: "outline",
  CONFIRMADA: "secondary",
  EN_PROCESO: "secondary",
  ENVIADA: "secondary",
  ENTREGADA: "default",
  CANCELADA: "destructive",
};

// Estado de pago (PaymentState backend / espejo en la orden)
export const PAYMENT_STATE_LABEL: Record<string, string> = {
  PENDIENTE: "Pago pendiente",
  PAGADO: "Pago confirmado",
  FALLIDO: "Pago fallido",
  REEMBOLSADO: "Reembolsado",
};

export const PAYMENT_STATE_VARIANT: Record<string, BadgeVariant> = {
  PENDIENTE: "outline",
  PAGADO: "default",
  FALLIDO: "destructive",
  REEMBOLSADO: "secondary",
};

// Estado granular de preparacion (PreparationStatus backend)
export const PREPARATION_STATUS_LABEL: Record<string, string> = {
  WAITING_PAYMENT: "Esperando pago",
  PENDING_PREPARATION: "Pendiente de preparación",
  PREPARING: "Preparando pedido",
  READY_TO_SHIP: "Listo para enviar",
  SHIPPED: "Entregado a paquetería",
  READY_FOR_PICKUP: "Listo para recoger",
  PICKED_UP: "Recogido",
  DELIVERED: "Entregado",
  INCIDENT: "Incidencia",
  RETURNED: "Devuelto",
};

// Estado del envio manual a domicilio (shipping.status)
export const MANUAL_SHIPPING_STATUS_LABEL: Record<string, string> = {
  pending_manual_shipment: "Pendiente de envío manual",
  PREPARING: "Preparando",
  READY_TO_SHIP: "Listo para enviar",
  DELIVERED_TO_CARRIER: "Entregado a FedEx",
  IN_TRANSIT: "En tránsito",
  DELIVERED: "Entregado",
  EXCEPTION: "Incidencia",
  INCIDENT: "Incidencia",
  RETURNED: "Devuelto",
  // Compatibilidad con estados FedEx auto (por si existieran)
  LABEL_CREATED: "Guía creada",
  OUT_FOR_DELIVERY: "En reparto",
  CANCELED: "Cancelado",
};

// Estado pickup (FulfillmentStatus backend)
export const PICKUP_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pendiente de preparación",
  PREPARING: "Preparando pedido",
  READY_FOR_PICKUP: "Listo para recoger",
  PICKED_UP: "Recogido",
  EXPIRED: "Recolección expirada",
  CANCELED: "Cancelado",
};

export function getOrderStatusLabel(estado?: string): string {
  if (!estado) return "Pendiente";
  return ORDER_STATUS_LABEL[estado] ?? estado;
}

export function getOrderStatusVariant(estado?: string): BadgeVariant {
  if (!estado) return "outline";
  return ORDER_STATUS_VARIANT[estado] ?? "default";
}

export function getPaymentStateLabel(order: Orden): string {
  const state = String(order.paymentStatus || "").toUpperCase();
  if (state) return PAYMENT_STATE_LABEL[state] ?? state;
  // Fallback en base al estado de la orden
  if (order.estado === "CONFIRMADA" || order.estado === "ENTREGADA") {
    return PAYMENT_STATE_LABEL.PAGADO;
  }
  if (order.estado === "CANCELADA") return "Cancelado";
  return PAYMENT_STATE_LABEL.PENDIENTE;
}

export function getPaymentStateVariant(order: Orden): BadgeVariant {
  const state = String(order.paymentStatus || "").toUpperCase();
  if (state) return PAYMENT_STATE_VARIANT[state] ?? "default";
  if (order.estado === "CONFIRMADA" || order.estado === "ENTREGADA") {
    return "default";
  }
  if (order.estado === "CANCELADA") return "destructive";
  return "outline";
}

export function getPreparationStatusLabel(order: Orden): string {
  const status = String(order.preparationStatus || "").toUpperCase();
  if (status) return PREPARATION_STATUS_LABEL[status] ?? status;
  return "Pendiente";
}

export function getShippingStatusLabel(status?: string): string {
  if (!status) return "Pendiente de envío manual";
  return MANUAL_SHIPPING_STATUS_LABEL[status] ?? status;
}

export function getPickupStatusLabel(status?: string): string {
  if (!status) return "Pendiente de preparación";
  return PICKUP_STATUS_LABEL[status] ?? status;
}

export function isOrderPaid(order: Orden): boolean {
  const state = String(order.paymentStatus || "").toUpperCase();
  if (state) return state === "PAGADO";
  return order.estado === "CONFIRMADA" || order.estado === "ENTREGADA";
}
