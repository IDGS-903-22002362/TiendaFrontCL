/**
 * Telemetria first-party de la tienda.
 *
 * Reutiliza el endpoint existente de eventos de recomendaciones
 * (`/api/recomendaciones/eventos`): el backend ya resuelve visitante anonimo,
 * sesion, retencion y rate limit, y el agente administrativo lee esa misma
 * coleccion para analizar trafico, embudo y conversion.
 *
 * Solo se envian datos agregables y pseudonimos. La atribucion de origen
 * (utm/referrer) requiere consentimiento de analitica.
 */

import { hasCategoryConsent } from "@/lib/cookies/consent-model";
import { readConsentFromDocument } from "@/lib/cookies/consent-storage";
import {
  trackRecommendationEvent,
  type RecommendationEventMetadata,
} from "@/lib/api/recommendations";

type EventSurface = "home" | "producto" | "carrito" | "cuenta" | "checkout";

const MAX_PATH_LENGTH = 160;
const MAX_TERM_LENGTH = 60;
const MAX_HOST_LENGTH = 120;
const MAX_ATTRIBUTION_LENGTH = 60;

/** Evita duplicar la misma vista de pagina por remontajes del router. */
let lastPageViewKey = "";

function send(
  tipo: Parameters<typeof trackRecommendationEvent>[0]["tipo"],
  input: {
    productoId?: string;
    superficie?: EventSurface;
    metadata?: RecommendationEventMetadata;
  } = {},
) {
  // La telemetria nunca debe interrumpir la navegacion ni el checkout.
  void trackRecommendationEvent({ tipo, ...input }).catch(() => undefined);
}

function trim(value: string | null | undefined, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, max) : undefined;
}

function externalReferrerHost(): string | undefined {
  if (typeof document === "undefined" || !document.referrer) {
    return undefined;
  }

  try {
    const { hostname } = new URL(document.referrer);
    return hostname && hostname !== window.location.hostname
      ? trim(hostname, MAX_HOST_LENGTH)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Origen de la visita a partir de parametros utm y del referrer externo. Sin
 * consentimiento de analitica el evento se envia sin atribucion.
 */
function resolveAttribution(): RecommendationEventMetadata {
  if (typeof window === "undefined") {
    return {};
  }

  if (!hasCategoryConsent(readConsentFromDocument(), "analytics")) {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  const source = trim(params.get("utm_source"), MAX_ATTRIBUTION_LENGTH);
  const medium = trim(params.get("utm_medium"), MAX_ATTRIBUTION_LENGTH);
  const campaign = trim(params.get("utm_campaign"), MAX_ATTRIBUTION_LENGTH);
  const referrerHost = externalReferrerHost();

  return {
    ...(source ? { source } : {}),
    ...(medium ? { medium } : {}),
    ...(campaign ? { campaign } : {}),
    ...(referrerHost ? { referrerHost } : {}),
  };
}

/** Visita de una pagina de tienda. La ruta se envia sin query string. */
export function trackStorePageView(pathname: string, surface?: EventSurface) {
  const path = trim(pathname, MAX_PATH_LENGTH);
  if (!path || typeof window === "undefined") {
    return;
  }

  if (lastPageViewKey === path) {
    return;
  }

  lastPageViewKey = path;

  send("vista_pagina", {
    ...(surface ? { superficie: surface } : {}),
    metadata: { path, ...resolveAttribution() },
  });
}

export function trackAddToCart(
  productId: string,
  quantity: number,
  surface: EventSurface = "producto",
) {
  if (!productId) {
    return;
  }

  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0
      ? Math.min(Math.trunc(quantity), 999)
      : 1;

  send("agregar_carrito", {
    productoId: productId,
    superficie: surface,
    metadata: { quantity: safeQuantity },
  });
}

export function trackCheckoutStarted(productIds: string[] = []) {
  void trackRecommendationEvent({
    tipo: "inicio_checkout",
    superficie: "checkout",
    ...(productIds.length > 0
      ? { productoIds: productIds.slice(0, 20) }
      : {}),
  }).catch(() => undefined);
}

/**
 * Compra confirmada. El `orderId` permite al backend deduplicar el evento si el
 * usuario recarga la pantalla de confirmacion.
 */
export function trackPurchase(orderId: string, productIds: string[] = []) {
  const safeOrderId = trim(orderId, 120);
  if (!safeOrderId) {
    return;
  }

  void trackRecommendationEvent({
    tipo: "compra",
    superficie: "checkout",
    ...(productIds.length > 0
      ? { productoIds: productIds.slice(0, 20) }
      : {}),
    metadata: { orderId: safeOrderId },
  }).catch(() => undefined);
}

export function trackSearch(term: string, resultCount?: number) {
  const normalized = trim(term.toLowerCase(), MAX_TERM_LENGTH);
  if (!normalized) {
    return;
  }

  send("busqueda", {
    metadata: {
      term: normalized,
      ...(typeof resultCount === "number" && Number.isFinite(resultCount)
        ? { resultCount: Math.max(0, Math.trunc(resultCount)) }
        : {}),
    },
  });
}
