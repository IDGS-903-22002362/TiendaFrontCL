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
        <div className="rounded-md border p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                },
              },
            }}
          />
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-background p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:relative md:bg-transparent md:p-0 md:shadow-none flex gap-2">
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
  const { subtotal, isLoading } = useCart();
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            currentStep > 0 ? setCurrentStep(currentStep - 1) : router.back()
          }
        >
          <ArrowLeft />
        </Button>
        <h1 className="font-headline text-3xl font-bold md:text-4xl">
          Checkout
        </h1>
      </div>

      <div className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li key={step.name} className="relative flex-1">
              <div className="flex items-center text-sm font-medium">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${stepIdx <= currentStep ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                >
                  <step.icon className="h-5 w-5" />
                </span>
                <span
                  className={`ml-3 hidden sm:block ${stepIdx <= currentStep ? "text-primary" : "text-muted-foreground"}`}
                >
                  {step.name}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          {currentStep === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Información de Envío</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...shippingForm}>
                  <form className="space-y-4 pb-20 md:pb-0">
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
                    <div className="flex gap-4">
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
                          <FormItem className="w-1/3">
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
                    <div className="flex gap-4">
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
                    <div className="flex gap-4">
                      <FormField
                        control={shippingForm.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem className="w-1/3">
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
              <CardContent className="text-sm text-muted-foreground pb-20 md:pb-6">
                No se pudo inicializar Stripe.
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-24">
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
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {currentStep === 0 && (
            <div className="fixed bottom-0 left-0 w-full bg-background p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:relative md:bg-transparent md:p-0 md:shadow-none">
              <Button
                onClick={() => void onContinueToPayment()}
                className="w-full h-12 md:h-10"
                size="lg"
              >
                Continuar a Pago
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
