export type CheckoutDisplayAddress = {
  fullName?: string;
  phone?: string;
  street1: string;
  street2?: string;
  interiorNumber?: string;
  references?: string;
  city?: string;
  stateLabel?: string;
  postalCode: string;
  countryCode: string;
  formattedAddress?: string;
};

export type CheckoutFedexAddress = {
  streetLines: string[];
  city?: string;
  stateOrProvinceCode?: string;
  postalCode: string;
  countryCode: string;
  residential?: boolean;
};

export type CheckoutShippingAddress = {
  displayAddress: CheckoutDisplayAddress;
  fedexAddress?: CheckoutFedexAddress;
  addressValidationStatus?:
    | "VALIDATED"
    | "SUGGESTED"
    | "USER_CONFIRMED"
    | "NOT_VALIDATED"
    | "VALIDATION_UNAVAILABLE";
};

export type ShippingMethod = "PICKUP" | "FEDEX" | "MANUAL";

export type CheckoutShippingSelection = {
  method: ShippingMethod;
  provider?: "FEDEX";
  serviceType?: string;
  serviceName?: string;
  carrierCode?: string;
  packagingType?: string;
  quotedAmount?: number;
  quotedCurrency?: string;
  transitTime?: string;
  deliveryTimestamp?: string;
};
