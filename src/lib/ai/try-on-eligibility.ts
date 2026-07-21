import type { TryOnEligibility } from "@/lib/ai/types";

const REASON_MESSAGES: Record<
  NonNullable<TryOnEligibility["reason"]>,
  string
> = {
  TRYON_DISABLED: "El probador virtual no está disponible temporalmente.",
  PRODUCT_UNAVAILABLE: "El producto no está disponible para el probador virtual.",
  PRODUCT_OUT_OF_STOCK: "El producto está agotado por el momento.",
  PRODUCT_IMAGE_UNAVAILABLE:
    "El producto no tiene una imagen compatible con el probador virtual.",
  PRODUCT_UNSUPPORTED:
    "Este producto no es compatible con el probador virtual.",
  PRODUCT_UNCLASSIFIED:
    "No se pudo verificar este producto para el probador virtual.",
  USER_IMAGE_UNAVAILABLE:
    "La imagen seleccionada ya no está disponible. Sube una nueva foto.",
};

/** Presentation-only copy. Eligibility is always decided by the backend. */
export function getTryOnEligibilityMessage(
  eligibility: TryOnEligibility,
): string {
  return eligibility.reason
    ? REASON_MESSAGES[eligibility.reason]
    : "El producto es compatible con el probador virtual.";
}
