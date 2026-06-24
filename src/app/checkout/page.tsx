"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type UseFormReturn, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  Clock3,
  CreditCard,
  Home,
  Lock,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useStorefront } from "@/hooks/use-storefront";
import { ApiError } from "@/lib/api/client";
import {
  fetchCart,
  getCartVariantKey,
  getOrCreateSessionId,
  validarCodigoPromocionCarrito,
  type ResultadoCodigoPromocionCarrito,
  type ValidarCodigoPromocionCarritoItem,
} from "@/lib/api/cart";
import {
  getCheckoutAttemptStatus,
  startCheckoutAttempt,
} from "@/lib/api/checkout-attempt";
import { paymentsApi } from "@/lib/api/payments";
import {
  pickupApi,
  type FulfillmentMethod,
  type PickupContact,
  type PickupLocation,
} from "@/lib/api/pickup";
import { type FedExDireccionEnvio } from "@/lib/api/fedex";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  buildCheckoutShippingAddress,
  toLegacyDireccionEnvio,
} from "@/lib/checkout/shipping";
import {
  isValidMxPhone,
  normalizeEmail,
  normalizeMxPhone,
  normalizeWhitespace,
} from "@/lib/checkout/customer";
import { MX_STATES } from "@/lib/shipping/mx-states";
import type {
  AddressValidationStatus,
  CartItem,
  FedExShippingOption,
  FedExShippingQuote,
  Orden,
  PaymentMethod,
  ShippingSelection,
} from "@/lib/types";
import type {
  CheckoutShippingAddress,
} from "@/types/shipping";
import { useToast } from "@/hooks/use-toast";
import { useStripeConfig } from "@/hooks/use-stripe-config";
import {
  GooglePlaceAutocompleteElement,
  type ParsedGoogleCheckoutAddress,
} from "@/components/checkout/GooglePlaceAutocompleteElement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  buildCartOfferPricingItems,
  calcularPreciosOfertasPublicas,
  getCartItemOfferLine,
  type ProductOfferPricing,
} from "@/lib/ofertas-public";

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

const MANUAL_FEDEX_SHIPPING_COST = 150;
const MANUAL_FEDEX_CURRENCY = "MXN";
const MANUAL_FEDEX_METHOD = "manual_fedex";
const MANUAL_FEDEX_SERVICE_NAME = "FedEx manual";

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

const PROMO_CODE_STORAGE_KEY = "tiendafront_codigo_promocion";

function getCheckoutPromoCodeField(codigoPromocion?: string) {
  const codigo = normalizeWhitespace(codigoPromocion ?? "").toUpperCase();

  return codigo ? { codigoPromocion: codigo } : {};
}

function getStringArrayFromCartItem(
  item: CartItem,
  keys: string[],
): string[] {
  const record = item as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0,
      );
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return [value];
    }
  }

  return [];
}

if (IS_DEVELOPMENT && typeof window !== "undefined") {
  console.log(
    "Google Maps key loaded:",
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
  );
}

function getExpectedCheckoutPricing(
  subtotal: number,
  fulfillmentMethod: FulfillmentMethod = "DELIVERY",
  shippingAmount = MANUAL_FEDEX_SHIPPING_COST,
) {
  const shipping = fulfillmentMethod === "PICKUP" ? 0 : shippingAmount;
  const tax = 0;
  const total = subtotal + shipping + tax;

  return {
    subtotal: roundCurrency(subtotal),
    shipping: roundCurrency(shipping),
    tax: roundCurrency(tax),
    total: roundCurrency(total),
  };
}

function buildCartItemsWithOfferPrices(
  items: CartItem[],
  pricingOfertas: Record<string, ProductOfferPricing>,
): CartItem[] {
  return items.map((item) => {
    const offerLine = getCartItemOfferLine(item, pricingOfertas);

    return {
      ...item,
      price: offerLine.precioUnitario,
    };
  });
}



function validateOrderPricing(params: {
  order: Pick<Orden, "subtotal" | "shippingCost" | "total">;
  expectedSubtotal: number;
}) {
  const actualSubtotal = roundCurrency(params.order.subtotal ?? 0);
  const actualShipping = roundCurrency(params.order.shippingCost ?? 0);
  const actualTotal = roundCurrency(params.order.total ?? 0);
  const expectedSubtotal = roundCurrency(params.expectedSubtotal);
  const expectedTotal = roundCurrency(actualSubtotal + actualShipping);

  if (
    actualSubtotal === expectedSubtotal &&
    actualShipping >= 0 &&
    actualTotal === expectedTotal
  ) {
    return;
  }

  throw new Error(
    `La orden backend devolvió subtotal ${formatCurrency(actualSubtotal)}, envío ${formatCurrency(actualShipping)} y total ${formatCurrency(actualTotal)}, pero el carrito esperaba subtotal ${formatCurrency(expectedSubtotal)}. Revisa el pricing antes de continuar con el pago.`,
  );
}

const shippingSchema = z.object({
  name: z.string().min(2, "Nombre es requerido"),
  telefono: z
    .string()
    .refine(
      (value) => isValidMxPhone(value),
      "El teléfono debe tener exactamente 10 dígitos",
    ),
  calle: z.string().min(2, "Calle es requerida"),
  numero: z.string().min(1, "Número es requerido"),
  numeroInterior: z.string().optional(),
  colonia: z.string().min(2, "Colonia es requerida"),
  city: z.string().min(2, "Ciudad es requerida"),
  estado: z.string().min(2, "Estado es requerido"),
  zip: z.string().regex(/^\d{5}$/, "Código postal inválido"),
  email: z.string().email("Email inválido"),
});

type ShippingValues = z.infer<typeof shippingSchema>;

type PickupCheckoutValues = {
  fulfillmentMethod: "PICKUP";
  pickupLocation: PickupLocation;
  pickupContact: PickupContact;
};

type DeliveryShippingSelection = {
  quote: FedExShippingQuote;
  selectedOption: FedExShippingOption;
  shippingSelection: ShippingSelection;
};

type CheckoutPricing = ReturnType<typeof getExpectedCheckoutPricing>;

type DeliveryCheckoutValues = ShippingValues & {
  fulfillmentMethod: "DELIVERY";
  deliveryReferences?: string;
  formattedAddress?: string;
  shippingAddress: CheckoutShippingAddress;
  addressValidationStatus?: AddressValidationStatus;
  shippingQuote?: FedExShippingQuote | null;
  shippingSelection?: DeliveryShippingSelection | null;
  checkoutPricing?: CheckoutPricing;
};

type CheckoutValues = DeliveryCheckoutValues | PickupCheckoutValues;

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

function buildFedExDireccionEnvio(
  values: ShippingValues,
  referencias?: string,
  addressValidationStatus?: AddressValidationStatus,
): FedExDireccionEnvio {
  return toLegacyDireccionEnvio(
    buildCheckoutShippingAddress(
      {
        fullName: values.name,
        phone: normalizeMxPhone(values.telefono),
        street1: `${values.calle} ${values.numero}`.trim(),
        street2: values.colonia,
        interiorNumber: values.numeroInterior,
        references: referencias,
        city: values.city,
        stateLabel: values.estado,
        postalCode: values.zip,
        countryCode: "MX",
      },
      addressValidationStatus,
    ),
  );
}

function validateDireccionEnvio(address: FedExDireccionEnvio): string[] {
  const errors: string[] = [];

  if (!address.nombre.trim()) errors.push("Captura el nombre de quien recibe.");
  if (!/^\d{10}$/.test(address.telefono)) {
    errors.push("El telefono debe tener 10 digitos.");
  }
  if (!address.calle.trim()) errors.push("Captura la calle.");
  if (!address.numero.trim()) errors.push("Captura el numero exterior.");
  if (!address.colonia.trim()) errors.push("Captura la colonia.");
  if (!address.ciudad.trim()) errors.push("Captura la ciudad.");
  if (!address.estado.trim()) errors.push("Captura el estado.");
  if (!/^\d{5}$/.test(address.codigoPostal)) {
    errors.push("El codigo postal debe tener 5 digitos.");
  }

  return errors;
}

function buildAddressValidationKey(address: FedExDireccionEnvio) {
  return [
    address.calle,
    address.numero,
    address.numeroInterior ?? "",
    address.colonia,
    address.ciudad,
    address.estado,
    address.codigoPostal,
  ]
    .map((value) => normalizeWhitespace(value).toLowerCase())
    .join("|");
}

function assertDeliveryShippingReady(values: CheckoutValues) {
  if (values.fulfillmentMethod !== "DELIVERY") {
    return;
  }

  const localErrors = validateDireccionEnvio(
    toLegacyDireccionEnvio(values.shippingAddress),
  );
  if (localErrors.length > 0) {
    throw new Error(localErrors[0]);
  }
}

function buildManualFedExShippingSelection(): DeliveryShippingSelection {
  const selectedOption: FedExShippingOption = {
    provider: "FEDEX",
    optionId: MANUAL_FEDEX_METHOD,
    serviceType: MANUAL_FEDEX_METHOD,
    serviceName: MANUAL_FEDEX_SERVICE_NAME,
    amount: MANUAL_FEDEX_SHIPPING_COST,
    currency: MANUAL_FEDEX_CURRENCY,
  };

  return {
    quote: {
      provider: "FEDEX",
      quoteId: MANUAL_FEDEX_METHOD,
      currency: MANUAL_FEDEX_CURRENCY,
      requiresShipping: true,
      options: [selectedOption],
    },
    selectedOption,
    shippingSelection: {
      method: "FEDEX",
      provider: "FEDEX",
      serviceType: MANUAL_FEDEX_METHOD,
      serviceName: MANUAL_FEDEX_SERVICE_NAME,
      carrierCode: "FEDEX",
      quotedAmount: MANUAL_FEDEX_SHIPPING_COST,
      quotedCurrency: MANUAL_FEDEX_CURRENCY,
    },
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

function getCheckoutErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "SHIPPING_RATE_CHANGED":
        return "El costo de envio no coincide con el esperado. Vuelve a confirmar tu entrega.";
      case "FEDEX_SERVICE_NOT_AVAILABLE":
        return "El envio a domicilio no esta disponible para esta direccion.";
      case "FEDEX_RATE_UNAVAILABLE":
        return "No fue posible confirmar el envio a domicilio para esta direccion.";
      case "FEDEX_SERVICE_UNAVAILABLE":
        return "El envio a domicilio no esta disponible temporalmente. Intenta nuevamente.";
      case "PRODUCT_SHIPPING_DATA_MISSING":
        return "Uno de los productos no tiene datos de envio configurados.";
      case "CHECKOUT_STOCK_UNAVAILABLE":
        return error.message || "Hay productos sin stock suficiente.";
      case "SHIPPING_ADDRESS_REQUIRED":
        return "Completa la direccion de entrega para continuar.";
      case "CHECKOUT_CART_EMPTY":
        return "Tu carrito esta vacio. Regresa al carrito para continuar.";
      default:
        if (error.status === 429) {
          return "Espera unos segundos antes de reintentar el checkout.";
        }
    }
  }

  return getApiErrorMessage(error);
}

function buildRetryDeliveryValuesFromCheckoutError(
  values: CheckoutValues,
  error: unknown,
): DeliveryCheckoutValues | null {
  void values;
  void error;
  return null;
}

function buildCheckoutPayload(
  values: CheckoutValues,
  metodoPago: PaymentMethod,
  codigoPromocion?: string,
) {
  const promoCodeField = getCheckoutPromoCodeField(codigoPromocion);
  if (values.fulfillmentMethod === "PICKUP") {
    return {
      fulfillmentMethod: "pickup" as const,
      pickupLocationId: values.pickupLocation.id,
      pickupContact: values.pickupContact,
      metodoPago,
    };
  }

  const direccionEnvio = toLegacyDireccionEnvio(values.shippingAddress);

  return {
    fulfillmentMethod: "home_delivery" as const,
    direccionEnvio,
    metodoPago,
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

function MobileCheckoutActions({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-[rgb(251_249_243_/_0.96)] py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl md:hidden">
      <div className="container flex items-center gap-3">{children}</div>
    </div>
  );
}

function OrderSummaryPanel({
  fulfillmentMethod,
  shippingSelection,
  checkoutPricing,
  pricingOfertas,
  subtotalConOfertas,
  subtotalConCodigo,
  codigoPromocion,
  descuentoCodigo,
  codigoError,
  isLoadingCodigo,
}: {
  fulfillmentMethod: FulfillmentMethod;
  shippingSelection?: DeliveryShippingSelection | null;
  checkoutPricing?: CheckoutPricing | null;
  pricingOfertas: Record<string, ProductOfferPricing>;
  subtotalConOfertas: number;
  subtotalConCodigo: number;
  codigoPromocion: string;
  descuentoCodigo: number;
  codigoError: string | null;
  isLoadingCodigo: boolean;
}) {
  const { state, totalItems } = useCart();
  const { getPersonalization } = useStorefront();
  const pricing =
    checkoutPricing && checkoutPricing.subtotal > 0
      ? checkoutPricing
      :
      getExpectedCheckoutPricing(
        subtotalConCodigo,
        fulfillmentMethod,
        shippingSelection?.selectedOption.amount ?? MANUAL_FEDEX_SHIPPING_COST,
      );

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
            const offerLine = getCartItemOfferLine(item, pricingOfertas);

            return (
              <div
                key={variantKey}
                className="flex gap-3 rounded-[1.25rem] border border-border bg-muted/45 p-3 transition-colors hover:border-primary/25 hover:bg-muted/70"
              >
                <Link
                  href={`/products/${item.id}`}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] border border-border bg-card transition hover:border-primary/35"
                  aria-label={`Ver ${item.name}`}
                >
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.id}`}
                    className="line-clamp-2 text-sm font-medium text-foreground transition hover:text-primary"
                  >
                    {item.name}
                  </Link>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(offerLine.precioUnitario)}
                    {item.tallaId || item.size
                      ? ` · ${item.tallaId ?? item.size}`
                      : ""}
                  </p>

                  {offerLine.tieneOferta ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {offerLine.offerLabel}
                    </p>
                  ) : null}

                  {personalization ? (
                    <p className="mt-1 text-xs text-primary/78">
                      Personalización UI: {personalization.name} ·{" "}
                      {personalization.number}
                    </p>
                  ) : null}
                </div>

                <div className="text-right">
                  {offerLine.tieneOferta ? (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(offerLine.subtotalOriginal)}
                    </p>
                  ) : null}

                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(offerLine.totalItem)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotalConOfertas)}</span>
          </div>

          {isLoadingCodigo ? (
            <div className="flex items-center justify-between text-primary">
              <span>Validando código</span>
              <span>...</span>
            </div>
          ) : null}

          {codigoPromocion && descuentoCodigo > 0 ? (
            <div className="flex items-center justify-between text-primary">
              <span>Código {codigoPromocion}</span>
              <span>-{formatCurrency(descuentoCodigo)}</span>
            </div>
          ) : null}

          {codigoError ? (
            <div className="rounded-[1rem] border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {codigoError}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span>
              {fulfillmentMethod === "PICKUP" ? "Recoger en tienda" : "Envio FedEx manual"}
            </span>
            <span>
              {fulfillmentMethod === "PICKUP"
                ? "Sin costo"
                : formatCurrency(pricing.shipping)}
            </span>
          </div>
          {fulfillmentMethod === "DELIVERY" ? (
            <div className="flex items-center justify-between gap-3">
              <span>Mensajería</span>
              <span className="text-right">
                {shippingSelection?.selectedOption.serviceName ??
                  MANUAL_FEDEX_SERVICE_NAME}
              </span>
            </div>
          ) : null}
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
      </CardContent>
    </Card>
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
        description: "Compra en línea y recoge en sucursal",
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

      {value === "DELIVERY" ? (
        <div className="rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <p className="font-semibold text-foreground">
            Costo de envío: {formatCurrency(MANUAL_FEDEX_SHIPPING_COST)} MXN
          </p>
          <p className="mt-1">
            El envío se procesa manualmente por paquetería. La guía de rastreo
            estará disponible cuando el pedido sea entregado a FedEx.
          </p>
        </div>
      ) : (
        <div className="rounded-[1.2rem] border border-border bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <p className="font-semibold text-foreground">
            Sin costo de envío
          </p>
          <p className="mt-1">
            Recibirás un aviso cuando tu pedido esté listo para recoger en la
            sucursal.
          </p>
        </div>
      )}
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
  cartSignature,
  initialDeliveryValues,
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
  cartSignature: string;
  initialDeliveryValues?: DeliveryCheckoutValues | null;
  onContinue: (values: CheckoutValues) => void;
}) {
  const { toast } = useToast();
  const [addressError, setAddressError] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [deliveryReferences, setDeliveryReferences] = useState("");
  const [, setShippingQuote] = useState<FedExShippingQuote | null>(null);
  const [, setShippingOptions] = useState<FedExShippingOption[]>([]);
  const [, setSelectedShippingOptionId] = useState("");
  const [, setSelectedShipping] =
    useState<DeliveryShippingSelection | null>(null);
  const [, setCheckoutPricing] = useState<CheckoutPricing | null>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isGoogleUnavailable, setIsGoogleUnavailable] = useState(false);
  const [googleAutocompleteMessage, setGoogleAutocompleteMessage] =
    useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const isLoadingShippingOptions = false;
  const isRecalculatingCheckout = false;
  const [shippingWarnings, setShippingWarnings] = useState<string[]>([]);
  const [formattedAddress, setFormattedAddress] = useState("");
  const [addressValidationStatus, setAddressValidationStatus] =
    useState<AddressValidationStatus>("NOT_VALIDATED");
  const [isValidatingPostal, setIsValidatingPostal] = useState(false);
  const [postalValidationMessage, setPostalValidationMessage] =
    useState<string | null>(null);
  const [postalValidated, setPostalValidated] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidationMessages, setAddressValidationMessages] = useState<
    string[]
  >([]);
  const [suggestedShippingValues, setSuggestedShippingValues] =
    useState<ShippingValues | null>(null);
  const [hasPendingSuggestion, setHasPendingSuggestion] = useState(false);
  const [lastQuotedAddressKey, setLastQuotedAddressKey] = useState<string | null>(
    null,
  );

  const watchedName = form.watch("name");
  const watchedTelefono = form.watch("telefono");
  const watchedCalle = form.watch("calle");
  const watchedNumero = form.watch("numero");
  const watchedNumeroInterior = form.watch("numeroInterior");
  const watchedColonia = form.watch("colonia");
  const watchedCity = form.watch("city");
  const watchedEstado = form.watch("estado");
  const watchedZip = form.watch("zip");
  const currentAddressKey = buildAddressValidationKey(
    buildFedExDireccionEnvio(
      {
        name: watchedName,
        telefono: watchedTelefono,
        calle: watchedCalle,
        numero: watchedNumero,
        numeroInterior: watchedNumeroInterior,
        colonia: watchedColonia,
        city: watchedCity,
        estado: watchedEstado,
        zip: watchedZip,
        email: form.getValues("email"),
      },
      deliveryReferences,
      addressValidationStatus,
    ),
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setShippingQuote(null);
    setShippingOptions([]);
    setSelectedShipping(null);
    setCheckoutPricing(null);
    setSelectedShippingOptionId("");
    setAddressValidationStatus("NOT_VALIDATED");
    setShippingWarnings([]);
    setPostalValidationMessage(null);
    setPostalValidated(false);
    setAddressValidationMessages([]);
    setSuggestedShippingValues(null);
    setHasPendingSuggestion(false);
    setFormattedAddress("");
    setLastQuotedAddressKey(null);
    setShippingError(null);
  }, [cartSignature]);

  useEffect(() => {
    if (!initialDeliveryValues || fulfillmentMethod !== "DELIVERY") {
      return;
    }

    form.reset(
      {
        name: initialDeliveryValues.name,
        telefono: initialDeliveryValues.telefono,
        calle: initialDeliveryValues.calle,
        numero: initialDeliveryValues.numero,
        numeroInterior: initialDeliveryValues.numeroInterior ?? "",
        colonia: initialDeliveryValues.colonia,
        city: initialDeliveryValues.city,
        estado: initialDeliveryValues.estado,
        zip: initialDeliveryValues.zip,
        email: initialDeliveryValues.email,
      },
      { keepErrors: false, keepTouched: true, keepDirty: true },
    );
    setDeliveryReferences(initialDeliveryValues.deliveryReferences ?? "");
    setFormattedAddress(initialDeliveryValues.formattedAddress ?? "");
    setShippingQuote(
      initialDeliveryValues.shippingQuote ??
      initialDeliveryValues.shippingSelection?.quote ??
      null,
    );
    setShippingOptions(
      initialDeliveryValues.shippingQuote?.options ??
      initialDeliveryValues.shippingSelection?.quote.options ??
      [],
    );
    setSelectedShippingOptionId(
      initialDeliveryValues.shippingSelection?.selectedOption.optionId ??
      initialDeliveryValues.shippingSelection?.selectedOption.serviceType ??
      "",
    );
    setSelectedShipping(initialDeliveryValues.shippingSelection ?? null);
    setAddressValidationStatus(
      initialDeliveryValues.addressValidationStatus ?? "NOT_VALIDATED",
    );
    setCheckoutPricing(initialDeliveryValues.checkoutPricing ?? null);
    setPostalValidated(
      initialDeliveryValues.addressValidationStatus === "VALIDATED" ||
      initialDeliveryValues.addressValidationStatus === "USER_CONFIRMED",
    );
    if (
      initialDeliveryValues.shippingSelection?.quote ||
      initialDeliveryValues.shippingQuote
    ) {
      setLastQuotedAddressKey(
        buildAddressValidationKey(
          buildFedExDireccionEnvio(
            initialDeliveryValues,
            initialDeliveryValues.deliveryReferences,
            initialDeliveryValues.addressValidationStatus,
          ),
        ),
      );
    }
  }, [form, fulfillmentMethod, initialDeliveryValues]);

  useEffect(() => {
    if (!lastQuotedAddressKey || currentAddressKey === lastQuotedAddressKey) {
      return;
    }

    setShippingQuote(null);
    setShippingOptions([]);
    setSelectedShippingOptionId("");
    setSelectedShipping(null);
    setCheckoutPricing(null);
    setShippingWarnings([]);
    setLastQuotedAddressKey(null);
    setShippingError(null);
  }, [currentAddressKey, lastQuotedAddressKey]);

  useEffect(() => {
    if (fulfillmentMethod !== "DELIVERY") {
      return;
    }

    const postalCode = normalizeWhitespace(watchedZip);
    setIsValidatingPostal(false);
    setPostalValidated(/^\d{5}$/.test(postalCode));
    setPostalValidationMessage(null);
  }, [fulfillmentMethod, watchedZip]);

  useEffect(() => {
    if (fulfillmentMethod !== "DELIVERY") {
      return;
    }

    setIsValidatingAddress(false);
    setAddressValidationMessages([]);
    setSuggestedShippingValues(null);
    setHasPendingSuggestion(false);
  }, [
    deliveryReferences,
    form,
    fulfillmentMethod,
    watchedCalle,
    watchedCity,
    watchedColonia,
    watchedEstado,
    watchedName,
    watchedNumero,
    watchedNumeroInterior,
    watchedTelefono,
    watchedZip,
  ]);

  const resetDeliveryQuoteState = () => {
    setShippingQuote(null);
    setShippingOptions([]);
    setSelectedShippingOptionId("");
    setSelectedShipping(null);
    setCheckoutPricing(null);
    setShippingWarnings([]);
    setShippingError(null);
    setLastQuotedAddressKey(null);
  };

  const handleGooglePlacesReady = () => {
    setIsGoogleReady(true);
    setIsGoogleUnavailable(false);
    setGoogleAutocompleteMessage(null);
  };

  const handleGooglePlacesUnavailable = (message: string) => {
    setIsGoogleReady(false);
    setIsGoogleUnavailable(true);
    setGoogleAutocompleteMessage(message);
  };

  const buildCurrentShippingAddress = (
    values: ShippingValues,
    nextValidationStatus = addressValidationStatus,
  ) =>
    buildCheckoutShippingAddress(
      {
        fullName: values.name,
        phone: normalizeMxPhone(values.telefono),
        street1: `${values.calle} ${values.numero}`.trim(),
        street2: values.colonia,
        interiorNumber: values.numeroInterior,
        references: deliveryReferences,
        city: values.city,
        stateLabel: values.estado,
        postalCode: values.zip,
        countryCode: "MX",
        formattedAddress,
      },
      nextValidationStatus,
    );

  const handleGoogleAddressSelected = (address: ParsedGoogleCheckoutAddress) => {
    setIsLoadingAddress(true);
    setAddressError(null);
    setShippingError(null);
    setGoogleAutocompleteMessage(null);
    setAddressValidationStatus("NOT_VALIDATED");
    setSuggestedShippingValues(null);
    setHasPendingSuggestion(false);
    resetDeliveryQuoteState();

    const { calle, numero } = splitStreetAndNumber(address.street1 ?? "");
    form.reset(
      {
        ...form.getValues(),
        calle: calle || form.getValues("calle"),
        numero: numero === "S/N" ? form.getValues("numero") : numero,
        colonia: address.street2 || form.getValues("colonia"),
        city: address.city || form.getValues("city"),
        estado: address.stateLabel || form.getValues("estado"),
        zip: address.postalCode || form.getValues("zip"),
      },
      {
        keepErrors: false,
        keepDirty: true,
        keepTouched: true,
      },
    );
    setFormattedAddress(address.formattedAddress ?? "");
    setIsLoadingAddress(false);
  };

  const handleApplySuggestedAddress = () => {
    if (!suggestedShippingValues) {
      return;
    }

    form.reset(
      {
        ...form.getValues(),
        ...suggestedShippingValues,
      },
      { keepErrors: false, keepTouched: true, keepDirty: true },
    );
    setSuggestedShippingValues(null);
    setHasPendingSuggestion(false);
    setAddressValidationStatus("VALIDATED");
    resetDeliveryQuoteState();
  };

  const handleKeepOriginalAddress = () => {
    setSuggestedShippingValues(null);
    setHasPendingSuggestion(false);
    setAddressValidationStatus("USER_CONFIRMED");
    resetDeliveryQuoteState();
  };

  const handleContinue = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Sesión requerida",
        description: "Debes iniciar sesión para completar el pago.",
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

    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }

    const shippingValues = form.getValues();
    const direccionEnvio = buildFedExDireccionEnvio(
      shippingValues,
      deliveryReferences,
      addressValidationStatus,
    );
    const localErrors = validateDireccionEnvio(direccionEnvio);
    if (localErrors.length > 0) {
      setAddressError(localErrors[0]);
      return;
    }

    const nextSelection = buildManualFedExShippingSelection();
    const nextPricing = getExpectedCheckoutPricing(
      0,
      "DELIVERY",
      MANUAL_FEDEX_SHIPPING_COST,
    );
    const nextAddressValidationStatus: AddressValidationStatus = "USER_CONFIRMED";
    const currentShippingAddress = buildCurrentShippingAddress(
      shippingValues,
      nextAddressValidationStatus,
    );

    setAddressValidationStatus(nextAddressValidationStatus);
    setShippingQuote(nextSelection.quote);
    setShippingOptions([nextSelection.selectedOption]);
    setSelectedShippingOptionId(MANUAL_FEDEX_METHOD);
    setSelectedShipping(nextSelection);
    setCheckoutPricing(nextPricing);
    setShippingWarnings([]);
    setAddressError(null);
    setShippingError(null);
    setLastQuotedAddressKey(currentAddressKey);

    onContinue({
      ...shippingValues,
      fulfillmentMethod: "DELIVERY",
      formattedAddress,
      deliveryReferences,
      shippingAddress: currentShippingAddress,
      addressValidationStatus: nextAddressValidationStatus,
      shippingQuote: nextSelection.quote,
      shippingSelection: nextSelection,
      checkoutPricing: nextPricing,
    });
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
                  setAddressValidationStatus("NOT_VALIDATED");
                  setPostalValidated(false);
                  setPostalValidationMessage(null);
                  setAddressValidationMessages([]);
                  setSuggestedShippingValues(null);
                  setHasPendingSuggestion(false);
                  resetDeliveryQuoteState();
                  onFulfillmentMethodChange(value);
                }}
              />

              {fulfillmentMethod === "DELIVERY" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel>Buscar dirección</FormLabel>
                    <div
                      className={cn(
                        "rounded-[1.5rem] border bg-muted/45 p-4 transition-colors",
                        isGoogleUnavailable
                          ? "border-border/70 bg-muted/30"
                          : addressError
                            ? "border-destructive"
                            : "border-border",
                      )}
                    >
                      {isGoogleUnavailable ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                          El autocompletado no esta disponible en este ambiente.
                          Captura tu direccion manualmente en los campos de abajo.
                        </p>
                      ) : (
                        <GooglePlaceAutocompleteElement
                          onAddressSelected={handleGoogleAddressSelected}
                          onReady={handleGooglePlacesReady}
                          onError={handleGooglePlacesUnavailable}
                        />
                      )}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {isGoogleUnavailable
                        ? "Google Places no esta disponible. Puedes continuar con captura manual."
                        : isGoogleReady
                          ? "Google completa la direccion; revisa los campos antes de continuar."
                          : "Cargando autocompletado de Google Places..."}
                    </p>
                    {googleAutocompleteMessage ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {googleAutocompleteMessage}
                      </p>
                    ) : null}
                    {formattedAddress ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        Direccion encontrada: {formattedAddress}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
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
                    <FormField
                      control={form.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 rounded-[1rem]" inputMode="tel" autoComplete="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 rounded-[1rem]" type="email" autoComplete="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="calle"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Calle</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 rounded-[1rem]" autoComplete="address-line1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número exterior</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 rounded-[1rem]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numeroInterior"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número interior</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="h-12 rounded-[1rem]" placeholder="Opcional" autoComplete="address-line2" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="colonia"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Colonia</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 rounded-[1rem]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ciudad</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 rounded-[1rem]" autoComplete="address-level2" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MX_STATES.map((state) => (
                                <SelectItem key={state.fedexCode} value={state.label}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código postal</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 rounded-[1rem]" inputMode="numeric" autoComplete="postal-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {addressError ? (
                    <p className="text-sm font-medium text-destructive">{addressError}</p>
                  ) : null}
                  {shippingError ? (
                    <p className="text-sm font-medium text-destructive">{shippingError}</p>
                  ) : null}
                  {isLoadingAddress || isValidatingPostal || isValidatingAddress ? (
                    <div className="rounded-[1rem] border border-border bg-muted/35 px-4 py-3 text-xs leading-5 text-muted-foreground">
                      {isLoadingAddress
                        ? "Actualizando formulario con la direccion seleccionada..."
                        : isValidatingPostal
                          ? "Validando codigo postal con FedEx..."
                          : "Validando direccion con FedEx..."}
                    </div>
                  ) : null}
                  {postalValidationMessage ? (
                    <div
                      className={cn(
                        "rounded-[1rem] border px-4 py-3 text-xs leading-5",
                        postalValidated
                          ? "border-primary/25 bg-primary/8 text-primary"
                          : "border-destructive/25 bg-destructive/8 text-destructive",
                      )}
                    >
                      {postalValidationMessage}
                    </div>
                  ) : null}
                  {addressValidationMessages.length > 0 ? (
                    <div className="rounded-[1rem] border border-border bg-muted/35 px-4 py-3 text-xs leading-5 text-muted-foreground">
                      {addressValidationMessages.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  ) : null}
                  {hasPendingSuggestion && suggestedShippingValues ? (
                    <div className="space-y-3 rounded-[1.2rem] border border-primary/25 bg-primary/8 p-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          FedEx sugiere ajustar tu direccion
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Sugerencia:{" "}
                          {[
                            suggestedShippingValues.calle,
                            suggestedShippingValues.numero,
                            suggestedShippingValues.numeroInterior,
                            suggestedShippingValues.colonia,
                            suggestedShippingValues.city,
                            suggestedShippingValues.estado,
                            suggestedShippingValues.zip,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Button type="button" className="h-11 rounded-full" onClick={handleApplySuggestedAddress}>
                          Usar sugerencia FedEx
                        </Button>
                        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={handleKeepOriginalAddress}>
                          Continuar con mi direccion
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {shippingWarnings.length > 0 ? (
                    <div className="rounded-[1rem] border border-border bg-muted/35 px-4 py-3 text-xs leading-5 text-muted-foreground">
                      {shippingWarnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="rounded-[1.4rem] border border-primary/25 bg-primary/8 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Truck className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Envio a domicilio FedEx manual
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            El costo es fijo. La guía y el seguimiento se preparan manualmente después de confirmar el pago.
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(MANUAL_FEDEX_SHIPPING_COST)}
                      </p>
                    </div>
                  </div>
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
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setVisible(!visible);
                      }}
                      className={cn(
                        "group relative flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300",
                        "border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40",
                        "hover:shadow-[0_8px_24px_-12px_rgba(7,58,38,0.3)]",
                        "active:scale-[0.98]",
                        visible
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary"
                      )}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {visible ? (
                          <>
                            <svg
                              className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Ocultar mapa
                          </>
                        ) : (
                          <>
                            <svg
                              className="h-4 w-4 transition-transform duration-300 group-hover:scale-110"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Mostrar mapa
                          </>
                        )}
                      </span>
                      {/* Efecto de brillo al hover */}
                      <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-500 ease-in-out",
                        visible ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="overflow-hidden rounded-[1.2rem] border border-border bg-muted/30 p-1">
                        <div className="relative w-full aspect-video min-h-[120px] md:min-h-[200px]">
                          <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7443.8102161839015!2d-101.6572609!3d21.116349000000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x842bbe55bb311815%3A0xe91c2a286e55a187!2sLa%20Guarida%20del%20Le%C3%B3n!5e0!3m2!1ses-419!2smx!4v1782330207653!5m2!1ses-419!2smx"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            className="absolute inset-0 h-full w-full rounded-[1rem]"
                          />
                        </div>
                      </div>
                    </div>
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
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="hidden md:mt-5 md:block">
        <Button
          className="h-12 rounded-full px-6"
          onClick={() => void handleContinue()}
          disabled={isLoadingShippingOptions || isRecalculatingCheckout}
        >
          {isLoadingShippingOptions || isRecalculatingCheckout
            ? "Preparando..."
            : "Continuar a pago"}
        </Button>
      </div>

      <MobileCheckoutActions>
        <Button
          className="h-12 w-full rounded-full"
          onClick={() => void handleContinue()}
          disabled={isLoadingShippingOptions || isRecalculatingCheckout}
        >
          {isLoadingShippingOptions || isRecalculatingCheckout
            ? "Preparando..."
            : "Continuar a pago"}
        </Button>
      </MobileCheckoutActions>
    </>
  );
}

const ACCEPTED_PAYMENT_BRANDS = [
  { name: "Visa", src: "/images/iconosdepagos/visa.svg" },
  { name: "Mastercard", src: "/images/iconosdepagos/mastercard.svg" },
  { name: "American Express", src: "/images/iconosdepagos/AmericanExpress.svg" },
  { name: "Apple Pay", src: "/images/iconosdepagos/ApplePay.svg" },
  { name: "Google Pay", src: "/images/iconosdepagos/GooglePay.svg" },
] as const;

const PAYMENT_REASSURANCES = [
  {
    icon: CreditCard,
    title: "No guardamos tu tarjeta",
    description: "Stripe procesa el cobro; la tienda nunca ve tus datos bancarios.",
  },
] as const;

function CardPaymentStep({
  values,
  cartId,
  cartItems,
  total,
  expectedSubtotal,
  codigoPromocion,
  onBack,
  onRecoverableDeliveryError,
  stripePromise,
}: {
  values: CheckoutValues;
  cartId?: string;
  cartItems: CartItem[];
  total: number;
  expectedSubtotal: number;
  codigoPromocion?: string;
  onBack: () => void;
  onRecoverableDeliveryError: (values: DeliveryCheckoutValues) => void;
  stripePromise: ReturnType<typeof useStripeConfig>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [embeddedClientSecret, setEmbeddedClientSecret] = useState<string | null>(null);
  const [orderContext, setOrderContext] = useState<{
    attemptId: string;
    total: number;
    pagoId?: string;
  } | null>(null);

  const handlePrepareEmbeddedCheckout = async () => {
    if (isProcessing || typeof window === "undefined") {
      return;
    }

    if (!stripePromise) {
      toast({
        variant: "destructive",
        title: "Stripe no está listo",
        description: "Intenta nuevamente en unos segundos.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      assertDeliveryShippingReady(values);


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

      const attempt = await startCheckoutAttempt({
        ...buildCheckoutPayload(values, "TARJETA", codigoPromocion),
        successUrl: `${window.location.origin}/checkout/confirmation?attemptId={CHECKOUT_ATTEMPT_ID}&session_id={CHECKOUT_SESSION_ID}&status=processing&total=${encodeURIComponent(total.toFixed(2))}`,
        cancelUrl: `${window.location.origin}/checkout`,
      });

      if (!attempt.attemptId || !attempt.clientSecret) {
        throw new Error("No se recibió un intento de checkout válido");
      }

      setOrderContext({
        attemptId: attempt.attemptId,
        total: attempt.total ?? total,
        pagoId: attempt.pagoId,
      });
      setEmbeddedClientSecret(attempt.clientSecret);
    } catch (error) {
      const retryValues = buildRetryDeliveryValuesFromCheckoutError(
        values,
        error,
      );
      if (retryValues) {
        onRecoverableDeliveryError(retryValues);
      }
      toast({
        variant: "destructive",
        title: "No se pudo preparar el pago",
        description: getCheckoutErrorMessage(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                  Paso 2 · Pago
                </p>
                <CardTitle className="mt-0.5 leading-none">Pago seguro</CardTitle>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {embeddedClientSecret ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-[1.4rem] border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-primary">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Completa tu pago abajo. Stripe valida el total final con el
                  backend. Tu pedido se creará cuando el pago quede confirmado.
                </p>
              </div>
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret: embeddedClientSecret }}
              >
                <div className="rounded-[1.5rem] border border-border bg-card p-2">
                  <EmbeddedCheckout />
                </div>
              </EmbeddedCheckoutProvider>
            </div>
          ) : (
            <>
              <div className="relative overflow-hidden rounded-[1.6rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(7,58,38,0.06),rgba(246,248,243,0.6))] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-card text-primary">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      Paga con tarjeta vía Stripe
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  {ACCEPTED_PAYMENT_BRANDS.map((brand) => (
                    <div
                      key={brand.name}
                      className="flex h-9 items-center justify-center rounded-xl border border-black/6 bg-white/95 px-2.5 shadow-[0_8px_24px_-22px_rgb(8_12_10_/_0.4)]"
                    >
                      <Image
                        src={brand.src}
                        alt={brand.name}
                        width={56}
                        height={22}
                        className="h-5 w-auto object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-border bg-muted/45 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Total a pagar
                  </p>
                  <p className="mt-1 font-headline text-3xl font-semibold uppercase leading-none tracking-[0.02em]">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>

              <ul className="grid gap-2.5">
                {PAYMENT_REASSURANCES.map((item) => (
                  <li
                    key={item.title}
                    className="flex items-start gap-3 rounded-[1.2rem] border border-border/70 bg-card px-4 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/8 text-primary">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="hidden gap-3 md:flex">
            <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={onBack}>
              Volver
            </Button>
            {embeddedClientSecret ? (
              <Button
                type="button"
                className="h-12 flex-1 rounded-full"
                onClick={() =>
                  router.push(
                    `/checkout/confirmation?attemptId=${encodeURIComponent(orderContext?.attemptId ?? "")}&status=processing`,
                  )
                }
              >
                Ver estado del pedido
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 flex-1 gap-2 rounded-full"
                onClick={() => void handlePrepareEmbeddedCheckout()}
                disabled={isProcessing || !stripePromise}
              >
                <Lock className="h-4 w-4" />
                {isProcessing ? "Preparando pago seguro..." : `Pagar ${formatCurrency(total)}`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <MobileCheckoutActions>
        <Button type="button" variant="outline" className="h-12 flex-1 rounded-full" onClick={onBack}>
          Volver
        </Button>
        {embeddedClientSecret ? (
          <Button
            type="button"
            className="h-12 flex-1 rounded-full"
            onClick={() =>
              router.push(
                `/checkout/confirmation?attemptId=${encodeURIComponent(orderContext?.attemptId ?? "")}&status=processing`,
              )
            }
          >
            Ver estado
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 flex-1 gap-2 rounded-full"
            onClick={() => void handlePrepareEmbeddedCheckout()}
            disabled={isProcessing || !stripePromise}
          >
            <Lock className="h-4 w-4" />
            {isProcessing ? "Preparando..." : `Pagar ${formatCurrency(total)}`}
          </Button>
        )}
      </MobileCheckoutActions>
    </>
  );
}
export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(0);
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
  const router = useRouter();
  const { state, subtotal, totalItems, isLoading } = useCart();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const stripePromise = useStripeConfig();
  const [pricingOfertas, setPricingOfertas] = useState<
    Record<string, ProductOfferPricing>
  >({});
  const [codigoPromocion, setCodigoPromocion] = useState("");
  const [resultadoCodigo, setResultadoCodigo] =
    useState<ResultadoCodigoPromocionCarrito | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(null);
  const [isLoadingCodigo, setIsLoadingCodigo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedCode = localStorage.getItem(PROMO_CODE_STORAGE_KEY);

    if (storedCode?.trim()) {
      setCodigoPromocion(storedCode.trim().toUpperCase());
    }
  }, []);

  const offerItemsKey = useMemo(() => {
    return state.items
      .map((item) => `${item.id}:${item.tallaId ?? item.size ?? ""}:${item.quantity}`)
      .join("|");
  }, [state.items]);

  useEffect(() => {
    let cancelled = false;

    async function cargarOfertasCheckout() {
      if (state.items.length === 0) {
        setPricingOfertas({});
        return;
      }

      const precios = await calcularPreciosOfertasPublicas(
        buildCartOfferPricingItems(state.items),
      );

      if (!cancelled) {
        setPricingOfertas(precios);
      }
    }

    cargarOfertasCheckout();

    return () => {
      cancelled = true;
    };
  }, [offerItemsKey, state.items]);

  const cartItemsConOfertas = useMemo(() => {
    return buildCartItemsWithOfferPrices(state.items, pricingOfertas);
  }, [state.items, pricingOfertas]);

  const subtotalConOfertas = useMemo(() => {
    return cartItemsConOfertas.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }, [cartItemsConOfertas]);

  const carritoTieneOfertas = useMemo(() => {
    return state.items.some((item) => {
      const offerLine = getCartItemOfferLine(item, pricingOfertas);
      return offerLine.tieneOferta;
    });
  }, [state.items, pricingOfertas]);

  const codigoItems = useMemo<ValidarCodigoPromocionCarritoItem[]>(() => {
    return state.items.reduce<ValidarCodigoPromocionCarritoItem[]>(
      (itemsElegibles, item) => {
        const offerLine = getCartItemOfferLine(item, pricingOfertas);

        if (offerLine.tieneOferta) {
          return itemsElegibles;
        }

        itemsElegibles.push({
          productoId: item.id,
          cantidad: item.quantity,
          precioUnitario: offerLine.precioUnitario,
          tallaId: item.tallaId ?? item.size ?? null,
          categoriaIds: getStringArrayFromCartItem(item, [
            "categoriaIds",
            "categoriasIds",
            "categoryIds",
          ]),
          lineaIds: getStringArrayFromCartItem(item, [
            "lineaIds",
            "lineasIds",
            "lineIds",
          ]),
        });

        return itemsElegibles;
      },
      [],
    );
  }, [state.items, pricingOfertas]);

  useEffect(() => {
    if (!carritoTieneOfertas) {
      return;
    }

    setCodigoPromocion("");
    setResultadoCodigo(null);
    setCodigoError(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
    }
  }, [carritoTieneOfertas]);

  useEffect(() => {
    let cancelled = false;

    async function validarCodigoCheckout() {
      const codigo = codigoPromocion.trim().toUpperCase();

      if (carritoTieneOfertas || !codigo || codigoItems.length === 0) {
        setResultadoCodigo(null);
        setCodigoError(null);
        return;
      }

      try {
        setIsLoadingCodigo(true);
        setCodigoError(null);

        const resultado = await validarCodigoPromocionCarrito({
          codigo,
          items: codigoItems,
        });

        const descuento = Number(resultado.descuentoTotal || 0);
        const subtotalFinal = Number(resultado.subtotalFinal || 0);

        const codigoValido =
          resultado.valido !== false &&
          descuento > 0 &&
          subtotalFinal > 0 &&
          subtotalFinal < subtotalConOfertas;

        if (cancelled) {
          return;
        }

        if (!codigoValido) {
          setResultadoCodigo(null);
          setCodigoError(
            resultado.mensaje || "El código no aplica para este carrito.",
          );
          return;
        }

        setResultadoCodigo(resultado);
        setCodigoError(null);
      } catch (error) {
        console.error("Failed to validate checkout promo code", error);

        if (!cancelled) {
          setResultadoCodigo(null);
          setCodigoError("No se pudo validar el código promocional.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCodigo(false);
        }
      }
    }

    void validarCodigoCheckout();

    return () => {
      cancelled = true;
    };
  }, [codigoPromocion, codigoItems, subtotalConOfertas, carritoTieneOfertas]);

  const descuentoCodigo = Math.max(
    0,
    Number(resultadoCodigo?.descuentoTotal || 0),
  );

  const subtotalFinalCodigo = Number(resultadoCodigo?.subtotalFinal);

  const subtotalConCodigo =
    resultadoCodigo && descuentoCodigo > 0 && Number.isFinite(subtotalFinalCodigo)
      ? roundCurrency(subtotalFinalCodigo)
      : roundCurrency(subtotalConOfertas);

  const codigoPromocionAplicado =
    resultadoCodigo && descuentoCodigo > 0 ? codigoPromocion : "";


  // Validación: verificar que el perfil esté completo antes de continuar
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user && !user.perfilCompleto) {
      router.replace("/complete-profile");
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const shippingForm = useForm<ShippingValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      name: "",
      telefono: "",
      calle: "",
      numero: "",
      numeroInterior: "",
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
    () =>
      getExpectedCheckoutPricing(
        subtotal,
        fulfillmentMethod,
        checkoutValues?.fulfillmentMethod === "DELIVERY"
          ? (checkoutValues.shippingSelection?.selectedOption.amount ??
            MANUAL_FEDEX_SHIPPING_COST)
          : 0,
      ),
    [checkoutValues, fulfillmentMethod, subtotal],
  );
  const cartSignature = useMemo(
    () =>
      state.items
        .map(
          (item) =>
            `${item.id}:${item.tallaId ?? item.size ?? ""}:${item.quantity}`,
        )
        .sort()
        .join("|"),
    [state.items],
  );
  const total = pricing.total;

  const activeCheckoutValues =
    checkoutValues ??
    ({
      ...shippingForm.getValues(),
      fulfillmentMethod: "DELIVERY",
      shippingAddress: buildCheckoutShippingAddress(
        {
          fullName: shippingForm.getValues("name"),
          phone: normalizeMxPhone(shippingForm.getValues("telefono")),
          street1: `${shippingForm.getValues("calle")} ${shippingForm.getValues("numero")}`.trim(),
          street2: shippingForm.getValues("colonia"),
          interiorNumber: shippingForm.getValues("numeroInterior"),
          city: shippingForm.getValues("city"),
          stateLabel: shippingForm.getValues("estado"),
          postalCode: shippingForm.getValues("zip"),
          countryCode: "MX",
        },
        "USER_CONFIRMED",
      ),
      addressValidationStatus: "USER_CONFIRMED",
      shippingQuote: buildManualFedExShippingSelection().quote,
      shippingSelection: buildManualFedExShippingSelection(),
      checkoutPricing: getExpectedCheckoutPricing(
        subtotal,
        "DELIVERY",
        MANUAL_FEDEX_SHIPPING_COST,
      ),
    } as DeliveryCheckoutValues);
  const handleRecoverableDeliveryError = (
    nextValues: DeliveryCheckoutValues,
  ) => {
    setCheckoutValues(nextValues);
    setFulfillmentMethod("DELIVERY");
    setCurrentStep(0);
  };

  if (isLoading) {
    return <div className="container py-14 text-center text-muted-foreground">Cargando pago...</div>;
  }

  if (totalItems === 0) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Carrito vacío"
          description="Necesitas al menos un producto antes de continuar al pago."
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
            { label: "Pago" },
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
              Pago
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
              cartSignature={cartSignature}
              initialDeliveryValues={
                checkoutValues?.fulfillmentMethod === "DELIVERY"
                  ? checkoutValues
                  : null
              }
              onSelectedPickupLocationIdChange={setSelectedPickupLocationId}
              onPickupContactChange={setPickupContact}
              isAuthenticated={isAuthenticated}
              onContinue={(values) => {
                setCheckoutValues(values);
                setCurrentStep(1);
              }}
            />
          ) : stripePromise ? (
            <CardPaymentStep
              values={activeCheckoutValues}
              cartId={state.id}
              cartItems={state.items}
              total={total}
              expectedSubtotal={subtotalConCodigo}
              codigoPromocion={codigoPromocion}
              onBack={() => setCurrentStep(0)}
              onRecoverableDeliveryError={handleRecoverableDeliveryError}
              stripePromise={stripePromise}
            />
          ) : (
            <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle>Pago no disponible</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  No pudimos inicializar el pago seguro en este momento. Recarga
                  la página o inténtalo de nuevo en unos segundos.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-full"
                  onClick={() => setCurrentStep(0)}
                >
                  Volver a entrega
                </Button>
              </CardContent>
            </Card>
          )}

          <PaymentMethodStrip
            className="mt-6"
            title="Métodos de pago disponibles"
            description="Aceptamos tarjetas, SPEI y billeteras digitales para el cierre del pago, elige el que mejor te convenga"
          />
        </div>

        <div className="lg:sticky lg:top-[calc(var(--storefront-header-current-height,var(--storefront-header-desktop-height))+1.5rem)]">
          <OrderSummaryPanel
            fulfillmentMethod={fulfillmentMethod}
            shippingSelection={
              checkoutValues?.fulfillmentMethod === "DELIVERY"
                ? checkoutValues.shippingSelection
                : null
            }
            checkoutPricing={
              checkoutValues?.fulfillmentMethod === "DELIVERY"
                ? checkoutValues.checkoutPricing
                : null
            }
            pricingOfertas={pricingOfertas}
            subtotalConOfertas={subtotalConOfertas}
            subtotalConCodigo={subtotalConCodigo}
            codigoPromocion={codigoPromocionAplicado}
            descuentoCodigo={descuentoCodigo}
            codigoError={codigoError}
            isLoadingCodigo={isLoadingCodigo}
          />
        </div>
      </div>

    </div>
  );
}