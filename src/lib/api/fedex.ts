import type {
  AddressValidationStatus,
  FedExAddress,
  FedExAddressValidation,
  FedExResolvedAddress,
  FedExShippingOption,
  FedExShippingQuote,
  FedExTracking,
  FedExTrackingEvent,
  ShippingSelection,
} from "@/lib/types";
import { getMxStateByFedexCode, MX_STATES } from "@/lib/shipping/mx-states";
import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

export const MX_FEDEX_STATES = MX_STATES;

const MX_FEDEX_STATE_ALIASES: Record<string, string> = {
  "aguascalientes": "AG",
  "ag": "AG",
  "baja california": "BC",
  "bc": "BC",
  "baja california sur": "BS",
  "bcs": "BS",
  "bs": "BS",
  "campeche": "CM",
  "cm": "CM",
  "chiapas": "CS",
  "cs": "CS",
  "chihuahua": "CH",
  "ch": "CH",
  "ciudad de mexico": "DF",
  "cdmx": "DF",
  "df": "DF",
  "distrito federal": "DF",
  "coahuila": "CO",
  "coahuila de zaragoza": "CO",
  "co": "CO",
  "colima": "CL",
  "cl": "CL",
  "durango": "DG",
  "dg": "DG",
  "estado de mexico": "EM",
  "mexico": "EM",
  "edomex": "EM",
  "em": "EM",
  "guanajuato": "GT",
  "gto": "GT",
  "gua": "GT",
  "gt": "GT",
  "guerrero": "GR",
  "gro": "GR",
  "gr": "GR",
  "hidalgo": "HG",
  "hgo": "HG",
  "hg": "HG",
  "jalisco": "JA",
  "jal": "JA",
  "ja": "JA",
  "michoacan": "MI",
  "michoacan de ocampo": "MI",
  "mich": "MI",
  "mi": "MI",
  "morelos": "MO",
  "mor": "MO",
  "mo": "MO",
  "nayarit": "NA",
  "nay": "NA",
  "na": "NA",
  "nuevo leon": "NL",
  "nl": "NL",
  "oaxaca": "OA",
  "oax": "OA",
  "oa": "OA",
  "puebla": "PU",
  "pue": "PU",
  "pu": "PU",
  "queretaro": "QE",
  "qro": "QE",
  "qe": "QE",
  "quintana roo": "QR",
  "q roo": "QR",
  "qr": "QR",
  "san luis potosi": "SL",
  "slp": "SL",
  "sl": "SL",
  "sinaloa": "SI",
  "sin": "SI",
  "si": "SI",
  "sonora": "SO",
  "son": "SO",
  "so": "SO",
  "tabasco": "TB",
  "tab": "TB",
  "tb": "TB",
  "tamaulipas": "TM",
  "tam": "TM",
  "tm": "TM",
  "tlaxcala": "TL",
  "tlax": "TL",
  "tl": "TL",
  "veracruz": "VE",
  "veracruz de ignacio de la llave": "VE",
  "ver": "VE",
  "ve": "VE",
  "yucatan": "YU",
  "yuc": "YU",
  "yu": "YU",
  "zacatecas": "ZA",
  "zac": "ZA",
  "za": "ZA",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:()[\]{}"'`´_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeMexicoFedExStateCode(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeText(value);
  const alias = MX_FEDEX_STATE_ALIASES[normalized];
  if (alias) {
    return alias;
  }

  const compact = normalized.replace(/\s+/g, "");
  const compactAlias = MX_FEDEX_STATE_ALIASES[compact];
  if (compactAlias) {
    return compactAlias;
  }

  const cleanedCode = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  return cleanedCode || value.trim().toUpperCase();
}

export function getMexicoStateLabelFromFedExCode(value?: string) {
  return getMxStateByFedexCode(value)?.label;
}

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => toStringValue(item)).filter(Boolean)
    : typeof value === "string" && value
      ? [value]
      : [];
}

export function normalizeFedExShippingOption(input: unknown): FedExShippingOption {
  const item = input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    provider: "FEDEX",
    optionId: toStringValue(item.optionId ?? item.id) || undefined,
    serviceType: toStringValue(item.serviceType),
    serviceName: toStringValue(item.serviceName ?? item.name) || undefined,
    packagingType: toStringValue(item.packagingType) || undefined,
    amount: toNumber(item.amount ?? item.total ?? item.costoEnvio, 0),
    currency: toStringValue(item.currency, "MXN") || "MXN",
    estimatedDeliveryDate:
      toStringValue(item.estimatedDeliveryDate ?? item.eta) || undefined,
    transitTime: toStringValue(item.transitTime) || undefined,
    rateType: toStringValue(item.rateType) || undefined,
    surcharges: Array.isArray(item.surcharges)
      ? item.surcharges.map((surcharge) => {
          const record =
            surcharge && typeof surcharge === "object"
              ? (surcharge as UnknownRecord)
              : {};
          return {
            type: toStringValue(record.type) || undefined,
            description:
              toStringValue(record.description ?? record.name) || undefined,
            amount: toNumber(record.amount, 0),
            currency: toStringValue(record.currency, "MXN") || "MXN",
          };
        })
      : undefined,
  };
}

export function normalizeFedExShippingQuote(input: unknown): FedExShippingQuote {
  const data = unwrapData<unknown>(input);
  const item = data && typeof data === "object" ? (data as UnknownRecord) : {};

  return {
    provider: "FEDEX",
    quoteId: toStringValue(item.quoteId),
    currency: toStringValue(item.currency, "MXN") || "MXN",
    requiresShipping:
      typeof item.requiresShipping === "boolean"
        ? item.requiresShipping
        : true,
    expiresAt: toStringValue(item.expiresAt) || undefined,
    options: Array.isArray(item.options)
      ? item.options.map(normalizeFedExShippingOption)
      : [],
  };
}

function mapResolvedAddress(input: unknown): FedExResolvedAddress | undefined {
  const item = input && typeof input === "object" ? (input as UnknownRecord) : undefined;
  if (!item) {
    return undefined;
  }

  return {
    streetLines: toStringArray(item.streetLines),
    city: toStringValue(item.city) || undefined,
    stateOrProvinceCode: toStringValue(item.stateOrProvinceCode) || undefined,
    postalCode: toStringValue(item.postalCode),
    countryCode: toStringValue(item.countryCode, "MX"),
    residential:
      typeof item.residential === "boolean" ? item.residential : undefined,
    isLikelyValid: toBoolean(item.isLikelyValid, false),
    isResolved: toBoolean(item.isResolved, false),
    isStandardized: toBoolean(item.isStandardized, false),
    isDeliveryPointValid: toBoolean(item.isDeliveryPointValid, false),
    attributes:
      item.attributes && typeof item.attributes === "object"
        ? (item.attributes as Record<string, unknown>)
        : undefined,
  };
}

function mapAddressValidation(input: unknown): FedExAddressValidation {
  const root = input && typeof input === "object" ? (input as UnknownRecord) : {};
  const data = unwrapData<unknown>(input);
  const item = data && typeof data === "object" ? (data as UnknownRecord) : {};
  const addresses = Array.isArray(item.addresses)
    ? item.addresses
        .map(mapResolvedAddress)
        .filter((address): address is FedExResolvedAddress => Boolean(address))
    : [];
  const resolved =
    mapResolvedAddress(item.resolvedAddress) ??
    mapResolvedAddress(item.address) ??
    addresses[0];
  const isSuccess = toBoolean(root.success, false) || toBoolean(item.success, false);
  const hasUsableAddress = addresses.some((address) => {
    const attributes = address.attributes ?? {};
    return (
      address.isLikelyValid === true ||
      address.isStandardized === true ||
      attributes.AddressType === "STANDARDIZED" ||
      attributes.Matched === true ||
      attributes.Matched === "true" ||
      attributes.ValidlyFormed === true ||
      attributes.ValidlyFormed === "true"
    );
  });

  return {
    isValid:
      toBoolean(item.isValid, false) ||
      addresses.some((address) => address.isLikelyValid),
    success: isSuccess || hasUsableAddress,
    classification: toStringValue(item.classification) || undefined,
    addressState: toStringValue(item.addressState) || undefined,
    resolvedAddress: resolved,
    addresses: addresses.length > 0 ? addresses : undefined,
    changes: Array.isArray(item.changes)
      ? (item.changes as FedExAddressValidation["changes"])
      : undefined,
    warnings: toStringArray(item.warnings),
    customerMessages: toStringArray(item.customerMessages),
  };
}

function mapTrackingEvent(input: unknown): FedExTrackingEvent {
  const item = input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    timestamp: toStringValue(item.timestamp ?? item.createdAt) || undefined,
    status: toStringValue(item.status) || undefined,
    statusLabel: toStringValue(item.statusLabel) || undefined,
    description: toStringValue(item.description ?? item.statusDescription) || undefined,
    location: toStringValue(item.location ?? item.lastLocation) || undefined,
  };
}

function mapTracking(input: unknown): FedExTracking {
  const data = unwrapData<unknown>(input);
  const item = data && typeof data === "object" ? (data as UnknownRecord) : {};

  return {
    trackingNumber: toStringValue(item.trackingNumber) || undefined,
    status: toStringValue(item.status) || undefined,
    statusLabel: toStringValue(item.statusLabel) || undefined,
    statusDescription: toStringValue(item.statusDescription) || undefined,
    estimatedDeliveryDate:
      toStringValue(item.estimatedDeliveryDate ?? item.eta) || undefined,
    deliveredAt: toStringValue(item.deliveredAt) || undefined,
    lastLocation: toStringValue(item.lastLocation) || undefined,
    events: Array.isArray(item.events) ? item.events.map(mapTrackingEvent) : [],
    warnings: toStringArray(item.warnings),
  };
}

export type FedExDireccionEnvio = {
  nombre: string;
  calle: string;
  numero: string;
  numeroInterior?: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  stateOrProvinceCode?: string;
  countryCode?: "MX";
  postalCode?: string;
  telefono: string;
  referencias?: string;
  addressValidationStatus?: AddressValidationStatus;
};

export type FedExQuoteAddress = FedExAddress & {
  name: string;
  phone: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  state: string;
};

export type FedExQuoteDireccionEnvio = FedExDireccionEnvio & {
  stateOrProvinceCode?: string;
  countryCode: "MX";
  postalCode: string;
};

export type FedExQuotePayload = {
  direccionEnvio: FedExQuoteDireccionEnvio;
  shippingAddress: FedExQuoteAddress;
  fedexAddress: FedExQuoteAddress;
};

export type FedExPostalValidationResult = {
  isValid: boolean;
  alerts: string[];
};

export function toFedexRecipient(address: FedExDireccionEnvio): FedExAddress {
  const line1 = `${address.calle} ${address.numero}`.trim();
  const line2 = [
    address.colonia,
    address.numeroInterior ? `Int ${address.numeroInterior}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    streetLines: [line1, line2, address.referencias || ""]
      .filter(Boolean)
      .slice(0, 3),
    city: address.ciudad,
    stateOrProvinceCode: normalizeMexicoFedExStateCode(
      address.stateOrProvinceCode ?? address.estado,
    ),
    postalCode: address.postalCode ?? address.codigoPostal,
    countryCode: "MX",
    residential: true,
  };
}

export function buildFedExQuotePayload(
  direccionEnvio: FedExDireccionEnvio,
): FedExQuotePayload {
  const fedexRecipient = toFedexRecipient(direccionEnvio);
  const stateOrProvinceCode = normalizeMexicoFedExStateCode(
    direccionEnvio.stateOrProvinceCode ?? direccionEnvio.estado,
  );
  const postalCode = direccionEnvio.postalCode ?? direccionEnvio.codigoPostal;
  const normalizedAddress: FedExQuoteAddress = {
    name: direccionEnvio.nombre,
    phone: direccionEnvio.telefono,
    street: direccionEnvio.calle,
    exteriorNumber: direccionEnvio.numero,
    ...(direccionEnvio.numeroInterior
      ? { interiorNumber: direccionEnvio.numeroInterior }
      : {}),
    neighborhood: direccionEnvio.colonia,
    streetLines: fedexRecipient.streetLines,
    city: direccionEnvio.ciudad,
    state: direccionEnvio.estado,
    stateOrProvinceCode,
    postalCode,
    countryCode: "MX",
    residential: true,
  };

  return {
    direccionEnvio: {
      ...direccionEnvio,
      stateOrProvinceCode,
      countryCode: "MX",
      postalCode,
    },
    shippingAddress: normalizedAddress,
    fedexAddress: normalizedAddress,
  };
}

export function buildShippingSelection(
  option: FedExShippingOption,
): ShippingSelection {
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

export const fedexApi = {
  async validatePostal(input: {
    countryCode: "MX";
    postalCode: string;
    stateOrProvinceCode?: string;
    city?: string;
  }) {
    const payload = await apiFetch<unknown>(
      "/api/shipping/fedex/postal/validate",
      {
        method: "POST",
        body: JSON.stringify({
          carrierCode: "FDXE",
          ...input,
          stateOrProvinceCode: normalizeMexicoFedExStateCode(
            input.stateOrProvinceCode,
          ),
        }),
      },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    const item = data && typeof data === "object" ? (data as UnknownRecord) : {};

    return {
      isValid: toBoolean(item.isValid, false),
      alerts: [
        ...toStringArray(item.alerts),
        ...toStringArray(item.customerMessages),
      ],
    } as FedExPostalValidationResult;
  },

  async validateAddress(address: FedExAddress) {
    const addressPayload = {
      streetLines: address.streetLines,
      city: address.city,
      stateOrProvinceCode: normalizeMexicoFedExStateCode(
        address.stateOrProvinceCode,
      ),
      postalCode: address.postalCode,
      countryCode: address.countryCode,
    };
    const payload = await apiFetch<unknown>(
      "/api/shipping/fedex/address/validate",
      {
        method: "POST",
        body: JSON.stringify({
          ...addressPayload,
          includeResolutionTokens: true,
        }),
      },
      { local: true },
    );
    return mapAddressValidation(payload);
  },

  async quoteCart(direccionEnvio: FedExDireccionEnvio) {
    const quotePayload = buildFedExQuotePayload(direccionEnvio);

    console.log("[FedEx Quote Payload]", {
      payload: quotePayload,
      direccionEnvio: quotePayload.direccionEnvio,
      shippingAddress: quotePayload.shippingAddress,
      fedexAddress: quotePayload.fedexAddress,
      stateOrProvinceCode:
        quotePayload.fedexAddress.stateOrProvinceCode ??
        quotePayload.shippingAddress.stateOrProvinceCode,
      streetLines: quotePayload.fedexAddress.streetLines,
    });

    const payload = await apiFetch<unknown>(
      "/api/carrito/shipping/fedex/quotes",
      {
        method: "POST",
        body: JSON.stringify(quotePayload),
      },
      { local: true },
    );
    return normalizeFedExShippingQuote(payload);
  },

  async getOrderTracking(orderId: string) {
    const payload = await apiFetch<unknown>(
      `/api/orders/${orderId}/tracking`,
      { method: "GET" },
      { local: true },
    );
    return mapTracking(payload);
  },
};

export const fedexAdminApi = {
  health(kind: "auth" | "rates" | "address") {
    return apiFetch<unknown>(
      `/api/admin/fedex/${kind}/health`,
      { method: "GET" },
      { local: true },
    );
  },

  shipOrder(orderId: string, body?: { serviceType?: string; labelImageType?: "PDF" | "PNG" }) {
    return apiFetch<unknown>(
      `/api/admin/orders/${orderId}/fedex/ship`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
      { local: true },
    );
  },

  cancelShipment(
    orderId: string,
    body: { reason: string; forceRefreshTracking?: boolean },
  ) {
    return apiFetch<unknown>(
      `/api/admin/orders/${orderId}/fedex/cancel-shipment`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      { local: true },
    );
  },

  async getOrderTracking(orderId: string) {
    const payload = await apiFetch<unknown>(
      `/api/admin/orders/${orderId}/fedex/tracking`,
      { method: "GET" },
      { local: true },
    );
    return mapTracking(payload);
  },

  track(body: { trackingNumbers: string[]; includeDetailedScans?: boolean }) {
    return apiFetch<unknown>(
      "/api/admin/fedex/track",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      { local: true },
    );
  },

  pickupAvailability(body: Record<string, unknown>) {
    return apiFetch<unknown>(
      "/api/admin/fedex/pickups/availability",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      { local: true },
    );
  },

  createPickup(body: Record<string, unknown>) {
    return apiFetch<unknown>(
      "/api/admin/fedex/pickups",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      { local: true },
    );
  },

  cancelPickup(pickupId: string, body?: Record<string, unknown>) {
    return apiFetch<unknown>(
      `/api/admin/fedex/pickups/${pickupId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
      { local: true },
    );
  },

  createTestLabel(body?: Record<string, unknown>) {
    return apiFetch<unknown>(
      "/api/admin/fedex/ship/test-label",
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
      { local: true },
    );
  },

  cancelTestLabel(body?: Record<string, unknown>) {
    return apiFetch<unknown>(
      "/api/admin/fedex/ship/cancel-test",
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
      { local: true },
    );
  },
};
