"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ordersApi } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import type { Orden } from "@/lib/types";

const PAID_STATUSES = new Set(["paid", "succeeded", "completado", "completed"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10; // ~30s

function getPaymentLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (PAID_STATUSES.has(normalized)) return "Pagado";
  if (!normalized) return "Pendiente";
  switch (normalized) {
    case "pendiente":
    case "pending":
    case "processing":
      return "Procesando";
    case "fallido":
    case "failed":
      return "Fallido";
    case "cancelado":
    case "canceled":
    case "cancelled":
      return "Cancelado";
    case "reembolsado":
    case "refunded":
      return "Reembolsado";
    default:
      return status;
  }
}

function isOrderPaid(order: Orden | null, paymentStatus: string): boolean {
  if (PAID_STATUSES.has(paymentStatus.trim().toLowerCase())) {
    return true;
  }
  const orderPayment = String(order?.paymentStatus || "").trim().toUpperCase();
  return orderPayment === "PAGADO";
}

export function ConfirmationClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("ordenId") || "";
  const paymentId = searchParams.get("pagoId") || "";
  const fallbackTotal = searchParams.get("total") || "";

  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [total, setTotal] = useState(fallbackTotal);
  const [order, setOrder] = useState<Orden | null>(null);
  const [isVerifying, setIsVerifying] = useState(Boolean(orderId));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPickup = order?.fulfillmentMethod === "PICKUP";
  const isPaid = isOrderPaid(order, paymentStatus);
  const paymentLabel = getPaymentLabel(paymentStatus);

  useEffect(() => {
    if (!orderId) {
      setIsVerifying(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const [nextOrder, payment] = await Promise.all([
          ordersApi.getById(orderId),
          paymentId
            ? paymentsApi.getById(paymentId)
            : paymentsApi.getByOrden(orderId),
        ]);

        if (cancelled) return;

        if (nextOrder) {
          setOrder(nextOrder);
          if (nextOrder.estado) setOrderStatus(nextOrder.estado);
          if (
            typeof nextOrder.total === "number" &&
            Number.isFinite(nextOrder.total)
          ) {
            setTotal(nextOrder.total.toFixed(2));
          }
        }
        const nextPaymentStatus =
          payment?.status ||
          String(nextOrder?.paymentStatus || "") ||
          "";
        if (nextPaymentStatus) {
          setPaymentStatus(nextPaymentStatus);
        }

        const confirmed = isOrderPaid(nextOrder, nextPaymentStatus);
        if (confirmed || attempts >= MAX_POLL_ATTEMPTS) {
          setIsVerifying(false);
          return;
        }
      } catch {
        if (cancelled) return;
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setIsVerifying(false);
          return;
        }
      }

      timerRef.current = setTimeout(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    };

    setIsVerifying(true);
    void poll();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [orderId, paymentId]);

  const title = isPaid
    ? "¡Gracias por tu compra!"
    : isVerifying
      ? "Estamos verificando tu pago"
      : "Estamos validando tu pedido";

  const description = isPaid
    ? isPickup
      ? "Pago recibido. Tu pedido quedó confirmado y pendiente de preparación para recoger en tienda."
      : "Pago recibido. Tu pedido quedó confirmado y pendiente de preparación. La guía estará disponible cuando se entregue a paquetería."
    : "Estamos verificando tu pago. Cuando se confirme, comenzaremos a preparar tu pedido.";

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8 text-center">
      <Card className="w-full max-w-lg rounded-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-success/30 bg-success/15">
            {isPaid ? (
              <CheckCircle className="h-10 w-10 text-success" />
            ) : (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            )}
          </div>
          <CardTitle className="pt-4 text-center font-headline text-3xl font-bold">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-text-secondary">{description}</p>

          <div>
            <p className="font-semibold">Número de pedido:</p>
            <p className="font-mono text-lg text-primary">{orderId || "N/D"}</p>
          </div>

          <div className="grid gap-1 text-left text-sm">
            <p>
              <span className="font-medium">Estado de orden:</span>{" "}
              {isVerifying && !orderStatus ? "Consultando..." : orderStatus || "Pendiente"}
            </p>
            <p>
              <span className="font-medium">Estado de pago:</span>{" "}
              {isVerifying && !paymentStatus ? "Consultando..." : paymentLabel}
            </p>
            <p>
              <span className="font-medium">Total:</span> ${total || "0.00"}
            </p>
          </div>

          {isPickup ? (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-left text-sm">
              <p className="font-semibold">Recoger en tienda</p>
              {order?.pickupLocation ? (
                <p className="mt-1 text-text-secondary">
                  {[
                    order.pickupLocation.name,
                    order.pickupLocation.address,
                    order.pickupLocation.city,
                    order.pickupLocation.state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {order?.pickupInstructions ? (
                <p className="mt-2 text-text-secondary">
                  {order.pickupInstructions}
                </p>
              ) : null}
              {order?.pickupCodeLast4 ? (
                <p className="mt-2">
                  <span className="font-medium">Código termina en:</span>{" "}
                  {order.pickupCodeLast4}
                </p>
              ) : null}
            </div>
          ) : null}

          {!isPickup && order?.shipping ? (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-left text-sm">
              <p className="font-semibold">Envío a domicilio</p>
              <p className="mt-1 text-text-secondary">
                {order.shipping.serviceName ??
                  order.shipping.serviceType ??
                  "Preparación manual"}
                {typeof order.shipping.amount === "number"
                  ? ` · $${order.shipping.amount.toFixed(2)}`
                  : ""}
              </p>
              {order.shipping.trackingNumber ? (
                <p className="mt-2">
                  <span className="font-medium">Guía:</span>{" "}
                  {order.shipping.trackingNumber}
                </p>
              ) : (
                <p className="mt-2 text-text-secondary">
                  Tu pedido está siendo preparado. Recibirás tu guía cuando sea
                  entregado a paquetería.
                </p>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-4 sm:flex-row">
            <Button asChild className="w-full" size="lg">
              <Link href="/products">Seguir comprando</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/order-history">Ver mis pedidos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
