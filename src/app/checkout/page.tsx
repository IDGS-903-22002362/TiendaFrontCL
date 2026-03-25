"use client";

import Image from "next/image";
import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { ArrowLeft, CreditCard, Home, ShieldCheck } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useStorefront } from "@/hooks/use-storefront";
import { checkoutCart } from "@/lib/api/cart";
import { paymentsApi } from "@/lib/api/payments";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useToast } from "@/hooks/use-toast";
import { useStripeConfig } from "@/hooks/use-stripe-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";
import { formatCurrency } from "@/lib/storefront";
import { getCartVariantKey } from "@/lib/api/cart";

const shippingSchema = z.object({
  name: z.string().min(2, "Nombre es requerido"),
  telefono: z.string().min(10, "Teléfono a 10 dígitos requerido"),
  calle: z.string().min(2, "Calle es requerida"),
  numero: z.string().min(1, "Número es requerido"),
  colonia: z.string().min(2, "Colonia es requerida"),
  city: z.string().min(2, "Ciudad es requerida"),
  estado: z.string().min(2, "Estado es requerido"),
  zip: z.string().min(4, "Código postal inválido"),
  email: z.string().email("Email inválido"),
});

type ShippingValues = z.infer<typeof shippingSchema>;

function getOrderIdFromCheckoutResult(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const maybeData =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;
  const nestedOrder =
    maybeData.orden && typeof maybeData.orden === "object"
      ? (maybeData.orden as Record<string, unknown>)
      : {};
  const orderId =
    maybeData.ordenId ?? maybeData.id ?? maybeData.orderId ?? nestedOrder._id;

  return typeof orderId === "string" ? orderId : "";
}

function MobileCheckoutActions({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-[rgb(251_249_243_/_0.96)] py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl md:hidden">
      <div className="container flex items-center gap-3">{children}</div>
    </div>
  );
}

function OrderSummaryPanel() {
  const { state, subtotal, totalItems } = useCart();
  const { getPersonalization } = useStorefront();

  return (
    <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
      <CardHeader className="pb-4">
        <CardTitle>Resumen del pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {state.items.map((item) => {
            const variantKey = getCartVariantKey(item);
            const personalization = getPersonalization(variantKey);

            return (
              <div key={variantKey} className="flex gap-3 rounded-[1.25rem] border border-border bg-muted/45 p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] border border-border bg-card">
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.price)}
                    {item.tallaId || item.size ? ` · ${item.tallaId ?? item.size}` : ""}
                  </p>
                  {personalization ? (
                    <p className="mt-1 text-xs text-primary/78">
                      Personalización UI: {personalization.name} · {personalization.number}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Envío</span>
            <span>{formatCurrency(99)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Artículos</span>
            <span>{totalItems}</span>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-border bg-muted/45 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
            Total
          </p>
          <p className="mt-2 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.03em]">
            {formatCurrency(subtotal + 99)}
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-border bg-muted/45 px-4 py-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">
              La personalización de jersey se muestra en la UI y no modifica el total backend en esta versión.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentStep({
  values,
  total,
  onBack,
}: {
  values: ShippingValues;
  total: number;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { toast } = useToast();
  const { clearAllItems } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) {
      toast({
        variant: "destructive",
        title: "Stripe no está listo",
        description: "Intenta nuevamente en unos segundos.",
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast({
        variant: "destructive",
        title: "No se detectó la tarjeta",
        description: "Verifica el formulario de pago.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const checkoutResult = await checkoutCart({
        direccionEnvio: {
          nombre: values.name,
          calle: values.calle,
          numero: values.numero,
          colonia: values.colonia,
          ciudad: values.city,
          estado: values.estado,
          codigoPostal: values.zip,
          telefono: values.telefono,
        },
        metodoPago: "TARJETA",
        costoEnvio: 99,
      });

      const ordenId = getOrderIdFromCheckoutResult(checkoutResult);
      if (!ordenId) {
        throw new Error("No se recibió un ID de orden válido");
      }

      const idempotencyKey = crypto.randomUUID();
      const paymentInit = await paymentsApi.iniciar(
        { ordenId, metodoPago: "TARJETA" },
        idempotencyKey,
      );

      if (!paymentInit.clientSecret) {
        throw new Error("No se recibió clientSecret para confirmar el pago");
      }

      const confirmation = await stripe.confirmCardPayment(paymentInit.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: values.name,
            email: values.email,
            address: {
              city: values.city,
              state: values.estado,
              line1: `${values.calle} ${values.numero}`,
              line2: values.colonia,
              postal_code: values.zip,
            },
          },
        },
      });

      if (confirmation.error) {
        throw new Error(
          confirmation.error.message || "No se pudo confirmar el pago",
        );
      }

      await clearAllItems();

      const status = confirmation.paymentIntent?.status || paymentInit.status;
      router.push(
        `/checkout/confirmation?ordenId=${encodeURIComponent(ordenId)}&pagoId=${encodeURIComponent(paymentInit.pagoId)}&status=${encodeURIComponent(status)}&total=${encodeURIComponent(total.toFixed(2))}`,
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo completar el pago",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="pb-4">
          <CardTitle>Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-[1.5rem] border border-border bg-muted/45 p-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#171815",
                    iconColor: "#0f6c49",
                    "::placeholder": { color: "#817b71" },
                  },
                  invalid: {
                    color: "#dc2626",
                    iconColor: "#dc2626",
                  },
                },
              }}
            />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            El pago se procesa con Stripe. El total a cobrar es {formatCurrency(total)}.
          </p>
          <div className="hidden gap-3 md:flex">
            <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={onBack}>
              Volver
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-full"
              onClick={() => void handlePay()}
              disabled={isProcessing || !stripe}
            >
              {isProcessing ? "Procesando..." : "Pagar ahora"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <MobileCheckoutActions>
        <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={onBack}>
          Volver
        </Button>
        <Button
          type="button"
          className="h-12 flex-1 rounded-full"
          onClick={() => void handlePay()}
          disabled={isProcessing || !stripe}
        >
          {isProcessing ? "Procesando..." : "Pagar ahora"}
        </Button>
      </MobileCheckoutActions>
    </>
  );
}

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { subtotal, totalItems, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const stripePromise = useStripeConfig();
  const { toast } = useToast();

  const shippingForm = useForm<ShippingValues>({
    resolver: zodResolver(shippingSchema),
  });

  const total = useMemo(() => subtotal + 99, [subtotal]);

  const onContinueToPayment = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Sesión requerida",
        description: "Debes iniciar sesión para completar checkout.",
      });
      return;
    }

    const isValid = await shippingForm.trigger();
    if (isValid) {
      setCurrentStep(1);
    }
  };

  if (isLoading) {
    return <div className="container py-14 text-center text-muted-foreground">Cargando checkout...</div>;
  }

  if (totalItems === 0) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Carrito vacío"
          description="Necesitas al menos un producto antes de continuar a checkout."
          ctaLabel="Ir al catálogo"
        />
      </div>
    );
  }

  return (
    <div className="container py-5 md:py-8">
      <div className="mb-6 space-y-3">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Carrito", href: "/cart" },
            { label: "Checkout" },
          ]}
        />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border border-border"
            onClick={() => (currentStep > 0 ? setCurrentStep(currentStep - 1) : router.back())}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/74">
              Checkout
            </p>
            <h1 className="mt-1 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-6xl">
              Finaliza tu compra
            </h1>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className={`rounded-[1.4rem] border px-4 py-3 ${currentStep === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
          <div className="flex items-center gap-3">
            <Home className="h-4 w-4" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em]">Paso 1</p>
              <p className="font-medium">Información de envío</p>
            </div>
          </div>
        </div>
        <div className={`rounded-[1.4rem] border px-4 py-3 ${currentStep === 1 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em]">Paso 2</p>
              <p className="font-medium">Pago</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          {currentStep === 0 ? (
            <>
              <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
                <CardHeader className="pb-4">
                  <CardTitle>Información de envío</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...shippingForm}>
                    <form className="space-y-4">
                      <FormField
                        control={shippingForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre completo</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12 rounded-[1rem]" autoComplete="name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                        <FormField
                          control={shippingForm.control}
                          name="calle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Calle</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-12 rounded-[1rem]" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={shippingForm.control}
                          name="numero"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-12 rounded-[1rem]" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={shippingForm.control}
                        name="colonia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Colonia</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12 rounded-[1rem]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={shippingForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciudad</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-12 rounded-[1rem]" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={shippingForm.control}
                          name="estado"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-12 rounded-[1rem]" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                        <FormField
                          control={shippingForm.control}
                          name="zip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código postal</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-12 rounded-[1rem]" inputMode="numeric" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={shippingForm.control}
                          name="telefono"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-12 rounded-[1rem]" type="tel" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={shippingForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12 rounded-[1rem]" type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <div className="hidden md:mt-5 md:block">
                <Button className="h-12 rounded-full px-6" onClick={() => void onContinueToPayment()}>
                  Continuar a pago
                </Button>
              </div>
            </>
          ) : stripePromise ? (
            <Elements stripe={stripePromise}>
              <PaymentStep
                values={shippingForm.getValues()}
                total={total}
                onBack={() => setCurrentStep(0)}
              />
            </Elements>
          ) : (
            <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Configuración faltante</CardTitle>
              </CardHeader>
              <CardContent>No se pudo inicializar Stripe.</CardContent>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-[calc(var(--storefront-header-current-height,var(--storefront-header-desktop-height))+1.5rem)]">
          <OrderSummaryPanel />
        </div>
      </div>

      {currentStep === 0 ? (
        <MobileCheckoutActions>
          <Button className="h-12 w-full rounded-full" onClick={() => void onContinueToPayment()}>
            Continuar a pago
          </Button>
        </MobileCheckoutActions>
      ) : null}
    </div>
  );
}
