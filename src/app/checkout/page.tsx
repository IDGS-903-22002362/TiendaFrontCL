"use client";

import Image from "next/image";
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
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useStorefront } from "@/hooks/use-storefront";
import { ApiError } from "@/lib/api/client";
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
  buildFedExQuotePayload,
  fedexApi,
  getMexicoStateLabelFromFedExCode,
  normalizeFedExShippingOption,
  normalizeFedExShippingQuote,
  toFedexRecipient,
  type FedExDireccionEnvio,
} from "@/lib/api/fedex";
import {
  getAplazoPaymentErrorMessage,
  getApiErrorMessage,
} from "@/lib/api/errors";
import {
  buildCheckoutShippingAddress,
  buildCheckoutShippingSelection,
  toLegacyDireccionEnvio,
} from "@/lib/checkout/shipping";
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
import { MX_STATES } from "@/lib/shipping/mx-states";
import type {
  AddressValidationStatus,
  AplazoOnlineCreatePayload,
  CartItem,
  FedExAddressValidation,
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
  shippingAmount = 0,
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
      (value) => isValidMxPhoneForAplazo(value),
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

function buildFedExDireccionEnvio(
  values: ShippingValues,
  referencias?: string,
  addressValidationStatus?: AddressValidationStatus,
): FedExDireccionEnvio {
  return toLegacyDireccionEnvio(
    buildCheckoutShippingAddress(
      {
        fullName: values.name,
        phone: normalizeMxPhoneForAplazo(values.telefono),
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

function isDireccionValidatable(address: FedExDireccionEnvio) {
  return validateDireccionEnvio(address).length === 0;
}

function parseResolvedAddress(streetLines: string[]) {
  const [line1 = "", line2 = ""] = streetLines;
  const { calle, numero } = splitStreetAndNumber(line1);
  const interiorMatch = line2.match(/\bInt(?:\.|erior)?\s+(.+)$/i);

  return {
    calle,
    numero,
    numeroInterior: interiorMatch?.[1]
      ? normalizeWhitespace(interiorMatch[1])
      : "",
    colonia: normalizeWhitespace(
      interiorMatch ? line2.replace(interiorMatch[0], "") : line2,
    ),
  };
}

function buildSuggestedShippingValues(
  original: ShippingValues,
  validation: FedExAddressValidation,
): ShippingValues | null {
  const resolved = validation.resolvedAddress ?? validation.addresses?.[0];
  if (!resolved) {
    return null;
  }

  const parsed = parseResolvedAddress(resolved.streetLines);

  return {
    ...original,
    calle: parsed.calle || original.calle,
    numero: parsed.numero || original.numero,
    numeroInterior: parsed.numeroInterior || original.numeroInterior || "",
    colonia: parsed.colonia || original.colonia,
    city: normalizeWhitespace(resolved.city ?? original.city),
    estado:
      getMexicoStateLabelFromFedExCode(resolved.stateOrProvinceCode) ??
      normalizeWhitespace(original.estado),
    zip: normalizeWhitespace(resolved.postalCode || original.zip),
  };
}

function hasAddressSuggestion(
  original: ShippingValues,
  validation: FedExAddressValidation,
) {
  const suggested = buildSuggestedShippingValues(original, validation);
  if (!suggested) {
    return false;
  }

  return (
    buildAddressValidationKey(buildFedExDireccionEnvio(original)) !==
    buildAddressValidationKey(buildFedExDireccionEnvio(suggested))
  );
}

function getNextAddressValidationStatus(
  validation: FedExAddressValidation,
): AddressValidationStatus {
  const firstAddress = validation.addresses?.[0] ?? validation.resolvedAddress;
  const attributes = firstAddress?.attributes ?? {};
  const isAddressSuccess = validation.success === true || validation.isValid === true;
  const isStandardized =
    firstAddress?.isStandardized === true ||
    attributes.AddressType === "STANDARDIZED";
  const isMatched = attributes.Matched === true || attributes.Matched === "true";
  const isValidlyFormed =
    attributes.ValidlyFormed === true || attributes.ValidlyFormed === "true";

  if (firstAddress?.isLikelyValid === true) {
    return "VALIDATED";
  }

  // En Mexico, FedEx puede responder Address Validation con 200 y direccion
  // estandarizada, pero `isLikelyValid` puede venir en false porque no siempre
  // hay validacion DPV completa. Si Postal Validation paso, permitimos cotizar
  // como USER_CONFIRMED y dejamos que Rates determine si hay tarifa disponible.
  if (isAddressSuccess && (isStandardized || isMatched || isValidlyFormed)) {
    return "USER_CONFIRMED";
  }

  if (isAddressSuccess) {
    return "USER_CONFIRMED";
  }

  return "NOT_VALIDATED";
}

function canUseAddressForFedExQuote(status?: AddressValidationStatus) {
  return (
    status === "VALIDATED" ||
    status === "USER_CONFIRMED" ||
    status === "VALIDATION_UNAVAILABLE"
  );
}

function isRecoverableFedExQuoteError(error: ApiError) {
  const message = getApiErrorMessage(error);
  const provider = error.payload?.provider;

  return (
    error.status === 422 ||
    error.status === 502 ||
    (error.status === 500 &&
      (provider === "FEDEX" ||
        /invalid service and packaging combination/i.test(message)))
  );
}

function getFedExQuoteErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "SHIPPING_ADDRESS_REQUIRED":
        return "Completa la direccion de entrega antes de cotizar.";
      case "FEDEX_RATE_UNAVAILABLE":
        return "FedEx no devolvio tarifas para esta direccion.";
      case "FEDEX_SERVICE_UNAVAILABLE":
        return "FedEx no esta disponible por el momento. Intenta nuevamente en unos segundos.";
      case "FEDEX_PRODUCT_DIMENSIONS_MISSING":
        return "Un producto del carrito no tiene peso y dimensiones FedEx configurados. Contacta a soporte para completar esos datos antes de pedir envio.";
      case "FEDEX_PRODUCT_LIMITS_EXCEEDED":
        return "Un producto del carrito excede los limites de tamano o peso permitidos por FedEx. Contacta a soporte para revisar el envio.";
      default:
        if (error.status === 429) {
          return "FedEx recibio demasiadas solicitudes. Espera unos segundos antes de reintentar.";
        }
        if (isRecoverableFedExQuoteError(error)) {
          return `${getApiErrorMessage(error)} Puedes reintentar o cambiar la direccion de entrega.`;
        }
    }
  }

  return getApiErrorMessage(error);
}

function isQuoteExpired(quote?: FedExShippingQuote) {
  if (!quote?.expiresAt) {
    return false;
  }

  const expiresAt = new Date(quote.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function requiresFedExSelection(quote?: FedExShippingQuote | null) {
  return quote?.requiresShipping !== false;
}

function getDeliveryShippingSelection(values: CheckoutValues) {
  return values.fulfillmentMethod === "DELIVERY"
    ? values.shippingSelection
    : null;
}

function getDeliveryShippingAmount(values: CheckoutValues) {
  return getDeliveryShippingSelection(values)?.selectedOption.amount ?? 0;
}

function assertDeliveryShippingReady(values: CheckoutValues) {
  if (values.fulfillmentMethod !== "DELIVERY") {
    return;
  }

  if (!canUseAddressForFedExQuote(values.addressValidationStatus)) {
    throw new Error(
      "Valida o confirma tu direccion de entrega antes de continuar con el pago.",
    );
  }

  if (values.shippingSelection === undefined) {
    throw new Error(
      "Cotiza el envio FedEx antes de continuar con el pago.",
    );
  }

  if (values.shippingSelection && isQuoteExpired(values.shippingSelection.quote)) {
    throw new Error(
      "La cotizacion FedEx expiro. Vuelve al paso de entrega y recotiza.",
    );
  }
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
    [values.calle, values.numero, values.numeroInterior, values.colonia]
      .filter(Boolean)
      .join(" "),
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

function getCheckoutErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "SHIPPING_RATE_CHANGED":
        return "El costo de envio cambio. Vuelve a confirmar tu envio.";
      case "FEDEX_SERVICE_NOT_AVAILABLE":
        return "Ese servicio FedEx ya no esta disponible para tu direccion.";
      case "FEDEX_RATE_UNAVAILABLE":
        return "FedEx no devolvio tarifas para esta direccion.";
      case "FEDEX_SERVICE_UNAVAILABLE":
        return "FedEx no esta disponible temporalmente. Intenta nuevamente.";
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
  if (!(error instanceof ApiError) || values.fulfillmentMethod !== "DELIVERY") {
    return null;
  }

  const errorData =
    error.payload?.data && typeof error.payload.data === "object"
      ? (error.payload.data as Record<string, unknown>)
      : undefined;
  const quotes = Array.isArray(errorData?.quotes) ? errorData.quotes : [];

  if (error.code === "SHIPPING_RATE_CHANGED" && quotes.length > 0) {
    const quote = normalizeFedExShippingQuote({
      quoteId:
        typeof errorData?.quoteId === "string" ? errorData.quoteId : "",
      provider: "FEDEX",
      currency:
        typeof errorData?.currency === "string" ? errorData.currency : "MXN",
      expiresAt:
        typeof errorData?.expiresAt === "string" ? errorData.expiresAt : undefined,
      requiresShipping: true,
      options: quotes.map(normalizeFedExShippingOption),
    });

    return {
      ...values,
      shippingQuote: quote,
      shippingSelection: undefined,
    };
  }

  if (error.code === "FEDEX_SERVICE_NOT_AVAILABLE") {
    return {
      ...values,
      shippingQuote: null,
      shippingSelection: undefined,
    };
  }

  return null;
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
    };
  }

  const selectedOption = values.shippingSelection?.selectedOption;
  const shippingQuoteId = values.shippingSelection?.quote.quoteId;
  const shippingPayload = buildFedExQuotePayload(
    toLegacyDireccionEnvio(values.shippingAddress),
  );

  return {
    fulfillmentMethod: "DELIVERY" as const,
    direccionEnvio: shippingPayload.direccionEnvio,
    shippingAddress: shippingPayload.shippingAddress,
    fedexAddress: shippingPayload.fedexAddress,
    metodoPago,
    ...(shippingQuoteId ? { shippingQuoteId } : {}),
    ...(selectedOption
      ? selectedOption.optionId
        ? { selectedShippingOptionId: selectedOption.optionId }
        : { selectedServiceType: selectedOption.serviceType }
      : {}),
    ...(values.shippingSelection
      ? { shippingSelection: values.shippingSelection.shippingSelection }
      : {}),
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
  shippingSelection,
  checkoutPricing,
}: {
  fulfillmentMethod: FulfillmentMethod;
  shippingSelection?: DeliveryShippingSelection | null;
  checkoutPricing?: CheckoutPricing | null;
}) {
  const { state, subtotal, totalItems } = useCart();
  const { getPersonalization } = useStorefront();
  const pricing =
    checkoutPricing && checkoutPricing.subtotal > 0
      ? checkoutPricing
      :
    getExpectedCheckoutPricing(
      subtotal,
      fulfillmentMethod,
      shippingSelection?.selectedOption.amount ?? 0,
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
                : shippingSelection
                  ? formatCurrency(pricing.shipping)
                  : "Cotizar en checkout"}
            </span>
          </div>
          {fulfillmentMethod === "DELIVERY" && shippingSelection ? (
            <div className="flex items-center justify-between gap-3">
              <span>FedEx</span>
              <span className="text-right">
                {shippingSelection.selectedOption.serviceName ??
                  shippingSelection.selectedOption.serviceType}
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
      description: "Pago inmediato con Stripe Embedded Checkout dentro del flujo actual.",
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
  const [shippingQuote, setShippingQuote] = useState<FedExShippingQuote | null>(null);
  const [shippingOptions, setShippingOptions] = useState<FedExShippingOption[]>([]);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState("");
  const [selectedShipping, setSelectedShipping] =
    useState<DeliveryShippingSelection | null>(null);
  const [checkoutPricing, setCheckoutPricing] = useState<CheckoutPricing | null>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isGoogleUnavailable, setIsGoogleUnavailable] = useState(false);
  const [googleAutocompleteMessage, setGoogleAutocompleteMessage] =
    useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLoadingShippingOptions, setIsLoadingShippingOptions] = useState(false);
  const [isRecalculatingCheckout, setIsRecalculatingCheckout] = useState(false);
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
    if (fulfillmentMethod !== "DELIVERY" || !isAuthenticated) {
      return;
    }

    const postalCode = normalizeWhitespace(watchedZip);
    if (!/^\d{5}$/.test(postalCode)) {
      setPostalValidated(false);
      setPostalValidationMessage(null);
      return;
    }

    let cancelled = false;
    setIsValidatingPostal(true);

    void fedexApi
      .validatePostal({
        countryCode: "MX",
        postalCode,
        stateOrProvinceCode: normalizeWhitespace(watchedEstado) || undefined,
        city: normalizeWhitespace(watchedCity) || undefined,
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setPostalValidated(result.isValid);
        setPostalValidationMessage(
          result.isValid
            ? result.alerts[0] ?? null
            : result.alerts[0] ??
                "El codigo postal no es valido para envio FedEx.",
        );

        if (!result.isValid) {
          setAddressValidationStatus("NOT_VALIDATED");
          setSuggestedShippingValues(null);
          setHasPendingSuggestion(false);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setPostalValidated(false);
        setAddressValidationStatus("NOT_VALIDATED");
        setPostalValidationMessage(getFedExQuoteErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) {
          setIsValidatingPostal(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fulfillmentMethod, isAuthenticated, watchedCity, watchedEstado, watchedZip]);

  useEffect(() => {
    if (fulfillmentMethod !== "DELIVERY" || !isAuthenticated || !postalValidated) {
      return;
    }

    const currentValues = form.getValues();
    const direccionEnvio = buildFedExDireccionEnvio(
      {
        ...currentValues,
        name: watchedName,
        telefono: watchedTelefono,
        calle: watchedCalle,
        numero: watchedNumero,
        numeroInterior: watchedNumeroInterior,
        colonia: watchedColonia,
        city: watchedCity,
        estado: watchedEstado,
        zip: watchedZip,
      },
      deliveryReferences,
    );

    if (!isDireccionValidatable(direccionEnvio)) {
      setAddressValidationStatus("NOT_VALIDATED");
      setAddressValidationMessages([]);
      return;
    }

    let cancelled = false;
    setIsValidatingAddress(true);

    void fedexApi
      .validateAddress(toFedexRecipient(direccionEnvio))
      .then((validation) => {
        if (cancelled) {
          return;
        }

        const nextMessages = [
          ...(validation.customerMessages ?? []),
          ...(validation.warnings ?? []),
        ].filter(Boolean);
        const hasSuggestion = hasAddressSuggestion(currentValues, validation);

        setAddressValidationMessages(nextMessages);

        if (hasSuggestion) {
          setSuggestedShippingValues(
            buildSuggestedShippingValues(currentValues, validation),
          );
          setHasPendingSuggestion(true);
          setAddressValidationStatus("SUGGESTED");
          return;
        }

        const nextAddressValidationStatus =
          getNextAddressValidationStatus(validation);
        const firstAddress =
          validation.addresses?.[0] ?? validation.resolvedAddress;

        if (IS_DEVELOPMENT) {
          const attributes = firstAddress?.attributes ?? {};
          console.log("[FedEx Address Validation Parsed]", {
            validation,
            firstAddress,
            isLikelyValid: firstAddress?.isLikelyValid,
            isStandardized:
              firstAddress?.isStandardized === true ||
              attributes.AddressType === "STANDARDIZED",
            isMatched:
              attributes.Matched === true || attributes.Matched === "true",
            isValidlyFormed:
              attributes.ValidlyFormed === true ||
              attributes.ValidlyFormed === "true",
            nextAddressValidationStatus,
          });
        }

        setSuggestedShippingValues(null);
        setHasPendingSuggestion(false);
        setAddressValidationStatus(nextAddressValidationStatus);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setAddressValidationStatus("NOT_VALIDATED");
        setAddressValidationMessages([getFedExQuoteErrorMessage(error)]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsValidatingAddress(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    deliveryReferences,
    form,
    fulfillmentMethod,
    isAuthenticated,
    postalValidated,
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
        phone: normalizeMxPhoneForAplazo(values.telefono),
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

    if (!postalValidated) {
      setAddressError(
        postalValidationMessage ||
          "Valida un codigo postal correcto antes de continuar.",
      );
      return;
    }

    if (hasPendingSuggestion || addressValidationStatus === "SUGGESTED") {
      setAddressError(
        "FedEx encontro una sugerencia para tu direccion. Elige si quieres usarla o continuar con tu captura.",
      );
      return;
    }

    const addressCanBeUsedForQuote =
      canUseAddressForFedExQuote(addressValidationStatus);

    if (IS_DEVELOPMENT) {
      console.log("[FedEx Can Quote]", {
        postalValidationStatus: postalValidated ? "VALIDATED" : "NOT_VALIDATED",
        addressValidationStatus,
        canQuoteShipping: postalValidated && addressCanBeUsedForQuote,
      });
    }

    if (!addressCanBeUsedForQuote) {
      setAddressError(
        "FedEx debe validar o confirmar tu direccion antes de cotizar.",
      );
      return;
    }

    const currentShippingAddress = buildCurrentShippingAddress(shippingValues);
    const existingSelectedOption = shippingQuote?.options.find(
      (option) =>
        option.optionId === selectedShippingOptionId ||
        option.serviceType === selectedShippingOptionId,
    );

    if (
      shippingQuote &&
      !isQuoteExpired(shippingQuote) &&
      !requiresFedExSelection(shippingQuote)
    ) {
      const nextPricing = getExpectedCheckoutPricing(0, "DELIVERY", 0);
      setCheckoutPricing(nextPricing);
      onContinue({
        ...shippingValues,
        fulfillmentMethod: "DELIVERY",
        formattedAddress,
        deliveryReferences,
        shippingAddress: currentShippingAddress,
        addressValidationStatus,
        shippingQuote,
        shippingSelection: null,
        checkoutPricing: nextPricing,
      });
      return;
    }

    if (
      shippingQuote &&
      !isQuoteExpired(shippingQuote) &&
      requiresFedExSelection(shippingQuote) &&
      !existingSelectedOption
    ) {
      setShippingError("Selecciona un servicio FedEx para continuar.");
      return;
    }

    if (shippingQuote && existingSelectedOption && !isQuoteExpired(shippingQuote)) {
      const nextPricing = getExpectedCheckoutPricing(
        0,
        "DELIVERY",
        existingSelectedOption.amount,
      );
      const nextSelection = {
        quote: shippingQuote,
        selectedOption: existingSelectedOption,
        shippingSelection: buildCheckoutShippingSelection(
          existingSelectedOption,
        ) as ShippingSelection,
      };
      setSelectedShipping(nextSelection);
      setCheckoutPricing(nextPricing);
      onContinue({
        ...shippingValues,
        fulfillmentMethod: "DELIVERY",
        formattedAddress,
        deliveryReferences,
        shippingAddress: currentShippingAddress,
        addressValidationStatus,
        shippingQuote,
        shippingSelection: nextSelection,
        checkoutPricing: nextPricing,
      });
      return;
    }

    setIsLoadingShippingOptions(true);
    setIsRecalculatingCheckout(true);
    try {
      const quote = await fedexApi.quoteCart(direccionEnvio);
      if (!requiresFedExSelection(quote)) {
        const nextPricing = getExpectedCheckoutPricing(0, "DELIVERY", 0);
        setShippingQuote(quote);
        setShippingOptions([]);
        setSelectedShippingOptionId("");
        setSelectedShipping(null);
        setCheckoutPricing(nextPricing);
        setShippingWarnings([]);
        setLastQuotedAddressKey(currentAddressKey);
        toast({
          title: "Entrega lista",
          description: "Este carrito no requiere envio FedEx.",
        });
        onContinue({
          ...shippingValues,
          fulfillmentMethod: "DELIVERY",
          formattedAddress,
          deliveryReferences,
          shippingAddress: currentShippingAddress,
          addressValidationStatus,
          shippingQuote: quote,
          shippingSelection: null,
          checkoutPricing: nextPricing,
        });
        return;
      }

      if (!quote.quoteId || quote.options.length === 0) {
        setShippingError("FedEx no devolvio opciones de envio para esta direccion.");
        return;
      }

      const defaultOption =
        quote.options.find(
          (option) =>
            option.optionId === selectedShippingOptionId ||
            option.serviceType === selectedShippingOptionId,
        ) ?? quote.options[0];

      const nextPricing = getExpectedCheckoutPricing(
        0,
        "DELIVERY",
        defaultOption.amount,
      );
      setShippingQuote(quote);
      setShippingOptions(quote.options);
      setSelectedShippingOptionId(defaultOption.optionId ?? defaultOption.serviceType);
      setSelectedShipping({
        quote,
        selectedOption: defaultOption,
        shippingSelection: buildCheckoutShippingSelection(defaultOption) as ShippingSelection,
      });
      setCheckoutPricing(nextPricing);
      setShippingWarnings([]);
      setAddressError(null);
      setShippingError(null);
      setLastQuotedAddressKey(currentAddressKey);
      toast({
        title: "Opciones FedEx listas",
        description: "Selecciona un servicio de envio para continuar.",
      });
    } catch (error) {
      setShippingError(getFedExQuoteErrorMessage(error));
    } finally {
      setIsLoadingShippingOptions(false);
      setIsRecalculatingCheckout(false);
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
                        ? "Google Places no esta disponible. Puedes continuar con captura manual y FedEx seguira validando en backend."
                        : isGoogleReady
                          ? "Google completa la direccion y FedEx valida el resultado antes de cotizar."
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
                  {checkoutPricing && selectedShipping ? (
                    <div className="rounded-[1.2rem] border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-primary">
                      Resumen recalculado con backend: envio {formatCurrency(selectedShipping.selectedOption.amount)}.
                    </div>
                  ) : null}
                  {shippingQuote?.requiresShipping === false ? (
                    <div className="rounded-[1.4rem] border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-primary">
                      Este carrito no requiere envio FedEx. Puedes continuar a pago.
                    </div>
                  ) : shippingQuote ? (
                    <div className="space-y-3 rounded-[1.4rem] border border-border bg-muted/35 p-4">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Opciones FedEx</p>
                      </div>
                      {isQuoteExpired(shippingQuote) ? (
                        <p className="text-sm text-destructive">Esta cotizacion expiro. Vuelve a cotizar para continuar.</p>
                      ) : null}
                      <RadioGroup
                        value={selectedShippingOptionId}
                        onValueChange={(value) => {
                          setSelectedShippingOptionId(value);
                          const option = shippingOptions.find(
                            (item) => item.optionId === value || item.serviceType === value,
                          );
                          if (!option || !shippingQuote) {
                            return;
                          }
                          setSelectedShipping({
                            quote: shippingQuote,
                            selectedOption: option,
                            shippingSelection: buildCheckoutShippingSelection(option) as ShippingSelection,
                          });
                          setCheckoutPricing(
                            getExpectedCheckoutPricing(0, "DELIVERY", option.amount),
                          );
                        }}
                        className="gap-3"
                      >
                        {shippingOptions.map((option) => {
                          const value = option.optionId ?? option.serviceType;
                          return (
                            <label key={value} htmlFor={`fedex-option-${value}`} className={cn("flex cursor-pointer items-start gap-3 rounded-[1rem] border px-4 py-3 transition-colors", selectedShippingOptionId === value ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-muted/55")}>
                              <RadioGroupItem id={`fedex-option-${value}`} value={value} className="mt-1" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-semibold text-foreground">{option.serviceName ?? option.serviceType}</p>
                                  <p className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(option.amount)}</p>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{[option.estimatedDeliveryDate ? `Entrega estimada ${option.estimatedDeliveryDate}` : "", option.transitTime].filter(Boolean).join(" | ") || "Tiempo por confirmar"}</p>
                              </div>
                            </label>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  ) : null}
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
            ? "Cotizando..."
            : fulfillmentMethod === "DELIVERY" &&
                (!shippingQuote || isQuoteExpired(shippingQuote))
              ? "Cotizar envio"
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
            ? "Cotizando..."
            : fulfillmentMethod === "DELIVERY" &&
                (!shippingQuote || isQuoteExpired(shippingQuote))
              ? "Cotizar envio"
              : "Continuar a pago"}
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
  onRecoverableDeliveryError,
  paymentMethod,
  onPaymentMethodChange,
  stripePromise,
}: {
  values: CheckoutValues;
  cartId?: string;
  cartItems: CartItem[];
  total: number;
  onBack: () => void;
  onRecoverableDeliveryError: (values: DeliveryCheckoutValues) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  stripePromise: ReturnType<typeof useStripeConfig>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [embeddedClientSecret, setEmbeddedClientSecret] = useState<string | null>(null);
  const [orderContext, setOrderContext] = useState<{
    ordenId: string;
    total: number;
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
      });

      const successUrl = `${window.location.origin}/checkout/confirmation?ordenId=${encodeURIComponent(ordenId)}&status=processing&total=${encodeURIComponent((createdOrder.total ?? total).toFixed(2))}`;
      const cancelUrl = `${window.location.origin}/checkout?ordenId=${encodeURIComponent(ordenId)}`;
      const session = await paymentsApi.createEmbeddedCheckoutSession(
        ordenId,
        successUrl,
        cancelUrl,
      );

      if (!session.clientSecret) {
        throw new Error("No se recibió clientSecret para montar Stripe Embedded Checkout");
      }

      clearStoredAplazoCheckoutState();
      clearStoredAplazoRetryPayload();
      setOrderContext({
        ordenId,
        total: createdOrder.total ?? total,
      });
      setEmbeddedClientSecret(session.clientSecret);
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
      <Card className="rounded-[1.9rem] border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="pb-4">
          <CardTitle>Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PaymentMethodSelector
            value={paymentMethod}
            onValueChange={onPaymentMethodChange}
          />

          {embeddedClientSecret ? (
            <div className="space-y-4">
              <div className="rounded-[1.4rem] border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-primary">
                Stripe Embedded Checkout validará el total final directamente desde backend para la orden {orderContext?.ordenId}.
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
              <div className="rounded-[1.5rem] border border-border bg-muted/45 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Stripe Embedded Checkout
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Primero crearemos tu orden y Stripe montará el checkout embebido con el total validado por backend.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                El pago se procesa con Stripe. El total estimado a validar es {formatCurrency(total)}.
              </p>
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
                onClick={() => router.push(`/checkout/confirmation?ordenId=${encodeURIComponent(orderContext?.ordenId ?? "")}&status=processing`)}
              >
                Ver estado del pedido
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 flex-1 rounded-full"
                onClick={() => void handlePrepareEmbeddedCheckout()}
                disabled={isProcessing || !stripePromise}
              >
                {isProcessing ? "Preparando..." : "Continuar con Stripe"}
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
            onClick={() => router.push(`/checkout/confirmation?ordenId=${encodeURIComponent(orderContext?.ordenId ?? "")}&status=processing`)}
          >
            Ver estado
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 flex-1 rounded-full"
            onClick={() => void handlePrepareEmbeddedCheckout()}
            disabled={isProcessing || !stripePromise}
          >
            {isProcessing ? "Preparando..." : "Continuar con Stripe"}
          </Button>
        )}
      </MobileCheckoutActions>
    </>
  );
}
function AplazoPaymentStep({
  values,
  cartId,
  cartItems,
  onBack,
  onRecoverableDeliveryError,
  paymentMethod,
  onPaymentMethodChange,
}: {
  values: CheckoutValues;
  cartId?: string;
  cartItems: CartItem[];
  onBack: () => void;
  onRecoverableDeliveryError: (values: DeliveryCheckoutValues) => void;
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
      assertDeliveryShippingReady(values);

      const origin = window.location.origin;
      const cartFingerprint = [
        getAplazoCartFingerprint(cartItems),
        values.fulfillmentMethod,
        values.fulfillmentMethod === "PICKUP" ? values.pickupLocation.id : "",
        values.fulfillmentMethod === "DELIVERY"
          ? (values.shippingSelection?.quote.quoteId ?? "")
          : "",
        values.fulfillmentMethod === "DELIVERY"
          ? (values.shippingSelection?.selectedOption.optionId ??
            values.shippingSelection?.selectedOption.serviceType ??
            "")
          : "",
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
      const retryValues = buildRetryDeliveryValuesFromCheckoutError(
        values,
        error,
      );
      if (retryValues) {
        onRecoverableDeliveryError(retryValues);
      }
      const description = retryValues
        ? getCheckoutErrorMessage(error)
        : getAplazoErrorMessage(error);
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
                          getDeliveryShippingAmount(values),
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
          ? (checkoutValues.shippingSelection?.selectedOption.amount ?? 0)
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
          phone: normalizeMxPhoneForAplazo(shippingForm.getValues("telefono")),
          street1: `${shippingForm.getValues("calle")} ${shippingForm.getValues("numero")}`.trim(),
          street2: shippingForm.getValues("colonia"),
          interiorNumber: shippingForm.getValues("numeroInterior"),
          city: shippingForm.getValues("city"),
          stateLabel: shippingForm.getValues("estado"),
          postalCode: shippingForm.getValues("zip"),
          countryCode: "MX",
        },
        "NOT_VALIDATED",
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
          ) : paymentMethod === "TARJETA" ? (
            stripePromise ? (
              <CardPaymentStep
                values={activeCheckoutValues}
                cartId={state.id}
                cartItems={state.items}
                total={total}
                onBack={() => setCurrentStep(0)}
                onRecoverableDeliveryError={handleRecoverableDeliveryError}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                stripePromise={stripePromise}
              />
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
              onRecoverableDeliveryError={handleRecoverableDeliveryError}
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
          />
        </div>
      </div>

    </div>
  );
}




