"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
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
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 8; // ~24s, then show a stable pending state

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

function getPaymentLabel(status: string): string {
  const normalized = normalizeStatus(status);
  if (PAID_STATUSES.has(normalized)) return "Pago confirmado";
  if (!normalized) return "Pendiente de verificación";
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
  | "paid"
  | "syncing"
  | "pending"
  | "failed";

export function ConfirmationClient() {
  const searchParams = useSearchParams();
  const { reloadCart } = useCart();
  const orderId = searchParams.get("ordenId") || "";
  const paymentId = searchParams.get("pagoId") || "";
  const sessionId =
    searchParams.get("session_id") || searchParams.get("sessionId") || "";
  const fallbackTotal = searchParams.get("total") || "";

  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [sessionPaymentStatus, setSessionPaymentStatus] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [total, setTotal] = useState(fallbackTotal);
  const [order, setOrder] = useState<Orden | null>(null);
  const [verificationState, setVerificationState] =
    useState<VerificationState>(orderId ? "checking" : "pending");
  const [attempts, setAttempts] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stripePaidRef = useRef(false);

  const checkStatus = useCallback(async () => {
    if (!orderId) {
      setVerificationState("pending");
      return false;
    }

    const [nextOrder, payment, checkoutSession] = await Promise.all([
      ordersApi.getById(orderId),
      paymentId ? paymentsApi.getById(paymentId) : paymentsApi.getByOrden(orderId),
      sessionId ? paymentsApi.getCheckoutSession(sessionId) : Promise.resolve(null),
    ]);

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
      payment?.status || String(nextOrder?.paymentStatus || "") || "";
    const nextSessionPaymentStatus = checkoutSession?.paymentStatus || "";
    const nextSessionStatus = checkoutSession?.status || "";

    setPaymentStatus(nextPaymentStatus);
    setSessionPaymentStatus(nextSessionPaymentStatus);
    setSessionStatus(nextSessionStatus);
    setLastCheckedAt(new Date());

    if (isBackendPaid(nextOrder, nextPaymentStatus)) {
      setVerificationState("paid");
      return true;
    }

    if (isStripePaid(nextSessionPaymentStatus)) {
      stripePaidRef.current = true;
      setVerificationState("syncing");
      return false;
    }

    if (isPaymentFailed(nextPaymentStatus, nextSessionStatus)) {
      setVerificationState("failed");
      return true;
    }

    setVerificationState("checking");
    return false;
  }, [orderId, paymentId, sessionId]);

  useEffect(() => {
    let cancelled = false;
    let currentAttempt = 0;

    const poll = async () => {
      currentAttempt += 1;
      setAttempts(currentAttempt);

      try {
        const done = await checkStatus();
        if (cancelled || done) return;
      } catch {
        if (cancelled) return;
      }

      if (currentAttempt >= MAX_POLL_ATTEMPTS) {
        setVerificationState(stripePaidRef.current ? "syncing" : "pending");
        return;
      }

      timerRef.current = setTimeout(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkStatus]);

  const cartReloadedRef = useRef(false);

  useEffect(() => {
    if (verificationState !== "paid" || cartReloadedRef.current) {
      return;
    }

    cartReloadedRef.current = true;
    void reloadCart();
  }, [verificationState, reloadCart]);

  const isPickup = order?.fulfillmentMethod === "PICKUP";
  const isPaid = verificationState === "paid";
  const isSyncing = verificationState === "syncing";
  const isFailed = verificationState === "failed";
  const isChecking = verificationState === "checking";
  const paymentLabel = getPaymentLabel(
    sessionPaymentStatus || paymentStatus || searchParams.get("status") || "",
  );
  const deliveryTitle = isPickup ? "Recoger en tienda" : "Envío a domicilio";
  const DeliveryIcon = isPickup ? Store : Truck;

  const title = isPaid
    ? "Pago confirmado"
    : isSyncing
      ? "Pago recibido, sincronizando pedido"
    : isFailed
      ? "No pudimos confirmar el pago"
      : isChecking
        ? "Estamos verificando tu pago"
        : "Pago en verificación";

  const description = isPaid
    ? isPickup
      ? "Tu pedido quedó pagado y entra a preparación para recoger en tienda."
      : "Tu pedido quedó pagado y entra a preparación. La guía aparecerá cuando sea entregado a FedEx."
    : isSyncing
      ? "Stripe ya marcó el pago como recibido. Estamos esperando que el webhook actualice la orden en el sistema antes de pasarla a preparación."
    : isFailed
      ? "Stripe no confirmó este intento de pago. Puedes volver a intentarlo desde tu pedido."
      : "Estamos esperando la confirmación segura de Stripe. Si tarda, puedes revisar de nuevo en unos segundos; no generes otro pago si ya viste el cargo.";

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
                <h1 className="mt-2 font-headline text-3xl font-bold leading-tight md:text-5xl">
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
                Pedido
              </p>
              <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">
                {orderId || "N/D"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Pago
              </p>
              <div className="mt-2">
                <Badge
                  variant={isPaid ? "default" : isFailed ? "destructive" : "secondary"}
                >
                  {paymentLabel}
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Total
              </p>
              <p className="mt-1 font-headline text-2xl font-bold text-secondary">
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          <div className="px-5 pb-5 md:px-8 md:pb-8">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Pago seguro</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Se confirma con Stripe y webhook antes de preparar el pedido.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <PackageCheck className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Preparación</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {isPaid
                    ? "El pedido pasa a preparación."
                    : "Inicia cuando el pago quede confirmado."}
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
                    : "La guía se captura manualmente al entregar a FedEx."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 flex-1 rounded-full" size="lg">
                <Link href="/order-history">Ver mis pedidos</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-full"
                size="lg"
                onClick={() => void checkStatus()}
                disabled={isChecking}
              >
                {isChecking ? "Consultando..." : "Actualizar estado"}
              </Button>
              <Button asChild variant="ghost" className="h-12 flex-1 rounded-full" size="lg">
                <Link href="/products">Seguir comprando</Link>
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <Card className="rounded-[2rem] border-border bg-card/95 shadow-[var(--shadow-card)]">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Estado actual
                  </p>
                  <h2 className="mt-2 font-headline text-2xl font-bold">
                  {isPaid
                      ? "Listo para preparar"
                    : isSyncing
                      ? "Sincronizando pago"
                      : isFailed
                        ? "Requiere atención"
                        : "Verificación en curso"}
                  </h2>
                </div>
                <Clock3 className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Orden</span>
                  <span className="font-medium">{orderStatus || "PENDIENTE"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Pago backend</span>
                  <span className="font-medium">
                    {getPaymentLabel(paymentStatus || "PENDIENTE")}
                  </span>
                </div>
                {sessionId ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Stripe</span>
                    <span className="font-medium">
                      {sessionPaymentStatus || sessionStatus || "Consultando"}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Intentos</span>
                  <span className="font-medium">
                    {Math.min(attempts, MAX_POLL_ATTEMPTS)}/{MAX_POLL_ATTEMPTS}
                  </span>
                </div>
                {lastCheckedAt ? (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Última consulta:{" "}
                    {lastCheckedAt.toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border bg-card/95 shadow-[var(--shadow-card)]">
            <CardContent className="p-5 text-sm leading-6 text-muted-foreground md:p-6">
              <p className="font-semibold text-foreground">Qué pasa después</p>
              <ol className="mt-4 space-y-3">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  Stripe confirma el pago de forma segura.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </span>
                  El pedido queda en preparación.
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </span>
                  {isPickup
                    ? "Te avisaremos cuando puedas recogerlo."
                    : "La tienda captura la guía cuando se entrega a FedEx."}
                </li>
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
