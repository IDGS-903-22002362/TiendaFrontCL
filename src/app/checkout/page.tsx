"use client";

import { useMemo, useState } from "react";
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
import { ArrowLeft, CreditCard, Home, CheckCircle } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
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
import Link from "next/link";

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

const steps = [
  { id: "shipping", name: "Envío", icon: Home },
  { id: "payment", name: "Pago", icon: CreditCard },
  { id: "confirmation", name: "Confirmación", icon: CheckCircle },
];

// stripe config now loaded dynamically using useStripeConfig hook

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

  if (typeof orderId === "string") {
    return orderId;
  }

  return "";
}

function PaymentForm({
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

      const confirmation = await stripe.confirmCardPayment(
        paymentInit.clientSecret,
        {
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
        },
      );

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
    <Card>
      <CardHeader>
        <CardTitle>Información de Pago</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[24px] border border-border bg-muted/55 p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#F5F5F5",
                  iconColor: "#EDCD12",
                  "::placeholder": {
                    color: "#8E8E8E",
                  },
                },
                invalid: {
                  color: "#DC2626",
                  iconColor: "#DC2626",
                },
              },
            }}
          />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-border bg-background-deep/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl md:relative md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 md:h-10"
            onClick={onBack}
          >
            Volver
          </Button>
          <Button
            type="button"
            className="flex-1 h-12 md:h-10"
            onClick={() => void handlePay()}
            disabled={isProcessing || !stripe}
          >
            {isProcessing ? "Procesando..." : "Pagar ahora"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8 text-center text-muted-foreground">
        Cargando checkout...
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="container flex min-h-[60vh] max-w-3xl flex-col items-center justify-center py-8 text-center">
        <Card className="w-full max-w-xl border-border/90">
          <CardHeader>
            <CardTitle>Tu carrito está vacío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-secondary">
            <p>
              Necesitas agregar al menos un producto antes de continuar con la
              compra.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 flex-1">
                <Link href="/products">Explorar productos</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 flex-1">
                <Link href="/cart">Ir al carrito</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-5 md:py-8">
      <div className="mb-6 flex items-center gap-3 md:mb-8 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-2xl"
          onClick={() =>
            currentStep > 0 ? setCurrentStep(currentStep - 1) : router.back()
          }
        >
          <ArrowLeft />
        </Button>
        <h1 className="font-headline text-2xl font-bold md:text-4xl">
          Checkout
        </h1>
      </div>

      <div className="mb-6 rounded-[24px] border border-border bg-card/90 p-4 shadow-[var(--shadow-card)] md:mb-8 md:rounded-[30px] md:p-5">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li key={step.name} className="relative flex-1">
              <div className="flex items-center text-sm font-medium">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${stepIdx <= currentStep ? "border-primary/40 bg-primary text-primary-foreground" : "border-border bg-muted text-text-secondary"}`}
                >
                  <step.icon className="h-5 w-5" />
                </span>
                <span
                  className={`ml-3 hidden sm:block ${stepIdx <= currentStep ? "text-foreground" : "text-text-muted"}`}
                >
                  {step.name}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div>
          <Card className="mb-4 border-secondary/15 lg:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>$99.00</span>
              </div>
              <div className="flex justify-between font-headline text-lg font-bold">
                <span>Total</span>
                <span className="text-secondary">${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {currentStep === 0 ? (
            <Card className="border-primary/15">
              <CardHeader>
                <CardTitle>Información de Envío</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...shippingForm}>
                  <form className="space-y-4 pb-24 md:pb-0">
                    <FormField
                      control={shippingForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="h-12 md:h-10"
                              autoComplete="name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-4 md:flex-row">
                      <FormField
                        control={shippingForm.control}
                        name="calle"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Calle</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12 md:h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={shippingForm.control}
                        name="numero"
                        render={({ field }) => (
                          <FormItem className="md:w-1/3">
                            <FormLabel>Num. Ext/Int</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12 md:h-10" />
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
                            <Input {...field} className="h-12 md:h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-4 md:flex-row">
                      <FormField
                        control={shippingForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12 md:h-10" autoComplete="address-level2" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={shippingForm.control}
                        name="estado"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12 md:h-10" autoComplete="address-level1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-4 md:flex-row">
                      <FormField
                        control={shippingForm.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem className="md:w-1/3">
                            <FormLabel>C.P.</FormLabel>
                            <FormControl>
                              <Input {...field} inputMode="numeric" className="h-12 md:h-10" autoComplete="postal-code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={shippingForm.control}
                        name="telefono"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input {...field} type="tel" className="h-12 md:h-10" autoComplete="tel" />
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
                            <Input
                              type="email"
                              inputMode="email"
                              className="h-12 md:h-10"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : stripePromise ? (
            <Elements stripe={stripePromise}>
              <PaymentForm
                values={shippingForm.getValues()}
                total={total}
                onBack={() => setCurrentStep(0)}
              />
            </Elements>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Configuración faltante</CardTitle>
              </CardHeader>
              <CardContent className="pb-20 text-sm text-text-secondary md:pb-6">
                No se pudo inicializar Stripe.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-24 border-secondary/15">
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>$99.00</span>
              </div>
              <div className="flex justify-between font-headline text-lg font-bold">
                <span>Total</span>
                <span className="text-secondary">${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {currentStep === 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 w-full border-t border-border bg-background-deep/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl lg:hidden">
          <Button
            onClick={() => void onContinueToPayment()}
            className="h-12 w-full"
            size="lg"
          >
            Continuar a Pago
          </Button>
        </div>
      )}
    </div>
  );
}
