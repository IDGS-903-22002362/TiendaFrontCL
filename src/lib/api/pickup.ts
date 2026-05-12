import { apiFetch, unwrapData } from "./client";

type UnknownRecord = Record<string, unknown>;

export type FulfillmentMethod = "DELIVERY" | "PICKUP";

export type PickupLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  active: boolean;
  pickupEnabled: boolean;
  pickupInstructions?: string;
  estimatedPreparationMinutes?: number;
};

export type PickupContact = {
  name: string;
  phone?: string;
  email?: string;
};

export type PickupAvailability = {
  canPickup: boolean;
  pickupLocationId: string;
  inventoryScope?: string;
  availableItems: Array<{
    productoId: string;
    tallaId?: string;
    requestedQuantity: number;
    availableQuantity: number;
    available: boolean;
  }>;
  unavailableItems: Array<{
    productoId: string;
    tallaId?: string;
    requestedQuantity: number;
    availableQuantity: number;
    available: boolean;
  }>;
};

function toStringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function mapPickupLocation(input: unknown): PickupLocation {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    id: toStringValue(item.id ?? item._id),
    name: toStringValue(item.name ?? item.nombre, "Sucursal"),
    address: toStringValue(item.address ?? item.direccion),
    city: toStringValue(item.city ?? item.ciudad),
    state: toStringValue(item.state ?? item.estado),
    postalCode: toStringValue(item.postalCode ?? item.codigoPostal),
    country: toStringValue(item.country ?? item.pais, "MX"),
    phone: toStringValue(item.phone ?? item.telefono) || undefined,
    active: toBoolean(item.active ?? item.activa, true),
    pickupEnabled: toBoolean(item.pickupEnabled, true),
    pickupInstructions:
      toStringValue(item.pickupInstructions ?? item.instruccionesPickup) ||
      undefined,
    estimatedPreparationMinutes: toNumber(item.estimatedPreparationMinutes),
  };
}

function mapAvailabilityItem(input: unknown) {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    productoId: toStringValue(item.productoId),
    tallaId: toStringValue(item.tallaId) || undefined,
    requestedQuantity: Number(item.requestedQuantity ?? 0),
    availableQuantity: Number(item.availableQuantity ?? 0),
    available: toBoolean(item.available),
  };
}

function mapPickupAvailability(input: unknown): PickupAvailability {
  const item =
    input && typeof input === "object" ? (input as UnknownRecord) : {};

  return {
    canPickup: toBoolean(item.canPickup),
    pickupLocationId: toStringValue(item.pickupLocationId),
    inventoryScope: toStringValue(item.inventoryScope) || undefined,
    availableItems: Array.isArray(item.availableItems)
      ? item.availableItems.map(mapAvailabilityItem)
      : [],
    unavailableItems: Array.isArray(item.unavailableItems)
      ? item.unavailableItems.map(mapAvailabilityItem)
      : [],
  };
}

export const pickupApi = {
  async listLocations() {
    const payload = await apiFetch<unknown>(
      "/api/pickup-locations",
      { method: "GET" },
      { local: true },
    );
    const data = unwrapData<unknown>(payload);
    return Array.isArray(data)
      ? data.map(mapPickupLocation).filter((item) => item.id)
      : [];
  },

  async validateAvailability(params: {
    locationId: string;
    cartId: string;
    sessionId?: string;
  }) {
    const payload = await apiFetch<unknown>(
      `/api/pickup-locations/${params.locationId}/availability`,
      {
        method: "POST",
        body: JSON.stringify({ cartId: params.cartId }),
      },
      { local: true, sessionId: params.sessionId },
    );

    return mapPickupAvailability(unwrapData<unknown>(payload));
  },
};
