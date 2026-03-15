"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ordersApi } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";

export function ConfirmationClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("ordenId") || "";
  const paymentId = searchParams.get("pagoId") || "";
  const fallbackStatus = searchParams.get("status") || "";
  const fallbackTotal = searchParams.get("total") || "";

  const [orderStatus, setOrderStatus] = useState(fallbackStatus);
  const [paymentStatus, setPaymentStatus] = useState(fallbackStatus);
  const [total, setTotal] = useState(fallbackTotal);
  const [isLoading, setIsLoading] = useState(Boolean(orderId));

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
            : paymentsApi.getByOrden(orderId),
        ]);

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
  }, [orderId, paymentId]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8 text-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-success/30 bg-success/15">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <CardTitle className="pt-4 text-center font-headline text-3xl font-bold">
            ¡Gracias por tu compra!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-text-secondary">
            Hemos recibido tu pedido y estamos validando el estado final del
            pago.
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
              {isLoading ? "Consultando..." : paymentStatus || "Pendiente"}
            </p>
            <p>
              <span className="font-medium">Total:</span> ${total || "0.00"}
            </p>
          </div>

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
