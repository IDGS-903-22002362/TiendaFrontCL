"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ordersApi } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import type { Orden } from "@/lib/types";
import {
  getAplazoStatusDescription,
  getAplazoStatusLabel,
  normalizeAplazoStatus,
} from "@/lib/aplazo";

export function ConfirmationClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("ordenId") || "";
  const paymentId = searchParams.get("pagoId") || "";
  const paymentAttemptId = searchParams.get("paymentAttemptId") || "";
  const fallbackStatus = searchParams.get("status") || "";
  const fallbackTotal = searchParams.get("total") || "";

  const [orderStatus, setOrderStatus] = useState(fallbackStatus);
  const [paymentStatus, setPaymentStatus] = useState(fallbackStatus);
  const [total, setTotal] = useState(fallbackTotal);
  const [order, setOrder] = useState<Orden | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderId));
  const isPickup = order?.fulfillmentMethod === "PICKUP";
  const isPaid =
    normalizeAplazoStatus(paymentStatus) === "paid" ||
    paymentStatus === "COMPLETADO";
  const normalizedAplazoStatus = normalizeAplazoStatus(paymentStatus);
  const paymentLabel = normalizedAplazoStatus
    ? getAplazoStatusLabel(normalizedAplazoStatus)
    : paymentStatus || "Pendiente";
  const paymentDescription = normalizedAplazoStatus
    ? getAplazoStatusDescription(normalizedAplazoStatus)
    : "Hemos recibido tu pedido y estamos validando el estado final del pago.";

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const [order, payment] = await Promise.all([
          ordersApi.getById(orderId),
          paymentId
            ? paymentsApi.getById(paymentId)
            : paymentAttemptId
              ? paymentsApi.getAplazoPaymentStatus(paymentAttemptId)
              : paymentsApi.getByOrden(orderId),
        ]);

        setOrder(order);
        if (order?.estado) {
          setOrderStatus(order.estado);
        }
        if (typeof order?.total === "number" && Number.isFinite(order.total)) {
          setTotal(order.total.toFixed(2));
        }
        if (payment?.status) {
          setPaymentStatus(payment.status);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [orderId, paymentAttemptId, paymentId]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8 text-center">
      <Card className="w-full max-w-lg rounded-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-success/30 bg-success/15">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <CardTitle className="pt-4 text-center font-headline text-3xl font-bold">
            {isPaid ? "¡Gracias por tu compra!" : "Estamos validando tu pedido"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-text-secondary">
            {isPaid ? "Tu pedido quedó registrado correctamente." : paymentDescription}
          </p>

          <div>
            <p className="font-semibold">Número de pedido:</p>
            <p className="font-mono text-lg text-primary">{orderId || "N/D"}</p>
          </div>

          <div className="grid gap-1 text-left text-sm">
            <p>
              <span className="font-medium">Estado de orden:</span>{" "}
              {isLoading ? "Consultando..." : orderStatus || "Pendiente"}
            </p>
            <p>
              <span className="font-medium">Estado de pago:</span>{" "}
              {isLoading ? "Consultando..." : paymentLabel}
            </p>
            <p>
              <span className="font-medium">Total:</span> ${total || "0.00"}
            </p>
          </div>

          {isPickup ? (
            <div className="rounded-md border bg-muted/40 px-4 py-3 text-left text-sm">
              <p className="font-semibold">Recoger en tienda</p>
              {order.pickupLocation ? (
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
              {order.fulfillmentStatus ? (
                <p className="mt-2">
                  <span className="font-medium">Estado pickup:</span>{" "}
                  {order.fulfillmentStatus}
                </p>
              ) : null}
              {order.pickupInstructions ? (
                <p className="mt-2 text-text-secondary">
                  {order.pickupInstructions}
                </p>
              ) : null}
              {order.pickupCodeLast4 ? (
                <p className="mt-2">
                  <span className="font-medium">Código termina en:</span>{" "}
                  {order.pickupCodeLast4}
                </p>
              ) : null}
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
