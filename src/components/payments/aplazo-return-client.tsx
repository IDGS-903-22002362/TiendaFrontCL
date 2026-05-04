"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Clock3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { addCartItem, fetchCart, getOrCreateSessionId } from "@/lib/api/cart";
import { ordersApi } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import {
  getAplazoPaymentErrorMessage,
  getApiErrorMessage,
} from "@/lib/api/errors";
import {
  buildAplazoReturnUrls,
  clearStoredAplazoCheckoutState,
  clearStoredAplazoRetryPayload,
  getAplazoStatusDescription,
  getAplazoStatusLabel,
  isAplazoRetryableStatus,
  normalizeAplazoStatus,
  readStoredAplazoCheckoutState,
  readStoredAplazoRetryPayload,
  writeStoredAplazoCheckoutState,
} from "@/lib/aplazo";
import { formatCurrency } from "@/lib/storefront";
import type {
  AplazoPaymentStatusResponse,
  AplazoReturnKind,
  AplazoReturnResponse,
  Orden,
} from "@/lib/types";

type AplazoReturnClientProps = {
  returnKind: AplazoReturnKind;
};

function getStatusVariant(status?: string) {
  if (normalizeAplazoStatus(status) === "PAID") {
    return "default";
  }
  if (isAplazoRetryableStatus(status)) {
    return "destructive";
  }
  return "secondary";
}

function getStatusIcon(status?: string) {
  if (normalizeAplazoStatus(status) === "PAID") {
    return CheckCircle;
  }
  if (isAplazoRetryableStatus(status)) {
    return AlertCircle;
  }
  return Clock3;
}

export function AplazoReturnClient({
  returnKind,
}: AplazoReturnClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearAllItems } = useCart();
  const { token } = useAuth();
  const { toast } = useToast();
  const redirectRef = useRef(false);
  const [order, setOrder] = useState<Orden | null>(null);
  const [paymentAttemptId, setPaymentAttemptId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [paymentStatus, setPaymentStatus] =
    useState<AplazoPaymentStatusResponse | null>(null);
  const [returnPayload, setReturnPayload] = useState<AplazoReturnResponse | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRestoringCart, setIsRestoringCart] = useState(false);
  const [cartRestored, setCartRestored] = useState(false);

  const paymentAttemptIdParam = searchParams.get("paymentAttemptId") || "";
  const orderIdParam = searchParams.get("ordenId") || "";
  const providerPaymentIdParam = searchParams.get("providerPaymentId") || "";
  const providerReferenceParam = searchParams.get("providerReference") || "";

  useEffect(() => {
    let isCancelled = false;

    const resolveReturn = async () => {
      const storedState = readStoredAplazoCheckoutState();
      const nextOrderId = orderIdParam || storedState?.orderId || "";
      const fallbackAttemptId =
        paymentAttemptIdParam || storedState?.paymentAttemptId || "";
      const shouldResolveFromBackend = Boolean(
        paymentAttemptIdParam ||
          providerPaymentIdParam ||
          providerReferenceParam,
      );

      setOrderId(nextOrderId);

      try {
        let resolvedReturn: AplazoReturnResponse | null = null;

        if (shouldResolveFromBackend) {
          resolvedReturn = await paymentsApi.getAplazoReturnPayload(returnKind, {
            paymentAttemptId: paymentAttemptIdParam || undefined,
            providerPaymentId: providerPaymentIdParam || undefined,
            providerReference: providerReferenceParam || undefined,
          });
        }

        if (isCancelled) {
          return;
        }

        const nextPaymentAttemptId =
          resolvedReturn?.paymentAttemptId || fallbackAttemptId;

        setReturnPayload(resolvedReturn);
        setPaymentAttemptId(nextPaymentAttemptId);

        if (storedState) {
          writeStoredAplazoCheckoutState({
            ...storedState,
            paymentAttemptId: nextPaymentAttemptId || storedState.paymentAttemptId,
            orderId: nextOrderId || storedState.orderId,
            lastKnownStatus:
              resolvedReturn?.status ?? storedState.lastKnownStatus,
            lastReturnPath: returnKind,
            updatedAt: new Date().toISOString(),
          });
        }

        if (!nextPaymentAttemptId && !resolvedReturn) {
          setErrorMessage(
            "No encontramos un intento de pago para validar. Puedes volver al checkout y generar uno nuevo.",
          );
          setIsLoading(false);
          return;
        }

        if (!nextPaymentAttemptId && resolvedReturn?.isTerminal) {
          setErrorMessage("");
          setIsLoading(false);
          return;
        }

        if (!nextPaymentAttemptId) {
          setErrorMessage(
            "No fue posible resolver el intento de pago. Vuelve al checkout para generar uno nuevo.",
          );
          setIsLoading(false);
          return;
        }

        setErrorMessage("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setPaymentAttemptId(fallbackAttemptId);
        setReturnPayload(null);
        setErrorMessage(getApiErrorMessage(error));

        if (!fallbackAttemptId) {
          setIsLoading(false);
        }
      }
    };

    void resolveReturn();

    return () => {
      isCancelled = true;
    };
  }, [
    orderIdParam,
    paymentAttemptIdParam,
    providerPaymentIdParam,
    providerReferenceParam,
    returnKind,
  ]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isCancelled = false;

    const loadOrder = async () => {
      try {
        const nextOrder = await ordersApi.getById(orderId);
        if (!isCancelled) {
          setOrder(nextOrder);
        }
      } catch {
        if (!isCancelled) {
          setOrder(null);
        }
      }
    };

    void loadOrder();

    return () => {
      isCancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!paymentAttemptId || redirectRef.current) {
      return;
    }

    let isCancelled = false;
    let timeoutId: number | undefined;

    const pollStatus = async () => {
      try {
        const nextStatus = await paymentsApi.getAplazoPaymentStatus(
          paymentAttemptId,
        );

        if (isCancelled) {
          return;
        }

        setPaymentStatus(nextStatus);
        setErrorMessage("");
        setIsLoading(false);

        const storedState = readStoredAplazoCheckoutState();
        if (storedState) {
          writeStoredAplazoCheckoutState({
            ...storedState,
            paymentAttemptId,
            orderId: orderId || storedState.orderId,
            cartSessionId: storedState.cartSessionId,
            cartSnapshot: storedState.cartSnapshot,
            expiresAt: nextStatus.expiresAt ?? storedState.expiresAt ?? null,
            lastKnownStatus: nextStatus.status,
            lastReturnPath: returnKind,
            updatedAt: new Date().toISOString(),
          });
        }

        if (nextStatus.status === "PAID") {
          redirectRef.current = true;
          clearStoredAplazoCheckoutState();
          clearStoredAplazoRetryPayload();
          await clearAllItems().catch(() => undefined);
          router.replace(
            `/checkout/confirmation?ordenId=${encodeURIComponent(orderId || order?.id || "")}&paymentAttemptId=${encodeURIComponent(paymentAttemptId)}&status=${encodeURIComponent(nextStatus.status)}`,
          );
          return;
        }

        if (!nextStatus.isTerminal) {
          timeoutId = window.setTimeout(
            () => void pollStatus(),
            nextStatus.nextPollAfterMs ?? 3000,
          );
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setErrorMessage(getApiErrorMessage(error));
        setIsLoading(false);
      }
    };

    void pollStatus();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [clearAllItems, order?.id, orderId, paymentAttemptId, returnKind, router]);

  const authToken = token && token !== "cookie-session" ? token : undefined;

  const handleRestoreCart = async () => {
    const storedState = readStoredAplazoCheckoutState();
    const snapshot = storedState?.cartSnapshot ?? [];
    const sessionId = storedState?.cartSessionId || getOrCreateSessionId();

    if (snapshot.length === 0) {
      setErrorMessage(
        "No encontramos un respaldo del carrito para restaurar. Puedes volver al checkout o agregar los productos nuevamente.",
      );
      return;
    }

    setIsRestoringCart(true);

    try {
      const remoteCart = await fetchCart(sessionId, authToken);
      if (remoteCart.items.length === 0) {
        for (const item of snapshot) {
          await addCartItem(
            sessionId,
            {
              id: item.productoId,
              quantity: item.cantidad,
              tallaId: item.tallaId,
            },
            authToken,
          );
        }
      }

      setCartRestored(true);
      toast({
        title: "Carrito restaurado",
        description: "Recuperamos tus productos para que puedas reintentar el checkout.",
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsRestoringCart(false);
    }
  };

  useEffect(() => {
    if (
      !paymentStatus ||
      cartRestored ||
      isRestoringCart ||
      !isAplazoRetryableStatus(paymentStatus.status)
    ) {
      return;
    }

    const storedState = readStoredAplazoCheckoutState();
    if (!storedState?.cartSnapshot?.length) {
      return;
    }

    const sessionId = storedState.cartSessionId || getOrCreateSessionId();

    let isCancelled = false;

    const restoreIfNeeded = async () => {
      try {
        const remoteCart = await fetchCart(sessionId, authToken);
        if (isCancelled || remoteCart.items.length > 0) {
          return;
        }

        setIsRestoringCart(true);

        for (const item of storedState.cartSnapshot ?? []) {
          await addCartItem(
            sessionId,
            {
              id: item.productoId,
              quantity: item.cantidad,
              tallaId: item.tallaId,
            },
            authToken,
          );
        }

        if (!isCancelled) {
          setCartRestored(true);
        }
      } catch {
        // La restauracion manual queda disponible en la UI si falla el intento automatico.
      } finally {
        if (!isCancelled) {
          setIsRestoringCart(false);
        }
      }
    };

    void restoreIfNeeded();

    return () => {
      isCancelled = true;
    };
  }, [authToken, cartRestored, isRestoringCart, paymentStatus]);

  const handleRetry = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedState = readStoredAplazoCheckoutState();
    const storedRetryPayload = readStoredAplazoRetryPayload();
    if (!storedState?.orderId || !storedRetryPayload) {
      router.push("/checkout");
      return;
    }

    setIsRetrying(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const createPayload = {
        ...storedRetryPayload,
        ...buildAplazoReturnUrls(window.location.origin),
      };

      writeStoredAplazoCheckoutState({
        ...storedState,
        paymentAttemptId: undefined,
        idempotencyKey,
        expiresAt: null,
        lastKnownStatus: undefined,
        lastReturnPath: returnKind,
        updatedAt: new Date().toISOString(),
      });

      const attempt = await paymentsApi.createAplazoOnlineAttempt(
        createPayload,
        idempotencyKey,
      );

      if (!attempt.paymentAttemptId) {
        throw new Error("No se recibió paymentAttemptId para reintentar el flujo");
      }

      writeStoredAplazoCheckoutState({
        ...storedState,
        paymentAttemptId: attempt.paymentAttemptId,
        idempotencyKey,
        expiresAt: attempt.expiresAt ?? null,
        lastKnownStatus: attempt.status,
        lastReturnPath: returnKind,
        updatedAt: new Date().toISOString(),
      });

      const targetUrl = attempt.url || attempt.redirectUrl || attempt.checkoutUrl;
      if (targetUrl) {
        window.location.assign(targetUrl);
        return;
      }

      setPaymentAttemptId(attempt.paymentAttemptId);
      setReturnPayload(null);
      setPaymentStatus(null);
      setErrorMessage("");
      setIsLoading(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo reintentar Aplazo",
        description: getAplazoPaymentErrorMessage(error, "online"),
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const displayStatus = paymentStatus?.status
    ? paymentStatus.status
    : returnPayload?.status
      ? returnPayload.status
    : returnKind === "failure"
      ? "FAILED"
      : returnKind === "cancel"
        ? "CANCELED"
        : "PENDING_CUSTOMER";

  const descriptionMessage = paymentStatus
    ? getAplazoStatusDescription(displayStatus, returnKind)
    : returnPayload?.message ||
      getAplazoStatusDescription(displayStatus, returnKind);

  const totalLabel = useMemo(() => {
    if (typeof order?.total === "number" && Number.isFinite(order.total)) {
      return formatCurrency(order.total);
    }
    if (typeof paymentStatus?.amount === "number" && Number.isFinite(paymentStatus.amount)) {
      return formatCurrency(paymentStatus.amount);
    }
    return formatCurrency(0);
  }, [order?.total, paymentStatus?.amount]);

  const StatusIcon = getStatusIcon(displayStatus);
  const isRetryable = isAplazoRetryableStatus(displayStatus);
  const isPending =
    displayStatus === "PENDING_PROVIDER" ||
    displayStatus === "PENDING_CUSTOMER";

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-8">
      <Card className="w-full max-w-2xl rounded-[2rem] border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="space-y-4 pb-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
            <StatusIcon className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <Badge variant={getStatusVariant(displayStatus)} className="mx-auto">
              {getAplazoStatusLabel(displayStatus)}
            </Badge>
            <CardTitle className="font-headline text-3xl uppercase tracking-[0.04em]">
              Validando pago con Aplazo
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-center text-sm leading-6 text-muted-foreground">
            {isPending && paymentStatus
              ? "Estamos confirmando tu pago con Aplazo..."
              : descriptionMessage}
          </p>

          <div className="grid gap-3 rounded-[1.4rem] border border-border bg-muted/35 p-4 text-sm text-muted-foreground md:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                Pedido
              </p>
              <p className="mt-1 font-medium text-foreground">{orderId || order?.id || "Pendiente"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                Intento
              </p>
              <p className="mt-1 break-all font-medium text-foreground">
                {paymentAttemptId || "Pendiente"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                Estado backend
              </p>
              <p className="mt-1 font-medium text-foreground">
                {paymentStatus?.providerStatus || getAplazoStatusLabel(displayStatus)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                Total
              </p>
              <p className="mt-1 font-medium text-foreground">{totalLabel}</p>
            </div>
          </div>

          {paymentStatus?.expiresAt ? (
            <p className="text-sm text-muted-foreground">
              Expira: {new Date(paymentStatus.expiresAt).toLocaleString()}
            </p>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[1.3rem] border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-[1.3rem] border border-border bg-muted/35 px-4 py-4 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Estamos confirmando tu pago con Aplazo...
            </div>
          ) : null}

          {isRestoringCart ? (
            <div className="flex items-center justify-center gap-2 rounded-[1.3rem] border border-border bg-muted/35 px-4 py-4 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Restaurando carrito...
            </div>
          ) : null}

          {cartRestored ? (
            <div className="rounded-[1.3rem] border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-primary">
              Recuperamos tu carrito para que puedas retomar la compra.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            {isRetryable ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => void handleRetry()}
                disabled={isRetrying}
              >
                {isRetrying ? "Reintentando..." : "Reintentar Aplazo"}
              </Button>
            ) : null}
            {isRetryable ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleRestoreCart()}
                disabled={isRestoringCart}
              >
                {isRestoringCart ? "Restaurando..." : "Restaurar carrito"}
              </Button>
            ) : null}
            <Button asChild variant={isRetryable ? "outline" : "default"} className="w-full">
              <Link href="/checkout">Volver al checkout</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/cart">Ir al carrito</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
