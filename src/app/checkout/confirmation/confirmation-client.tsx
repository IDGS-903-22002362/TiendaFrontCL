"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ordersApi } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import {
  clearCheckoutIdempotencyKey,
  clearPendingCheckoutAttemptId,
  getCheckoutAttemptStatus,
  reconcilePendingCheckoutAttempts,
} from "@/lib/api/checkout-attempt";
import { clearCheckoutDraft } from "@/lib/checkout-draft";
import { getPickupCodeFromOrder } from "@/lib/orders/pickup-code";
import { useCart } from "@/hooks/use-cart";
import type { Orden } from "@/lib/types";

const PAID_STATUSES = new Set([
  "paid",
  "succeeded",
  "completado",
  "completed",
  "pagado",
]);
const FAILED_STATUSES = new Set([
  "fallido",
  "failed",
  "canceled",
  "cancelled",
  "cancelado",
  "expired",
]);
const INITIAL_POLL_MS = 3000;
const MAX_POLL_MS = 10000;
const MAX_POLL_ATTEMPTS = 24;

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function formatCurrency(value: string | number) {
  const amount = Number(value);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatOrderRef(orderId?: string) {
  if (!orderId) return null;
  const compact = orderId.replace(/[^a-zA-Z0-9]/g, "");
  if (compact.length <= 8) return compact.toUpperCase();
  return compact.slice(-8).toUpperCase();
}

function getPaymentLabel(status: string): string {
  const normalized = normalizeStatus(status);
  if (PAID_STATUSES.has(normalized)) return "Confirmado";
  if (!normalized) return "En verificación";
  switch (normalized) {
    case "pendiente":
    case "pending":
      return "Pendiente";
    case "procesando":
    case "processing":
    case "open":
      return "Procesando";
    case "fallido":
    case "failed":
      return "No completado";
    case "cancelado":
    case "canceled":
    case "cancelled":
      return "Cancelado";
    case "reembolsado":
    case "refunded":
      return "Reembolsado";
    default:
      return "En verificación";
  }
}

function isBackendPaid(order: Orden | null, paymentStatus: string): boolean {
  if (PAID_STATUSES.has(normalizeStatus(paymentStatus))) return true;
  const orderPayment = String(order?.paymentStatus || "").trim().toUpperCase();
  return orderPayment === "PAGADO";
}

function isStripePaid(sessionPaymentStatus?: string | null): boolean {
  return PAID_STATUSES.has(normalizeStatus(sessionPaymentStatus));
}

function isPaymentFailed(paymentStatus: string, sessionStatus?: string | null) {
  return (
    FAILED_STATUSES.has(normalizeStatus(paymentStatus)) ||
    FAILED_STATUSES.has(normalizeStatus(sessionStatus))
  );
}

type VerificationState =
  | "checking"
  | "confirming"
  | "paid"
  | "delayed"
  | "failed";

export function ConfirmationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearAllItems } = useCart();
  const attemptId = searchParams.get("attemptId") || "";
  const orderId = searchParams.get("ordenId") || "";
  const paymentId = searchParams.get("pagoId") || "";
  const sessionId =
    searchParams.get("session_id") || searchParams.get("sessionId") || "";
  const fallbackTotal = searchParams.get("total") || "";

  const [resolvedOrderId, setResolvedOrderId] = useState(orderId);
  const [attemptStatus, setAttemptStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [sessionPaymentStatus, setSessionPaymentStatus] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [total, setTotal] = useState(fallbackTotal);
  const [order, setOrder] = useState<Orden | null>(null);
  const [verificationState, setVerificationState] =
    useState<VerificationState>(
      attemptId || orderId ? "checking" : "confirming",
    );
  const reconcileStartedRef = useRef(false);

  useEffect(() => {
    if (!attemptId && !sessionId && !orderId) {
      router.replace("/checkout");
    }
  }, [attemptId, sessionId, orderId, router]);

  useEffect(() => {
    if (!attemptId || reconcileStartedRef.current) {
      return;
    }
    reconcileStartedRef.current = true;
    void reconcilePendingCheckoutAttempts().catch(() => undefined);
  }, [attemptId]);

  const checkStatus = useCallback(async () => {
    if (!attemptId && !resolvedOrderId && !sessionId) {
      setVerificationState("confirming");
      return false;
    }

    let activeOrderId = resolvedOrderId;
    let activePaymentId = paymentId;
    let currentAttemptStatus = attemptStatus;

    const checkoutSession = sessionId
      ? await paymentsApi.getCheckoutSession(sessionId)
      : null;
    const nextSessionPaymentStatus = checkoutSession?.paymentStatus || "";
    const nextSessionStatus = checkoutSession?.status || "";
    setSessionPaymentStatus(nextSessionPaymentStatus);
    setSessionStatus(nextSessionStatus);

    if (attemptId) {
      const attempt = await getCheckoutAttemptStatus(attemptId);
      currentAttemptStatus = attempt.status;
      setAttemptStatus(attempt.status);
      if (attempt.orderId) {
        activeOrderId = attempt.orderId;
        setResolvedOrderId(attempt.orderId);
      }
      if (attempt.pagoId) {
        activePaymentId = attempt.pagoId;
      }
      if (
        typeof attempt.total === "number" &&
        Number.isFinite(attempt.total) &&
        attempt.total > 0
      ) {
        setTotal(attempt.total.toFixed(2));
      }

      if (
        attempt.status === "failed" ||
        attempt.status === "canceled" ||
        attempt.status === "expired"
      ) {
        setVerificationState("failed");
        return true;
      }
    }

    const attemptIndicatesPaid =
      currentAttemptStatus === "finalized" || currentAttemptStatus === "paid";

    if (!activeOrderId && !attemptIndicatesPaid) {
      if (isStripePaid(nextSessionPaymentStatus)) {
        setVerificationState("confirming");
        return false;
      }
      setVerificationState("confirming");
      return false;
    }

    const [nextOrder, payment] = await Promise.all([
      activeOrderId ? ordersApi.getById(activeOrderId) : Promise.resolve(null),
      activePaymentId
        ? paymentsApi.getById(activePaymentId)
        : activeOrderId
          ? paymentsApi.getByOrden(activeOrderId)
          : Promise.resolve(null),
    ]);

    if (nextOrder) {
      setOrder(nextOrder);
      if (
        typeof nextOrder.total === "number" &&
        Number.isFinite(nextOrder.total)
      ) {
        setTotal(nextOrder.total.toFixed(2));
      }
    }

    const nextPaymentStatus =
      payment?.status || String(nextOrder?.paymentStatus || "") || "";

    setPaymentStatus(nextPaymentStatus);

    if (
      isBackendPaid(nextOrder, nextPaymentStatus) ||
      attemptIndicatesPaid
    ) {
      setVerificationState("paid");
      return true;
    }

    if (isStripePaid(nextSessionPaymentStatus)) {
      setVerificationState("confirming");
      return false;
    }

    if (isPaymentFailed(nextPaymentStatus, nextSessionStatus)) {
      setVerificationState("failed");
      return true;
    }

    setVerificationState("checking");
    return false;
  }, [attemptId, resolvedOrderId, paymentId, sessionId, attemptStatus]);

  useEffect(() => {
    let cancelled = false;
    let currentAttempt = 0;

    const poll = async () => {
      currentAttempt += 1;

      try {
        const done = await checkStatus();
        if (cancelled || done) return;
      } catch {
        if (cancelled) return;
      }

      if (currentAttempt >= MAX_POLL_ATTEMPTS) {
        setVerificationState((prev) =>
          prev === "checking" || prev === "confirming" ? "delayed" : prev,
        );
        return;
      }

      const delay = Math.min(
        INITIAL_POLL_MS + (currentAttempt - 1) * 1500,
        MAX_POLL_MS,
      );
      window.setTimeout(() => {
        void poll();
      }, delay);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [checkStatus]);

  const cartClearedRef = useRef(false);

  useEffect(() => {
    if (verificationState !== "paid" || cartClearedRef.current) {
      return;
    }

    cartClearedRef.current = true;
    clearCheckoutIdempotencyKey();
    clearCheckoutDraft();
    clearPendingCheckoutAttemptId();
    void clearAllItems();
  }, [verificationState, clearAllItems]);

  const isPickup = order?.fulfillmentMethod === "PICKUP";
  const pickupCode =
    isPickup && order ? getPickupCodeFromOrder(order) : null;
  const isPaid = verificationState === "paid";
  const isConfirming =
    verificationState === "confirming" || verificationState === "checking";
  const isDelayed = verificationState === "delayed";
  const isFailed = verificationState === "failed";
  const orderRef = formatOrderRef(resolvedOrderId);
  const paymentLabel = getPaymentLabel(
    paymentStatus || sessionPaymentStatus || searchParams.get("status") || "",
  );
  const deliveryTitle = isPickup ? "Recoger en tienda" : "Envío a domicilio";
  const DeliveryIcon = isPickup ? Store : Truck;

  const title = isPaid
    ? "¡Gracias por tu compra!"
    : isFailed
      ? "No pudimos completar el pago"
      : isDelayed
        ? "Tu pago está en proceso"
        : "Estamos confirmando tu pago";

  const description = isPaid
    ? isPickup
      ? "Tu pago fue recibido. Estamos preparando tu pedido para que lo recojas en tienda."
      : "Tu pago fue recibido. Estamos preparando tu pedido y te avisaremos cuando avance el envío."
    : isFailed
      ? "El pago no se completó. Puedes volver al carrito e intentarlo de nuevo."
      : isDelayed
        ? "Si ya viste el cargo en tu banco, tu pedido se actualizará pronto. Revisa Mis pedidos en unos minutos; no vuelvas a pagar."
        : "Esto suele tardar unos segundos. No vuelvas a pagar si ya viste el cargo en tu banco.";

  const statusMessage = isPaid
    ? "Tu pedido ya está confirmado"
    : isFailed
      ? "El pago no se completó"
      : isDelayed
        ? "Seguimos procesando tu pago"
        : "Confirmando tu compra";

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,rgba(8,104,72,0.16),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted))/0.55)] px-4 py-6 md:py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="relative border-b border-border bg-primary px-5 py-6 text-primary-foreground md:px-8 md:py-8">
            <div className="absolute right-5 top-5 rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
              Club León
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12">
                {isPaid ? (
                  <CheckCircle2 className="h-9 w-9" />
                ) : isFailed ? (
                  <AlertCircle className="h-9 w-9" />
                ) : (
                  <Loader2 className="h-9 w-9 animate-spin" />
                )}
              </div>
              <div className="min-w-0 pr-20">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                  Confirmación de compra
                </p>
                <h1
                  className="mt-2 font-headline text-3xl font-bold leading-tight md:text-5xl"
                  aria-live="polite"
                >
                  {title}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/82">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3 md:p-8">
            <div className="rounded-2xl border border-border bg-muted/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Número de pedido
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {isPaid && orderRef
                  ? `#${orderRef}`
                  : isConfirming
                    ? "Generando..."
                    : "Pendiente"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Estado del pago
              </p>
              <div className="mt-2">
                <Badge
                  variant={
                    isPaid ? "default" : isFailed ? "destructive" : "secondary"
                  }
                >
                  {paymentLabel}
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Total pagado
              </p>
              <p className="mt-1 font-headline text-2xl font-bold text-secondary">
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          {isPaid && isPickup && pickupCode ? (
            <div className="mx-5 mb-5 rounded-2xl border border-primary/25 bg-primary/5 p-5 md:mx-8 md:mb-8 md:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Código para recoger en tienda
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-[0.2em] text-foreground">
                {pickupCode}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Guarda este código. Lo necesitarás en tienda para recibir tu
                pedido. También lo encontrarás en Mis pedidos.
              </p>
            </div>
          ) : null}

          <div className="px-5 pb-5 md:px-8 md:pb-8">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Pago seguro</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Procesamos tu pago de forma segura antes de preparar el
                  pedido.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <PackageCheck className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Preparación</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {isPaid
                    ? "Tu pedido ya está en preparación."
                    : "Iniciará en cuanto confirmemos tu pago."}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <DeliveryIcon className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">{deliveryTitle}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {isPickup
                    ? "Te avisaremos cuando esté listo para recoger."
                    : "Te notificaremos cuando tu pedido salga hacia envío."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {isPaid || isDelayed ? (
                <Button asChild className="h-12 flex-1 rounded-full" size="lg">
                  <Link href="/order-history">Ver mis pedidos</Link>
                </Button>
              ) : null}
              {!isPaid ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1 rounded-full"
                  size="lg"
                  onClick={() => void checkStatus()}
                  disabled={isConfirming && !isDelayed}
                >
                  {isConfirming ? "Actualizando..." : "Actualizar estado"}
                </Button>
              ) : null}
              <Button
                asChild
                variant="ghost"
                className="h-12 flex-1 rounded-full"
                size="lg"
              >
                <Link href="/products">Seguir comprando</Link>
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <Card className="rounded-[2rem] border-border bg-card/95 shadow-[var(--shadow-card)]">
            <CardContent className="p-5 md:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Resumen
              </p>
              <h2 className="mt-2 font-headline text-2xl font-bold">
                {statusMessage}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {isPaid
                  ? "Guardamos tu compra y puedes consultarla en cualquier momento desde Mis pedidos."
                  : isDelayed
                    ? "A veces el banco tarda un poco en confirmar el cargo. Tu pedido aparecerá en Mis pedidos en cuanto esté listo."
                    : "Estamos validando tu pago para asegurar que todo quede correcto."}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border bg-card/95 shadow-[var(--shadow-card)]">
            <CardContent className="p-5 text-sm leading-6 text-muted-foreground md:p-6">
              <p className="font-semibold text-foreground">Qué sigue</p>
              <ol className="mt-4 space-y-3">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  Recibimos tu pago de forma segura.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </span>
                  Preparamos tu pedido en tienda.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </span>
                  {isPickup
                    ? "Te avisamos cuando puedas recogerlo."
                    : "Te notificamos cuando avance el envío."}
                </li>
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
