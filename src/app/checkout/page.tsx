"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type UseFormReturn, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AddressElement,
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type {
  StripeAddressElementChangeEvent,
  StripeAddressElementOptions,
} from "@stripe/stripe-js";
import {
  ArrowLeft,
  Clock3,
  CreditCard,
  Home,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useStorefront } from "@/hooks/use-storefront";
import {
  checkoutCart,
  fetchCart,
  getCartVariantKey,
  getOrCreateSessionId,
} from "@/lib/api/cart";
import { ordersApi } from "@/lib/api/orders";
import { paymentsApi } from "@/lib/api/payments";
import {
  pickupApi,
  type FulfillmentMethod,
  type PickupContact,
  type PickupLocation,
} from "@/lib/api/pickup";
import {
  getAplazoPaymentErrorMessage,
  getApiErrorMessage,
} from "@/lib/api/errors";
import {
  buildAplazoReturnUrls,
  calculateAplazoItemsTotal,
  clearStoredAplazoCheckoutState,
  clearStoredAplazoRetryPayload,
  getAplazoCartFingerprint,
  isValidEmail,
  isValidMxPhoneForAplazo,
  isAplazoRetryableStatus,
  isAplazoTerminalStatus,
  normalizeEmail,
  normalizeMxPhoneForAplazo,
  normalizeWhitespace,
  safeString,
  readStoredAplazoCheckoutState,
  validateAplazoProducts,
  writeStoredAplazoRetryPayload,
  writeStoredAplazoCheckoutState,
} from "@/lib/aplazo";
import type {
  AplazoOnlineCreatePayload,
  CartItem,
  Orden,
  PaymentMethod,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useStripeConfig } from "@/hooks/use-stripe-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";
import { PaymentMethodStrip } from "@/components/storefront/shared/payment-method-strip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/storefront";

const SHIPPING_COST = 99;

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

if (IS_DEVELOPMENT && typeof window !== "undefined") {
  console.log(
    "Google Maps key loaded:",
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
  );
}

function logAplazoDebug(message: string, payload?: unknown) {
  if (!IS_DEVELOPMENT) {
    return;
  }

  if (payload === undefined) {
    console.info(`[aplazo] ${message}`);
    return;
  }

  console.info(`[aplazo] ${message}`, payload);
}

function maskEmailForLog(email: string) {
  const normalized = normalizeEmail(email);
  const [localPart = "", domain = ""] = normalized.split("@");
  if (!localPart || !domain) {
    return normalized;
  }

  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${"*".repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
}

function maskPhoneForLog(phone: string) {
  if (phone.length <= 4) {
    return phone;
  }

  return `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
}

function sanitizeAplazoCustomerForLog(customer: SanitizedAplazoCustomer) {
  return {
    namePresent: Boolean(customer.name),
    email: maskEmailForLog(customer.email),
    phone: maskPhoneForLog(customer.phone),
  };
}

function getExpectedCheckoutPricing(
  subtotal: number,
  fulfillmentMethod: FulfillmentMethod = "DELIVERY",
) {
  const shipping = fulfillmentMethod === "PICKUP" ? 0 : SHIPPING_COST;
  const tax = 0;
  const total = subtotal + shipping + tax;

  return {
    subtotal: roundCurrency(subtotal),
    shipping: roundCurrency(shipping),
    tax: roundCurrency(tax),
    total: roundCurrency(total),
  };
}

function validateOrderPricing(params: {
  order: Pick<Orden, "subtotal" | "shippingCost" | "total">;
  expectedSubtotal: number;
  fulfillmentMethod?: FulfillmentMethod;
}) {
  const expected = getExpectedCheckoutPricing(
    params.expectedSubtotal,
    params.fulfillmentMethod,
  );
  const actualSubtotal = roundCurrency(params.order.subtotal ?? 0);
  const actualShipping = roundCurrency(params.order.shippingCost ?? 0);
  const actualTotal = roundCurrency(params.order.total ?? 0);

  if (
    actualSubtotal === expected.subtotal &&
    actualShipping === expected.shipping &&
    actualTotal === expected.total
  ) {
    return;
  }

  throw new Error(
    `La orden backend devolvió subtotal ${formatCurrency(actualSubtotal)}, envío ${formatCurrency(actualShipping)} y total ${formatCurrency(actualTotal)}, pero el checkout mostraba ${formatCurrency(expected.total)}. Revisa el pricing antes de continuar con el pago.`,
  );
}

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

type PickupCheckoutValues = {
  fulfillmentMethod: "PICKUP";
  pickupLocation: PickupLocation;
  pickupContact: PickupContact;
};

type DeliveryCheckoutValues = ShippingValues & {
  fulfillmentMethod: "DELIVERY";
};

type CheckoutValues = DeliveryCheckoutValues | PickupCheckoutValues;

type CapturedAddressValue = StripeAddressElementChangeEvent["value"];

const addressElementOptions: StripeAddressElementOptions = {
  mode: "shipping",
  allowedCountries: ["MX"],
  fields: {
    phone: "always",
  },
  validation: {
    phone: {
      required: "always",
    },
  },
  autocomplete: {
    mode: "google_maps_api",
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  },
};

type SanitizedAplazoCustomer = {
  name: string;
  addressLine: string;
  email: string;
  phone: string;
  postalCode: string;
};

function getSanitizedCheckoutName(value: string) {
  return normalizeWhitespace(value);
}

function splitStreetAndNumber(line1: string) {
  const normalizedLine = normalizeWhitespace(line1);
  const match = normalizedLine.match(/^(.*?)(?:\s+)?(#?\d[\w\-\/]*)$/);

  if (!match?.[1] || !match[2]) {
    return {
      calle: normalizedLine,
      numero: "S/N",
    };
  }

  return {
    calle: normalizeWhitespace(match[1]),
    numero: normalizeWhitespace(match[2]),
  };
}

function mapAddressElementToShippingValues(
  value: CapturedAddressValue,
  email: string,
): ShippingValues {
  const { calle, numero } = splitStreetAndNumber(value.address.line1);

  return {
    name: normalizeWhitespace(value.name),
    telefono: normalizeWhitespace(value.phone ?? ""),
    calle,
    numero,
    colonia: normalizeWhitespace(value.address.line2 ?? "") || "Sin colonia",
    city: normalizeWhitespace(value.address.city),
    estado: normalizeWhitespace(value.address.state),
    zip: normalizeWhitespace(value.address.postal_code),
    email,
  };
}

function getSanitizedAplazoCustomer(values: CheckoutValues): SanitizedAplazoCustomer {
  if (values.fulfillmentMethod === "PICKUP") {
    const location = values.pickupLocation;

    return {
      name: getSanitizedCheckoutName(values.pickupContact.name),
      addressLine: safeString(
        [location.address, location.city, location.state]
          .filter(Boolean)
          .join(" "),
        "Recoger en tienda",
      ),
      email: normalizeEmail(values.pickupContact.email ?? ""),
      phone: normalizeMxPhoneForAplazo(values.pickupContact.phone ?? ""),
      postalCode: normalizeWhitespace(location.postalCode),
    };
  }

  const name = getSanitizedCheckoutName(values.name);
  const addressLine = normalizeWhitespace(
    [values.calle, values.numero, values.colonia].filter(Boolean).join(" "),
  );

  return {
    name,
    addressLine: safeString(addressLine, "Pendiente por confirmar"),
    email: normalizeEmail(values.email),
    phone: normalizeMxPhoneForAplazo(values.telefono),
    postalCode: normalizeWhitespace(values.zip),
  };
}

function validateAplazoSubmission(values: CheckoutValues, items: CartItem[]) {
  const customer = getSanitizedAplazoCustomer(values);
  const fullName = customer.name;

  if (!fullName) {
    return { ok: false as const, message: "Ingresa un nombre válido" };
  }

  if (!isValidEmail(customer.email)) {
    return { ok: false as const, message: "Ingresa un correo válido" };
  }

  if (!isValidMxPhoneForAplazo(customer.phone)) {
    return {
      ok: false as const,
      message: "Ingresa un teléfono válido de 10 dígitos",
    };
  }

  const productsValidation = validateAplazoProducts(items);
  if (!productsValidation.ok) {
    return {
      ok: false as const,
      message:
        productsValidation.message ?? "No hay productos válidos en el carrito",
    };
  }

  if (productsValidation.totalPrice <= 0) {
    return {
      ok: false as const,
      message: "No fue posible preparar el pago con Aplazo",
    };
  }

  return {
    ok: true as const,
    customer,
    fullName,
    validatedSubtotal: calculateAplazoItemsTotal(items),
  };
}

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

function buildCheckoutPayload(
  values: CheckoutValues,
  metodoPago: PaymentMethod,
) {
  if (values.fulfillmentMethod === "PICKUP") {
    return {
      fulfillmentMethod: "PICKUP" as const,
      pickupLocationId: values.pickupLocation.id,
      pickupContact: values.pickupContact,
      metodoPago,
      costoEnvio: 0,
    };
  }

  return {
    fulfillmentMethod: "DELIVERY" as const,
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
    metodoPago,
    costoEnvio: SHIPPING_COST,
  };
}

async function resolveCartIdForPickup(cartId?: string) {
  const sessionId = getOrCreateSessionId();

  if (cartId) {
    return { cartId, sessionId };
  }

  const cart = await fetchCart(sessionId);
  if (!cart.id) {
    throw new Error(
      "No se pudo identificar el carrito para validar recolección. Recarga el checkout e intenta nuevamente.",
    );
  }

  return { cartId: cart.id, sessionId };
}

function buildAplazoPayload(params: {
  orderId: string;
  values: CheckoutValues;
  items: CartItem[];
  order: Pick<Orden, "subtotal" | "shippingCost" | "total">;
  origin: string;
}): AplazoOnlineCreatePayload {
  const { successUrl, failureUrl, cancelUrl, cartUrl } = buildAplazoReturnUrls(
    params.origin,
  );
  const customer = getSanitizedAplazoCustomer(params.values);
  const productsValidation = validateAplazoProducts(params.items);
  const orderSubtotal = roundCurrency(params.order.subtotal ?? 0);
  const orderShipping = roundCurrency(params.order.shippingCost ?? 0);
  const orderTaxes = 0;
  const orderTotal = roundCurrency(params.order.total ?? 0);
  const productsTotal = roundCurrency(calculateAplazoItemsTotal(params.items));
  const expectedTotal = roundCurrency(productsTotal + orderShipping + orderTaxes);

  if (
    !customer.name ||
    !isValidEmail(customer.email) ||
    !isValidMxPhoneForAplazo(customer.phone)
  ) {
    throw new Error("No fue posible preparar el pago con Aplazo");
  }

  if (!productsValidation.ok || productsValidation.products.length === 0) {
    throw new Error(
      productsValidation.message ?? "No fue posible preparar el pago con Aplazo",
    );
  }

  if (orderSubtotal <= 0 || orderTotal <= 0 || orderShipping < 0) {
    throw new Error("No fue posible preparar el pago con Aplazo");
  }

  if (expectedTotal !== orderTotal) {
    throw new Error("No fue posible preparar el pago con Aplazo");
  }

  return {
    orderId: params.orderId,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    currency: "MXN",
    successUrl,
    failureUrl,
    cancelUrl,
    cartUrl,
    metadata: {
      cartId: params.orderId,
    },
  };
}

function getAplazoErrorMessage(error: unknown) {
  return getAplazoPaymentErrorMessage(error, "online");
}

function omitAplazoUrls(payload: AplazoOnlineCreatePayload) {
  return {
    orderId: payload.orderId,
    customer: payload.customer,
    currency: payload.currency,
    metadata: payload.metadata,
  };
}

function buildAplazoReturnHref(params: {
  paymentAttemptId: string;
  orderId: string;
  path?: "success" | "failure" | "cancel";
}) {
  const targetPath = params.path ?? "success";
  return `/payments/aplazo/${targetPath}?paymentAttemptId=${encodeURIComponent(params.paymentAttemptId)}&ordenId=${encodeURIComponent(params.orderId)}`;
}

function MobileCheckoutActions({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-[rgb(251_249_243_/_0.96)] py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl md:hidden">
      <div className="container flex items-center gap-3">{children}</div>
    </div>
  );
}

function OrderSummaryPanel({
  fulfillmentMethod,
}: {
  fulfillmentMethod: FulfillmentMethod;
}) {
  const { state, subtotal, totalItems } = useCart();
  const { getPersonalization } = useStorefront();
  const pricing = getExpectedCheckoutPricing(subtotal, fulfillmentMethod);

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
            <span>{formatCurrency(pricing.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>
              {fulfillmentMethod === "PICKUP" ? "Recoger en tienda" : "Envío estimado"}
            </span>
            <span>
              {fulfillmentMethod === "PICKUP"
                ? "Sin costo"
                : formatCurrency(pricing.shipping)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Artículos</span>
            <span>{totalItems}</span>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-border bg-muted/45 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
            Total estimado
          </p>
          <p className="mt-2 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.03em]">
            {formatCurrency(pricing.total)}
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-border bg-muted/45 px-4 py-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">
              La orden backend confirma el total final antes de iniciar el pago. La personalización de jersey se muestra en la UI y no modifica el total backend en esta versión.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodSelector({
  value,
  onValueChange,
}: {
  value: PaymentMethod;
  onValueChange: (value: PaymentMethod) => void;
}) {
  const options: Array<{
    value: PaymentMethod;
    title: string;
    description: string;
    icon?: typeof CreditCard;
    logoSrc?: string;
    logoWidth?: number;
    logoHeight?: number;
  }> = [
    {
      value: "TARJETA",
      title: "Tarjeta",
      description: "Pago inmediato con Stripe dentro del checkout actual.",
      icon: CreditCard,
    },
    {
      value: "APLAZO",
      title: "Aplazo",
      description: "Te redirigiremos para completar y validar el pago de forma asíncrona.",
      logoSrc: "/images/iconosdepagos/aplazo.svg",
      logoWidth: 92,
      logoHeight: 32,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Método de pago</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Elige cómo quieres completar tu compra sin salir del flujo actual del checkout.
        </p>
      </div>
      <RadioGroup
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as PaymentMethod)}
        className="gap-3"
      >
        {options.map((option) => {
          const isActive = value === option.value;

          return (
            <label
              key={option.value}
              htmlFor={`payment-method-${option.value}`}
              className={cn(
                "flex cursor-pointer gap-3 rounded-[1.4rem] border px-4 py-4 transition-colors",
                isActive
                  ? "border-primary bg-primary/8"
                  : "border-border bg-muted/35 hover:bg-muted/55",
              )}
            >
              <RadioGroupItem
                id={`payment-method-${option.value}`}
                value={option.value}
                className="mt-1"
              />
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border",
                    isActive
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {option.logoSrc ? (
                    <Image
                      src={option.logoSrc}
                      alt={`${option.title} logo`}
                      width={option.logoWidth ?? 72}
                      height={option.logoHeight ?? 24}
                      className="h-auto w-7 object-contain"
                    />
                  ) : option.icon ? (
                    <option.icon className="h-4 w-4" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{option.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

function FulfillmentSelector({
  value,
  onValueChange,
}: {
  value: FulfillmentMethod;
  onValueChange: (value: FulfillmentMethod) => void;
}) {
  const options: Array<{
    value: FulfillmentMethod;
    title: string;
    description: string;
    icon: typeof Home;
  }> = [
    {
      value: "DELIVERY",
      title: "Envío a domicilio",
      description: "Recibe tu pedido en una dirección de México.",
      icon: Home,
    },
    {
      value: "PICKUP",
      title: "Recoger en tienda",
      description: "Compra en línea y recoge en una sucursal disponible.",
      icon: Store,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Método de entrega</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Elige si quieres envío a domicilio o recolección sin costo.
        </p>
      </div>
      <RadioGroup
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as FulfillmentMethod)}
        className="grid gap-3 md:grid-cols-2"
      >
        {options.map((option) => {
          const isActive = value === option.value;
          const Icon = option.icon;

          return (
            <label
              key={option.value}
              htmlFor={`fulfillment-${option.value}`}
              className={cn(
                "flex cursor-pointer gap-3 rounded-[1.4rem] border px-4 py-4 transition-colors",
                isActive
                  ? "border-primary bg-primary/8"
                  : "border-border bg-muted/35 hover:bg-muted/55",
              )}
            >
              <RadioGroupItem
                id={`fulfillment-${option.value}`}
                value={option.value}
                className="mt-1"
              />
              <div className="flex min-w-0 gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                    isActive
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {option.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

function formatPreparationTime(minutes?: number) {
  if (!minutes || minutes <= 0) {
    return "Tiempo por confirmar";
  }

  if (minutes < 60) {
    return `${minutes} min aprox.`;
  }

  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} h aprox.`;
}

function ShippingAddressStep({
  form,
  fulfillmentMethod,
  onFulfillmentMethodChange,
  pickupLocations,
  selectedPickupLocationId,
  pickupContact,
  isLoadingPickupLocations,
  pickupError,
  onSelectedPickupLocationIdChange,
  onPickupContactChange,
  isAuthenticated,
  onAddressCaptured,
  onContinue,
}: {
  form: UseFormReturn<ShippingValues>;
  fulfillmentMethod: FulfillmentMethod;
  onFulfillmentMethodChange: (value: FulfillmentMethod) => void;
  pickupLocations: PickupLocation[];
  selectedPickupLocationId: string;
  pickupContact: PickupContact;
  isLoadingPickupLocations: boolean;
  pickupError: string | null;
  onSelectedPickupLocationIdChange: (value: string) => void;
  onPickupContactChange: (value: PickupContact) => void;
  isAuthenticated: boolean;
  onAddressCaptured: (value: CapturedAddressValue) => void;
  onContinue: (values: CheckoutValues) => void;
}) {
  const elements = useElements();
  const { toast } = useToast();
  const [addressError, setAddressError] = useState<string | null>(null);
  const [deliveryReferences, setDeliveryReferences] = useState("");

  const handleContinue = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Sesión requerida",
        description: "Debes iniciar sesión para completar checkout.",
      });
      return;
    }

    if (fulfillmentMethod === "PICKUP") {
      const selectedLocation = pickupLocations.find(
        (location) => location.id === selectedPickupLocationId,
      );
      const contactName = normalizeWhitespace(pickupContact.name);
      const contactEmail = normalizeEmail(pickupContact.email ?? form.getValues("email"));
      const contactPhone = normalizeWhitespace(pickupContact.phone ?? "");

      if (!selectedLocation) {
        setAddressError("Selecciona una sucursal para recoger tu pedido.");
        return;
      }

      if (!contactName) {
        setAddressError("Ingresa el nombre de la persona que recogerá el pedido.");
        return;
      }

      setAddressError(null);
      onContinue({
        fulfillmentMethod: "PICKUP",
        pickupLocation: selectedLocation,
        pickupContact: {
          name: contactName,
          ...(contactPhone ? { phone: contactPhone } : {}),
          ...(contactEmail ? { email: contactEmail } : {}),
        },
      });
      return;
    }

    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) {
      return;
    }

    const addressElement = elements?.getElement("address");
    if (!addressElement) {
      setAddressError("No se pudo cargar el formulario de dirección. Intenta nuevamente.");
      return;
    }

    const { complete, value } = await addressElement.getValue();
    if (!complete) {
      setAddressError("Completa tu dirección de entrega para continuar.");
      return;
    }

    setAddressError(null);
    onAddressCaptured(value);

    const mappedValues = mapAddressElementToShippingValues(
      value,
      form.getValues("email"),
    );

    form.reset(mappedValues, {
      keepErrors: false,
      keepDirty: true,
      keepTouched: true,
    });

    const isValid = await form.trigger();
    if (isValid) {
      onContinue({
        ...form.getValues(),
        fulfillmentMethod: "DELIVERY",
      });
    }
  };

  return (
    <>
      <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="pb-4">
          <CardTitle>Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-5">
              <FulfillmentSelector
                value={fulfillmentMethod}
                onValueChange={(value) => {
                  setAddressError(null);
                  onFulfillmentMethodChange(value);
                }}
              />

              {fulfillmentMethod === "DELIVERY" ? (
                <div className="space-y-2">
                  <FormLabel>Dirección de entrega</FormLabel>
                  <div
                    className={cn(
                      "rounded-[1.5rem] border bg-muted/45 p-4 transition-colors",
                      addressError ? "border-destructive" : "border-border",
                    )}
                  >
                    <AddressElement options={addressElementOptions} />
                  </div>
                  {addressError ? (
                    <p className="text-sm font-medium text-destructive">
                      {addressError}
                    </p>
                  ) : (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Selecciona una dirección de México y confirma el teléfono.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <FormLabel>Sucursal de recolección</FormLabel>
                    {isLoadingPickupLocations ? (
                      <div className="rounded-[1.4rem] border border-border bg-muted/35 px-4 py-5 text-sm text-muted-foreground">
                        Cargando sucursales...
                      </div>
                    ) : pickupError ? (
                      <div className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                        {pickupError}
                      </div>
                    ) : pickupLocations.length === 0 ? (
                      <div className="rounded-[1.4rem] border border-border bg-muted/35 px-4 py-5 text-sm text-muted-foreground">
                        No hay sucursales con recolección disponible por ahora.
                      </div>
                    ) : (
                      <RadioGroup
                        value={selectedPickupLocationId}
                        onValueChange={onSelectedPickupLocationIdChange}
                        className="gap-3"
                      >
                        {pickupLocations.map((location) => (
                          <label
                            key={location.id}
                            htmlFor={`pickup-location-${location.id}`}
                            className={cn(
                              "flex cursor-pointer gap-3 rounded-[1.4rem] border px-4 py-4 transition-colors",
                              selectedPickupLocationId === location.id
                                ? "border-primary bg-primary/8"
                                : "border-border bg-muted/35 hover:bg-muted/55",
                            )}
                          >
                            <RadioGroupItem
                              id={`pickup-location-${location.id}`}
                              value={location.id}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">
                                {location.name}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {[
                                  location.address,
                                  location.city,
                                  location.state,
                                  location.postalCode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {formatPreparationTime(
                                    location.estimatedPreparationMinutes,
                                  )}
                                </span>
                                {location.phone ? (
                                  <span className="rounded-full border border-border bg-card px-3 py-1">
                                    {location.phone}
                                  </span>
                                ) : null}
                              </div>
                              {location.pickupInstructions ? (
                                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                                  {location.pickupInstructions}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <FormLabel htmlFor="pickup-contact-name">
                        Nombre de quien recoge
                      </FormLabel>
                      <Input
                        id="pickup-contact-name"
                        value={pickupContact.name}
                        onChange={(event) =>
                          onPickupContactChange({
                            ...pickupContact,
                            name: event.target.value,
                          })
                        }
                        className="h-12 rounded-[1rem]"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <FormLabel htmlFor="pickup-contact-phone">
                        Teléfono
                      </FormLabel>
                      <Input
                        id="pickup-contact-phone"
                        value={pickupContact.phone ?? ""}
                        onChange={(event) =>
                          onPickupContactChange({
                            ...pickupContact,
                            phone: event.target.value,
                          })
                        }
                        className="h-12 rounded-[1rem]"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="space-y-2">
                      <FormLabel htmlFor="pickup-contact-email">
                        Email
                      </FormLabel>
                      <Input
                        id="pickup-contact-email"
                        value={pickupContact.email ?? ""}
                        onChange={(event) =>
                          onPickupContactChange({
                            ...pickupContact,
                            email: event.target.value,
                          })
                        }
                        className="h-12 rounded-[1rem]"
                        type="email"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {addressError ? (
                    <p className="text-sm font-medium text-destructive">
                      {addressError}
                    </p>
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <FormLabel htmlFor="delivery-references">
                  {fulfillmentMethod === "PICKUP"
                    ? "Notas para recolección"
                    : "Referencias de entrega"}
                </FormLabel>
                <Textarea
                  id="delivery-references"
                  value={deliveryReferences}
                  onChange={(event) => setDeliveryReferences(event.target.value)}
                  placeholder={
                    fulfillmentMethod === "PICKUP"
                      ? "Nombre alterno o indicaciones para mostrador."
                      : "Casa, color de fachada, entre calles o indicaciones para mensajería."
                  }
                  className="min-h-[96px] rounded-[1rem]"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Campo opcional, solo queda preparado en esta pantalla.
                </p>
              </div>

              {fulfillmentMethod === "DELIVERY" ? (
                <FormField
                  control={form.control}
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
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="hidden md:mt-5 md:block">
        <Button className="h-12 rounded-full px-6" onClick={() => void handleContinue()}>
          Continuar a pago
        </Button>
      </div>

      <MobileCheckoutActions>
        <Button className="h-12 w-full rounded-full" onClick={() => void handleContinue()}>
          Continuar a pago
        </Button>
      </MobileCheckoutActions>
    </>
  );
}

function CardPaymentStep({
  values,
  cartId,
  cartItems,
  total,
  onBack,
  paymentMethod,
  onPaymentMethodChange,
}: {
  values: CheckoutValues;
  cartId?: string;
  cartItems: CartItem[];
  total: number;
  onBack: () => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { toast } = useToast();
  const { clearAllItems } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (isProcessing) {
      return;
    }

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
      const expectedSubtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      if (values.fulfillmentMethod === "PICKUP") {
        const pickupCart = await resolveCartIdForPickup(cartId);
        const availability = await pickupApi.validateAvailability({
          locationId: values.pickupLocation.id,
          cartId: pickupCart.cartId,
          sessionId: pickupCart.sessionId,
        });

        if (!availability.canPickup) {
          throw new Error(
            "La sucursal seleccionada no tiene disponibilidad para todos los productos.",
          );
        }
      }

      const checkoutResult = await checkoutCart(
        buildCheckoutPayload(values, "TARJETA"),
      );

      const ordenId = getOrderIdFromCheckoutResult(checkoutResult);
      if (!ordenId) {
        throw new Error("No se recibió un ID de orden válido");
      }

      const createdOrder = await ordersApi.getById(ordenId);
      if (!createdOrder) {
        throw new Error("No se pudo consultar la orden creada antes de procesar el pago");
      }

      validateOrderPricing({
        order: createdOrder,
        expectedSubtotal,
        fulfillmentMethod: values.fulfillmentMethod,
      });

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
            name:
              values.fulfillmentMethod === "PICKUP"
                ? values.pickupContact.name
                : values.name,
            email:
              values.fulfillmentMethod === "PICKUP"
                ? values.pickupContact.email
                : values.email,
            address:
              values.fulfillmentMethod === "PICKUP"
                ? {
                    city: values.pickupLocation.city,
                    state: values.pickupLocation.state,
                    line1: values.pickupLocation.address,
                    postal_code: values.pickupLocation.postalCode,
                  }
                : {
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

      clearStoredAplazoCheckoutState();
      clearStoredAplazoRetryPayload();
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
          <PaymentMethodSelector
            value={paymentMethod}
            onValueChange={onPaymentMethodChange}
          />

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

function AplazoPaymentStep({
  values,
  cartId,
  cartItems,
  onBack,
  paymentMethod,
  onPaymentMethodChange,
}: {
  values: CheckoutValues;
  cartId?: string;
  cartItems: CartItem[];
  onBack: () => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleContinueWithAplazo = async () => {
    if (isProcessing || typeof window === "undefined") {
      return;
    }

    const validation = validateAplazoSubmission(values, cartItems);
    if (!validation.ok) {
      setSubmissionError(validation.message);
      logAplazoDebug("Validación Aplazo fallida antes del submit", {
        reason: validation.message,
      });
      toast({
        variant: "destructive",
        title: "Datos inválidos",
        description: validation.message,
      });
      return;
    }

    setSubmissionError(null);
    logAplazoDebug("Teléfono Aplazo normalizado", {
      originalPhone:
        values.fulfillmentMethod === "PICKUP"
          ? values.pickupContact.phone
          : values.telefono,
      normalizedPhone: validation.customer.phone,
    });

    setIsProcessing(true);

    try {
      const origin = window.location.origin;
      const cartFingerprint = [
        getAplazoCartFingerprint(cartItems),
        values.fulfillmentMethod,
        values.fulfillmentMethod === "PICKUP" ? values.pickupLocation.id : "",
      ].join("|");
      const cartSessionId = getOrCreateSessionId();
      const cartSnapshot = cartItems.map((item) => ({
        productoId: item.id,
        cantidad: item.quantity,
        ...(item.tallaId ?? item.size
          ? { tallaId: item.tallaId ?? item.size }
          : {}),
      }));
      const storedState = readStoredAplazoCheckoutState();
      const canReuseStoredOrder =
        storedState?.paymentMethod === "APLAZO" &&
        storedState.cartFingerprint === cartFingerprint &&
        Boolean(storedState.orderId);

      if (storedState && !canReuseStoredOrder) {
        clearStoredAplazoCheckoutState();
        clearStoredAplazoRetryPayload();
      }

      if (
        canReuseStoredOrder &&
        storedState?.paymentAttemptId &&
        !isAplazoTerminalStatus(storedState.lastKnownStatus)
      ) {
        router.push(
          buildAplazoReturnHref({
            paymentAttemptId: storedState.paymentAttemptId,
            orderId: storedState.orderId,
            path: "success",
          }),
        );
        return;
      }

      let orderId = canReuseStoredOrder ? storedState?.orderId ?? "" : "";
      let idempotencyKey = canReuseStoredOrder
        ? storedState?.idempotencyKey ?? crypto.randomUUID()
        : crypto.randomUUID();
      let createPayload: AplazoOnlineCreatePayload | null = null;
      let createdOrder: Orden | null = null;

      if (!canReuseStoredOrder) {
        if (values.fulfillmentMethod === "PICKUP") {
          const pickupCart = await resolveCartIdForPickup(cartId);
          const availability = await pickupApi.validateAvailability({
            locationId: values.pickupLocation.id,
            cartId: pickupCart.cartId,
            sessionId: pickupCart.sessionId,
          });

          if (!availability.canPickup) {
            throw new Error(
              "La sucursal seleccionada no tiene disponibilidad para todos los productos.",
            );
          }
        }

        const checkoutValues =
          values.fulfillmentMethod === "PICKUP"
            ? {
                ...values,
                pickupContact: {
                  ...values.pickupContact,
                  name: validation.fullName,
                  email: validation.customer.email,
                  phone: validation.customer.phone,
                },
              }
            : {
                ...values,
                name: validation.fullName,
                email: validation.customer.email,
                telefono: validation.customer.phone,
              };

        const checkoutResult = await checkoutCart(
          buildCheckoutPayload(checkoutValues, "APLAZO"),
        );

        orderId = getOrderIdFromCheckoutResult(checkoutResult);
        if (!orderId) {
          throw new Error("No se recibió un ID de orden válido");
        }

        createdOrder = await ordersApi.getById(orderId);
        if (!createdOrder) {
          throw new Error("No se pudo consultar la orden creada para validar montos con Aplazo");
        }
      } else if (storedState && isAplazoRetryableStatus(storedState.lastKnownStatus)) {
        idempotencyKey = crypto.randomUUID();
        writeStoredAplazoCheckoutState({
          ...storedState,
          paymentAttemptId: undefined,
          idempotencyKey,
          cartSessionId: storedState.cartSessionId ?? cartSessionId,
          cartSnapshot: storedState.cartSnapshot ?? cartSnapshot,
          expiresAt: null,
          lastKnownStatus: undefined,
          lastReturnPath: undefined,
          updatedAt: new Date().toISOString(),
        });
      }

      if (orderId) {
        createdOrder = createdOrder ?? (await ordersApi.getById(orderId));
      }

      if (!createdOrder) {
        throw new Error("No se pudo preparar el pago con Aplazo");
      }

      validateOrderPricing({
        order: createdOrder,
        expectedSubtotal: validation.validatedSubtotal,
        fulfillmentMethod: values.fulfillmentMethod,
      });

      createPayload = buildAplazoPayload({
        orderId,
        values: {
          ...(values.fulfillmentMethod === "PICKUP"
            ? {
                ...values,
                pickupContact: {
                  ...values.pickupContact,
                  name: validation.fullName,
                  email: validation.customer.email,
                  phone: validation.customer.phone,
                },
              }
            : {
                ...values,
                name: validation.fullName,
                email: validation.customer.email,
                telefono: validation.customer.phone,
              }),
        } as CheckoutValues,
        items: cartItems,
        order: createdOrder,
        origin,
      });

      logAplazoDebug("Payload Aplazo sanitizado", {
        orderId: createPayload.orderId,
        customer: createPayload.customer
          ? sanitizeAplazoCustomerForLog(validation.customer)
          : undefined,
        metadata: createPayload.metadata,
      });

      writeStoredAplazoRetryPayload(omitAplazoUrls(createPayload));
      writeStoredAplazoCheckoutState({
        paymentMethod: "APLAZO",
        flowType: "online",
        orderId,
        idempotencyKey,
        cartFingerprint,
        cartSessionId,
        cartSnapshot,
        expiresAt: null,
        updatedAt: new Date().toISOString(),
      });

      if (!createPayload || !orderId) {
        throw new Error("No se pudo preparar el intento de pago con Aplazo");
      }

      const attempt = await paymentsApi.createAplazoOnlineAttempt(
        createPayload,
        idempotencyKey,
      );

      logAplazoDebug("Respuesta Aplazo create online", {
        paymentAttemptId: attempt.paymentAttemptId,
        redirectUrlPresent: Boolean(attempt.redirectUrl),
        checkoutUrlPresent: Boolean(attempt.checkoutUrl),
      });

      if (!attempt.paymentAttemptId) {
        throw new Error("No se recibió paymentAttemptId para continuar con Aplazo");
      }

      writeStoredAplazoCheckoutState({
        paymentMethod: "APLAZO",
        flowType: "online",
        orderId,
        paymentAttemptId: attempt.paymentAttemptId,
        idempotencyKey,
        cartFingerprint,
        cartSessionId,
        cartSnapshot,
        expiresAt: attempt.expiresAt ?? null,
        lastKnownStatus: attempt.status,
        lastReturnPath: "success",
        updatedAt: new Date().toISOString(),
      });

      const targetUrl = attempt.checkoutUrl || attempt.redirectUrl;
      if (targetUrl) {
        window.location.assign(targetUrl);
        return;
      }

      router.push(
        buildAplazoReturnHref({
          paymentAttemptId: attempt.paymentAttemptId,
          orderId,
          path: "success",
        }),
      );
    } catch (error) {
      const description = getAplazoErrorMessage(error);
      setSubmissionError(description);
      logAplazoDebug("Error al crear intento Aplazo", {
        description,
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "") || undefined
            : undefined,
      });
      toast({
        variant: "destructive",
        title: "No se pudo iniciar Aplazo",
        description,
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
          <PaymentMethodSelector
            value={paymentMethod}
            onValueChange={onPaymentMethodChange}
          />

          <div className="rounded-[1.5rem] border border-border bg-muted/45 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Continuarás tu pago fuera del checkout
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Crearemos tu orden con método Aplazo y te redirigiremos para completar el pago.
                    Cuando regreses, esta tienda validará el estado final antes de confirmar tu compra.
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <p>
                    Total estimado a validar con Aplazo:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        cartItems.reduce(
                          (sum, item) => sum + item.price * item.quantity,
                          0,
                        ) +
                          (values.fulfillmentMethod === "PICKUP"
                            ? 0
                            : SHIPPING_COST),
                      )}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border bg-muted/35 px-4 py-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                No mostraremos la compra como exitosa hasta que el backend confirme el estado final del intento.
              </p>
            </div>
          </div>

          {submissionError ? (
            <div className="rounded-[1.2rem] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {submissionError}
            </div>
          ) : null}

          <div className="hidden gap-3 md:flex">
            <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={onBack}>
              Volver
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-full"
              onClick={() => void handleContinueWithAplazo()}
              disabled={isProcessing}
            >
              {isProcessing ? "Preparando..." : "Continuar con Aplazo"}
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
          onClick={() => void handleContinueWithAplazo()}
          disabled={isProcessing}
        >
          {isProcessing ? "Preparando..." : "Continuar con Aplazo"}
        </Button>
      </MobileCheckoutActions>
    </>
  );
}

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TARJETA");
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>("DELIVERY");
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState("");
  const [pickupContact, setPickupContact] = useState<PickupContact>({
    name: "",
    phone: "",
    email: "",
  });
  const [isLoadingPickupLocations, setIsLoadingPickupLocations] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [checkoutValues, setCheckoutValues] = useState<CheckoutValues | null>(
    null,
  );
  const [, setCapturedAddress] = useState<CapturedAddressValue | null>(null);
  const router = useRouter();
  const { state, subtotal, totalItems, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const stripePromise = useStripeConfig();

  const shippingForm = useForm<ShippingValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      name: "",
      telefono: "",
      calle: "",
      numero: "",
      colonia: "",
      city: "",
      estado: "",
      zip: "",
      email: "",
    },
  });

  useEffect(() => {
    if (fulfillmentMethod !== "PICKUP" || pickupLocations.length > 0) {
      return;
    }

    const loadPickupLocations = async () => {
      setIsLoadingPickupLocations(true);
      setPickupError(null);

      try {
        const locations = await pickupApi.listLocations();
        setPickupLocations(locations);
        setSelectedPickupLocationId((current) => current || locations[0]?.id || "");
      } catch (error) {
        setPickupError(getApiErrorMessage(error));
      } finally {
        setIsLoadingPickupLocations(false);
      }
    };

    void loadPickupLocations();
  }, [fulfillmentMethod, pickupLocations.length]);

  const pricing = useMemo(
    () => getExpectedCheckoutPricing(subtotal, fulfillmentMethod),
    [fulfillmentMethod, subtotal],
  );
  const total = pricing.total;
  const activeCheckoutValues =
    checkoutValues ??
    ({
      ...shippingForm.getValues(),
      fulfillmentMethod: "DELIVERY",
    } as DeliveryCheckoutValues);

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
              <p className="font-medium">Entrega</p>
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
            stripePromise ? (
              <Elements stripe={stripePromise}>
                <ShippingAddressStep
                  form={shippingForm}
                  fulfillmentMethod={fulfillmentMethod}
                  onFulfillmentMethodChange={(value) => {
                    setFulfillmentMethod(value);
                    setCheckoutValues(null);
                  }}
                  pickupLocations={pickupLocations}
                  selectedPickupLocationId={selectedPickupLocationId}
                  pickupContact={pickupContact}
                  isLoadingPickupLocations={isLoadingPickupLocations}
                  pickupError={pickupError}
                  onSelectedPickupLocationIdChange={setSelectedPickupLocationId}
                  onPickupContactChange={setPickupContact}
                  isAuthenticated={isAuthenticated}
                  onAddressCaptured={setCapturedAddress}
                  onContinue={(values) => {
                    setCheckoutValues(values);
                    setCurrentStep(1);
                  }}
                />
              </Elements>
            ) : (
              <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle>Configuración faltante</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>No se pudo inicializar Stripe para capturar la dirección.</p>
                </CardContent>
              </Card>
            )
          ) : paymentMethod === "TARJETA" ? (
            stripePromise ? (
              <Elements stripe={stripePromise}>
                <CardPaymentStep
                  values={activeCheckoutValues}
                  cartId={state.id}
                  cartItems={state.items}
                  total={total}
                  onBack={() => setCurrentStep(0)}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                />
              </Elements>
            ) : (
              <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle>Configuración faltante</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PaymentMethodSelector
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  />
                  <p>No se pudo inicializar Stripe.</p>
                </CardContent>
              </Card>
            )
          ) : (
            <AplazoPaymentStep
              values={activeCheckoutValues}
              cartId={state.id}
              cartItems={state.items}
              onBack={() => setCurrentStep(0)}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
            />
          )}

          <PaymentMethodStrip
            className="mt-6"
            title="Métodos de pago disponibles"
            description="Aceptamos tarjetas, SPEI, billeteras digitales y Aplazo para que el cierre del checkout se vea completo y claro desde el primer paso."
          />
        </div>

        <div className="lg:sticky lg:top-[calc(var(--storefront-header-current-height,var(--storefront-header-desktop-height))+1.5rem)]">
          <OrderSummaryPanel fulfillmentMethod={fulfillmentMethod} />
        </div>
      </div>

    </div>
  );
}
