# Implementacion frontend de FedEx en checkout

Este documento describe como conectar el frontend con el backend para envios FedEx: tipos, API client, formulario de direccion, validacion, opciones, seleccion, recalculo de checkout y envio a Stripe/Aplazo.

## 1. Tipos e interfaces de shipping

Usa estos tipos como base en el frontend. El backend acepta direccion de checkout en formato `direccionEnvio`, pero los endpoints publicos de FedEx usan una direccion normalizada tipo `recipient`.

```ts
export type AddressValidationStatus =
  | "VALIDATED"
  | "SUGGESTED"
  | "USER_CONFIRMED"
  | "NOT_VALIDATED"
  | "VALIDATION_UNAVAILABLE";

export type DireccionEnvio = {
  nombre: string;
  telefono: string; // 10 digitos
  calle: string;
  numero: string;
  numeroInterior?: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string; // 5 digitos MX
  referencias?: string;
  addressValidationStatus?: AddressValidationStatus;
};

export type FedexRecipient = {
  streetLines: string[];
  city?: string;
  stateOrProvinceCode?: string;
  postalCode: string;
  countryCode: "MX";
  residential?: boolean;
};

export type FedexQuoteOption = {
  optionId?: string;
  provider: "FEDEX";
  serviceType: string;
  serviceName: string;
  packagingType: string;
  amount: number;
  currency: string;
  estimatedDeliveryDate?: string;
  transitTime?: string;
  rateType?: string;
  surcharges?: Array<{ type?: string; description?: string; amount: number; currency: string }>;
};

export type FedexCartQuote = {
  ok: true;
  provider: "FEDEX";
  requiresShipping: boolean;
  quoteId: string;
  currency: string;
  expiresAt?: string;
  options: FedexQuoteOption[];
};

export type ShippingSelection = {
  method: "FEDEX";
  provider: "FEDEX";
  serviceType: string;
  serviceName?: string;
  carrierCode?: string;
  packagingType?: string;
  quotedAmount?: number;
  quotedCurrency?: string;
  transitTime?: string;
  deliveryTimestamp?: string;
};

export type CheckoutResponse = {
  success: boolean;
  message: string;
  data?: {
    id: string;
    total: number;
    costoEnvio?: number;
    shipping?: unknown;
    pricingSnapshot?: unknown;
  };
  code?: string;
};
```

Helper recomendado para convertir el formulario a direccion FedEx:

```ts
export function toFedexRecipient(address: DireccionEnvio): FedexRecipient {
  return {
    streetLines: [
      `${address.calle} ${address.numero}`.trim(),
      [address.colonia, address.numeroInterior ? `Int ${address.numeroInterior}` : ""]
        .filter(Boolean)
        .join(" "),
      address.referencias || "",
    ].filter(Boolean).slice(0, 3),
    city: address.ciudad,
    stateOrProvinceCode: address.estado,
    postalCode: address.codigoPostal,
    countryCode: "MX",
    residential: true,
  };
}
```

## 2. API client para llamar al backend

Todos los endpoints de carrito requieren Bearer token. La cotizacion desde carrito tambien lo requiere porque el backend toma items, pesos y dimensiones desde el carrito guardado.

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type ApiErrorBody = {
  success?: false;
  ok?: false;
  provider?: string;
  code?: string;
  message?: string;
  data?: unknown;
};

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = body as ApiErrorBody;
    throw {
      status: response.status,
      code: error.code,
      message: error.message || "No fue posible completar la solicitud.",
      data: error.data,
    };
  }

  return body as T;
}

export const fedexApi = {
  validatePostal(token: string, input: {
    countryCode: "MX";
    postalCode: string;
    stateOrProvinceCode?: string;
    city?: string;
  }) {
    return apiRequest<{ success: true; data: { isValid: boolean; alerts: unknown[] } }>(
      "/api/shipping/fedex/postal/validate",
      { method: "POST", token, body: JSON.stringify({ carrierCode: "FDXE", ...input }) },
    );
  },

  validateAddress(token: string, address: FedexRecipient) {
    return apiRequest<{ success: true; data: { addresses: Array<{ isLikelyValid: boolean; streetLines: string[]; city?: string; stateOrProvinceCode?: string; postalCode?: string; customerMessages: unknown[] }> } }>(
      "/api/shipping/fedex/address/validate",
      { method: "POST", token, body: JSON.stringify({ ...address, includeResolutionTokens: true }) },
    );
  },

  createCartQuote(token: string, direccionEnvio: DireccionEnvio) {
    return apiRequest<{ success: true; data: FedexCartQuote }>(
      "/api/carrito/shipping/fedex/quotes",
      { method: "POST", token, body: JSON.stringify({ direccionEnvio }) },
    );
  },

  checkout(token: string, input: {
    direccionEnvio: DireccionEnvio;
    shippingQuoteId: string;
    selectedShippingOptionId?: string;
    selectedServiceType?: string;
    shippingSelection: ShippingSelection;
    metodoPago: "TARJETA" | "APLAZO";
    notas?: string;
  }) {
    return apiRequest<CheckoutResponse>("/api/carrito/checkout", {
      method: "POST",
      token,
      body: JSON.stringify({
        fulfillmentMethod: "DELIVERY",
        ...input,
      }),
    });
  },
};
```

## 3. Formulario de direccion de envio

Campos minimos que debe capturar el frontend:

- `nombre`: requerido, maximo 100 caracteres.
- `telefono`: requerido, exactamente 10 digitos.
- `calle`: requerido.
- `numero`: requerido.
- `numeroInterior`: opcional.
- `colonia`: requerido.
- `ciudad`: requerido.
- `estado`: requerido. Para FedEx conviene mandar codigo de estado/provincia cuando sea posible.
- `codigoPostal`: requerido, 5 digitos para Mexico.
- `referencias`: opcional, maximo 500 caracteres.

Validacion local sugerida antes de llamar al backend:

```ts
export function validateDireccionEnvio(address: DireccionEnvio): string[] {
  const errors: string[] = [];
  if (!address.nombre.trim()) errors.push("Captura el nombre de quien recibe.");
  if (!/^\d{10}$/.test(address.telefono)) errors.push("El telefono debe tener 10 digitos.");
  if (!address.calle.trim()) errors.push("Captura la calle.");
  if (!address.numero.trim()) errors.push("Captura el numero exterior.");
  if (!address.colonia.trim()) errors.push("Captura la colonia.");
  if (!address.ciudad.trim()) errors.push("Captura la ciudad.");
  if (!address.estado.trim()) errors.push("Captura el estado.");
  if (!/^\d{5}$/.test(address.codigoPostal)) errors.push("El codigo postal debe tener 5 digitos.");
  return errors;
}
```

## 4. Validacion postal y direccion

Flujo recomendado:

1. Cuando el usuario termina `codigoPostal`, llama `POST /api/shipping/fedex/postal/validate`.
2. Si responde `isValid: false` o hay error `422`, muestra mensaje en el campo CP y no cotices.
3. Cuando la direccion tenga calle, numero, colonia, ciudad, estado y CP, llama `POST /api/shipping/fedex/address/validate`.
4. Si FedEx devuelve una sugerencia confiable, permite aceptarla. Si el usuario decide continuar con su direccion, marca `addressValidationStatus: "USER_CONFIRMED"`.
5. Si FedEx no esta disponible, permite continuar solo si la UX de negocio lo acepta y marca `addressValidationStatus: "VALIDATION_UNAVAILABLE"`. El checkout volvera a recalcular y puede rechazar la seleccion si FedEx no cotiza.

Para el checkout con `POST /api/carrito/shipping/fedex/quotes`, el backend ya valida la direccion contra FedEx y genera la cotizacion usando el carrito real.

## 5. Mostrar opciones FedEx

Despues de una direccion valida:

```ts
const quoteResponse = await fedexApi.createCartQuote(token, direccionEnvio);
const quote = quoteResponse.data;

if (!quote.requiresShipping) {
  // No hay productos fisicos; no mostrar FedEx.
}

const options = quote.options;
```

Renderiza cada opcion con:

- Nombre: `serviceName`.
- Precio: `amount` + `currency`.
- Tiempo: `transitTime` o `estimatedDeliveryDate`.
- Id estable: `optionId`.

Guarda en estado:

```ts
const shippingQuoteId = quote.quoteId;
const selectedOption = quote.options[0];
```

La cotizacion expira en `expiresAt`; si expira, vuelve a cotizar antes de checkout.

## 6. Seleccion de servicio FedEx

Al seleccionar una opcion, construye `shippingSelection` desde la opcion elegida:

```ts
export function buildShippingSelection(option: FedexQuoteOption): ShippingSelection {
  return {
    method: "FEDEX",
    provider: "FEDEX",
    serviceType: option.serviceType,
    serviceName: option.serviceName,
    packagingType: option.packagingType,
    quotedAmount: option.amount,
    quotedCurrency: option.currency,
    transitTime: option.transitTime,
    deliveryTimestamp: option.estimatedDeliveryDate,
  };
}
```

Para `POST /api/carrito/checkout` manda tambien:

- `shippingQuoteId`: `quote.quoteId`.
- `selectedShippingOptionId`: `option.optionId`.
- `selectedServiceType`: `option.serviceType`.
- `shippingSelection`: objeto anterior.

No mandes `costoEnvio`: el backend lo rechaza para `DELIVERY` porque recalcula el costo de envio.

## 7. Recalcular resumen de checkout desde backend

La fuente de verdad del resumen final es el backend. En `POST /api/carrito/checkout`, el backend:

- Lee items del carrito del usuario.
- Revalida productos activos, stock y talla.
- Recalcula subtotal.
- Reconstruye paquetes FedEx desde peso/dimensiones del catalogo.
- Vuelve a cotizar FedEx.
- Compara `quotedAmount` con tolerancia de 1 peso.
- Valida disponibilidad del servicio seleccionado.
- Crea la orden con `pricingSnapshot`, `shipping`, `costoEnvio`, `shippingTotal` y `total`.

Si el backend responde `SHIPPING_RATE_CHANGED`, muestra las nuevas `quotes` si vienen en `data.quotes`, limpia la seleccion previa y pide confirmar otra vez.

## 8. Mandar shippingSelection + shippingAddress a Stripe/Aplazo

El frontend no manda `shippingSelection` directo a Stripe/Aplazo. Primero crea la orden:

```ts
const checkout = await fedexApi.checkout(token, {
  direccionEnvio: {
    ...direccionEnvio,
    addressValidationStatus: direccionEnvio.addressValidationStatus || "USER_CONFIRMED",
  },
  metodoPago: paymentMethod === "stripe" ? "TARJETA" : "APLAZO",
  shippingQuoteId,
  selectedShippingOptionId: selectedOption.optionId,
  selectedServiceType: selectedOption.serviceType,
  shippingSelection: buildShippingSelection(selectedOption),
});

const orderId = checkout.data!.id;
```

Luego inicia el proveedor de pago con `orderId`.

Stripe Checkout Session:

```ts
await apiRequest<{ url?: string; data?: { url?: string } }>("/api/stripe/checkout-sessions", {
  method: "POST",
  token,
  body: JSON.stringify({
    orderId,
    successUrl: `${window.location.origin}/checkout/success?orderId=${orderId}`,
    cancelUrl: `${window.location.origin}/checkout/cancel?orderId=${orderId}`,
  }),
});
```

Stripe PaymentIntent, si usan flujo embebido, acepta `shipping` en formato Stripe:

```ts
await apiRequest("/api/stripe/payment-intents", {
  method: "POST",
  token,
  body: JSON.stringify({
    orderId,
    shipping: {
      name: direccionEnvio.nombre,
      phone: direccionEnvio.telefono,
      address: {
        line1: `${direccionEnvio.calle} ${direccionEnvio.numero}`,
        line2: [direccionEnvio.colonia, direccionEnvio.numeroInterior].filter(Boolean).join(" "),
        city: direccionEnvio.ciudad,
        state: direccionEnvio.estado,
        postal_code: direccionEnvio.codigoPostal,
        country: "MX",
      },
    },
  }),
});
```

Aplazo online:

```ts
await apiRequest("/api/payments/aplazo/online/create", {
  method: "POST",
  token,
  body: JSON.stringify({
    orderId,
    successUrl: `${window.location.origin}/checkout/aplazo/success?orderId=${orderId}`,
    failureUrl: `${window.location.origin}/checkout/aplazo/failure?orderId=${orderId}`,
    cancelUrl: `${window.location.origin}/checkout/aplazo/cancel?orderId=${orderId}`,
  }),
});
```

La orden ya contiene `direccionEnvio`, `shipping` y `pricingSnapshot`; los servicios de pago toman el total real desde backend.

## 9. Manejar errores controlados

Errores importantes para UX:

| HTTP | `code` | Accion frontend |
| --- | --- | --- |
| 400 | `SHIPPING_ADDRESS_REQUIRED` | Enfocar formulario de direccion y pedir campos faltantes. |
| 400 | `CHECKOUT_CART_EMPTY` | Regresar a carrito. |
| 409 | `CHECKOUT_STOCK_UNAVAILABLE` | Mostrar producto sin stock y pedir actualizar carrito. |
| 409 | `SHIPPING_RATE_CHANGED` | Volver a mostrar opciones FedEx y pedir confirmacion. |
| 409 | `FEDEX_SERVICE_NOT_AVAILABLE` | Quitar seleccion y recotizar. |
| 422 | `PRODUCT_SHIPPING_DATA_MISSING` | Mostrar mensaje de soporte: producto sin datos logisticos. |
| 422 | `FEDEX_RATE_UNAVAILABLE` | Pedir otra direccion o intentar mas tarde. |
| 429 | rate limit | Esperar unos segundos antes de reintentar. |
| 500/503 | `FEDEX_SERVICE_UNAVAILABLE` | Mostrar error temporal y permitir reintento. |

Normalizador de errores:

```ts
export function getCheckoutErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string; status?: number };

  switch (err.code) {
    case "SHIPPING_RATE_CHANGED":
      return "El costo de envio cambio. Vuelve a confirmar tu envio.";
    case "FEDEX_SERVICE_NOT_AVAILABLE":
      return "Ese servicio FedEx ya no esta disponible para tu direccion.";
    case "FEDEX_RATE_UNAVAILABLE":
      return "FedEx no devolvio tarifas para esta direccion.";
    case "PRODUCT_SHIPPING_DATA_MISSING":
      return "Uno de los productos no tiene datos de envio configurados.";
    case "CHECKOUT_STOCK_UNAVAILABLE":
      return err.message || "Hay productos sin stock suficiente.";
    default:
      return err.message || "No fue posible procesar el checkout.";
  }
}
```

Checklist final para el frontend:

- Validar direccion localmente.
- Validar CP/direccion con FedEx cuando sea posible.
- Cotizar con `/api/carrito/shipping/fedex/quotes`.
- Mostrar `quote.options`.
- Guardar `shippingQuoteId`, `selectedShippingOptionId` y `shippingSelection`.
- Crear orden con `/api/carrito/checkout` sin mandar `costoEnvio`.
- Iniciar Stripe o Aplazo usando `orderId`.
- Manejar `SHIPPING_RATE_CHANGED`, `FEDEX_SERVICE_NOT_AVAILABLE` y `FEDEX_RATE_UNAVAILABLE` como estados recuperables.
