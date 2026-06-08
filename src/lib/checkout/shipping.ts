import type { AddressValidationStatus, FedExShippingOption } from "@/lib/types";
import { getMxStateByLabel } from "@/lib/shipping/mx-states";
import type {
  CheckoutShippingAddress,
  CheckoutShippingSelection,
} from "@/types/shipping";

type ShippingAddressInput = {
  fullName?: string;
  phone?: string;
  street1: string;
  street2?: string;
  interiorNumber?: string;
  references?: string;
  city?: string;
  stateLabel?: string;
  postalCode: string;
  countryCode?: string;
  formattedAddress?: string;
};

type LegacyDireccionEnvio = {
  nombre: string;
  calle: string;
  numero: string;
  numeroInterior?: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  referencias?: string;
  addressValidationStatus?: AddressValidationStatus;
};

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

function splitStreetAndNumber(street1: string) {
  const normalized = normalizeText(street1);
  const match = normalized.match(/^(.*?)(?:\s+)?(#?\d[\w\-\/]*)$/);

  if (!match?.[1] || !match[2]) {
    return {
      calle: normalized,
      numero: "S/N",
    };
  }

  return {
    calle: normalizeText(match[1]),
    numero: normalizeText(match[2]),
  };
}

export function buildCheckoutShippingAddress(
  input: ShippingAddressInput,
  addressValidationStatus: AddressValidationStatus = "USER_CONFIRMED",
): CheckoutShippingAddress {
  const streetLines = [
    input.street1,
    input.street2,
    input.interiorNumber ? `Interior ${input.interiorNumber}` : "",
  ]
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const selectedState = getMxStateByLabel(input.stateLabel);

  return {
    displayAddress: {
      fullName: normalizeText(input.fullName) || undefined,
      phone: normalizeText(input.phone) || undefined,
      street1: normalizeText(input.street1),
      street2: normalizeText(input.street2) || undefined,
      interiorNumber: normalizeText(input.interiorNumber) || undefined,
      references: normalizeText(input.references) || undefined,
      city: normalizeText(input.city) || undefined,
      stateLabel: normalizeText(input.stateLabel) || undefined,
      postalCode: normalizeText(input.postalCode),
      countryCode: normalizeText(input.countryCode) || "MX",
      formattedAddress: normalizeText(input.formattedAddress) || undefined,
    },
    fedexAddress: {
      streetLines,
      city: normalizeText(input.city) || undefined,
      stateOrProvinceCode: selectedState?.fedexCode,
      postalCode: normalizeText(input.postalCode),
      countryCode: normalizeText(input.countryCode) || "MX",
      residential: true,
    },
    addressValidationStatus,
  };
}

export function toLegacyDireccionEnvio(
  shippingAddress: CheckoutShippingAddress,
): LegacyDireccionEnvio {
  const { displayAddress, fedexAddress, addressValidationStatus } = shippingAddress;
  const { calle, numero } = splitStreetAndNumber(displayAddress.street1);

  return {
    nombre: normalizeText(displayAddress.fullName),
    calle,
    numero,
    ...(normalizeText(displayAddress.interiorNumber)
      ? { numeroInterior: normalizeText(displayAddress.interiorNumber) }
      : {}),
    colonia: normalizeText(displayAddress.street2),
    ciudad: normalizeText(displayAddress.city),
    estado:
      normalizeText(displayAddress.stateLabel) ||
      normalizeText(fedexAddress?.stateOrProvinceCode),
    codigoPostal: normalizeText(displayAddress.postalCode),
    telefono: normalizeText(displayAddress.phone),
    ...(normalizeText(displayAddress.references)
      ? { referencias: normalizeText(displayAddress.references) }
      : {}),
    ...(addressValidationStatus ? { addressValidationStatus } : {}),
  };
}

export function buildCheckoutShippingSelection(
  option: FedExShippingOption,
): CheckoutShippingSelection {
  return {
    method: "FEDEX",
    provider: "FEDEX",
    serviceType: option.serviceType,
    serviceName: option.serviceName,
    carrierCode: option.provider,
    packagingType: option.packagingType,
    quotedAmount: option.amount,
    quotedCurrency: option.currency,
    transitTime: option.transitTime,
    deliveryTimestamp: option.estimatedDeliveryDate,
  };
}
