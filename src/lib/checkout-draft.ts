import type { FulfillmentMethod, PickupContact } from "@/lib/api/pickup";

const CHECKOUT_DRAFT_STORAGE_KEY = "tiendafront_checkout_draft";
const DRAFT_VERSION = 1;
const DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

export type PersistedCheckoutDraft = {
  version: typeof DRAFT_VERSION;
  paymentSignature: string;
  fulfillmentMethod: FulfillmentMethod;
  checkoutValues: unknown;
  selectedPickupLocationId: string;
  pickupContact: PickupContact;
  savedAt: number;
};

export type CheckoutDraftInput = Omit<
  PersistedCheckoutDraft,
  "version" | "savedAt"
>;

function isValidDraft(value: unknown): value is PersistedCheckoutDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.version === DRAFT_VERSION &&
    typeof record.paymentSignature === "string" &&
    (record.fulfillmentMethod === "DELIVERY" ||
      record.fulfillmentMethod === "PICKUP") &&
    typeof record.checkoutValues === "object" &&
    record.checkoutValues !== null &&
    typeof record.savedAt === "number"
  );
}

export function saveCheckoutDraft(draft: CheckoutDraftInput): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedCheckoutDraft = {
    ...draft,
    version: DRAFT_VERSION,
    savedAt: Date.now(),
  };

  window.sessionStorage.setItem(
    CHECKOUT_DRAFT_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function loadCheckoutDraft(): PersistedCheckoutDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidDraft(parsed)) {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
    return null;
  }
}

export function clearCheckoutDraft(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
}