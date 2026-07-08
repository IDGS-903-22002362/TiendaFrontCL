import type { CookieCategory } from "./constants";

export type StorageKind = "cookie" | "localStorage" | "sessionStorage";

export type RegistryEntry = {
  name: string;
  kind: StorageKind;
  category: CookieCategory;
  purpose: string;
  duration: string;
  owner: "first-party" | "third-party";
  personalData: boolean;
  jsAccessible: boolean;
  /** Proveedor externo si aplica */
  provider?: string;
  /** Dependencias / notas */
  notes?: string;
};

/**
 * Inventario real del sistema. Actualizar al agregar cookies, storage o scripts.
 */
export const COOKIE_REGISTRY: RegistryEntry[] = [
  {
    name: "tiendafront_api_token",
    kind: "cookie",
    category: "necessary",
    purpose: "Token de sesión autenticada (HttpOnly, servidor Next.js).",
    duration: "7 días",
    owner: "first-party",
    personalData: true,
    jsAccessible: false,
  },
  {
    name: "tiendafront_user_role",
    kind: "cookie",
    category: "necessary",
    purpose: "Rol del usuario para navegación y permisos UX.",
    duration: "7 días",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "tiendafront_user_data",
    kind: "cookie",
    category: "necessary",
    purpose: "Datos mínimos de perfil (uid, email, nombre, perfilCompleto).",
    duration: "7 días",
    owner: "first-party",
    personalData: true,
    jsAccessible: true,
  },
  {
    name: "tiendafront_csrf_token",
    kind: "cookie",
    category: "necessary",
    purpose: "Protección CSRF en rutas con sesión por cookie.",
    duration: "Sesión / 7 días",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "tiendafront_cookie_consent",
    kind: "cookie",
    category: "necessary",
    purpose: "Preferencias de consentimiento de cookies.",
    duration: "13 meses",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "cl_app_context",
    kind: "cookie",
    category: "necessary",
    purpose: "Contexto de privacidad para WebView iOS/Android (sin datos personales).",
    duration: "12 meses",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "tiendafront_session_id",
    kind: "localStorage",
    category: "necessary",
    purpose: "Identificador anónimo de carrito de invitado.",
    duration: "Persistente hasta borrado",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
    notes: "Solo ID aleatorio; productos y totales viven en backend.",
  },
  {
    name: "tiendafront_codigo_promocion",
    kind: "localStorage",
    category: "necessary",
    purpose: "Código promocional aplicado (validación en backend).",
    duration: "Persistente hasta borrado",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "tiendafront_checkout_idempotency_key",
    kind: "sessionStorage",
    category: "necessary",
    purpose: "Clave de idempotencia para evitar pedidos duplicados en checkout.",
    duration: "Sesión de pestaña",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "from_mobile_app",
    kind: "sessionStorage",
    category: "necessary",
    purpose: "Detección de WebView de app móvil Club León.",
    duration: "Sesión de pestaña",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "tiendafront_wishlist_ids",
    kind: "localStorage",
    category: "preferences",
    purpose: "Lista de deseos local (invitado).",
    duration: "Persistente hasta borrado",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "tiendafront_personalization",
    kind: "localStorage",
    category: "preferences",
    purpose: "Preferencias de personalización de catálogo.",
    duration: "Persistente hasta borrado",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
  },
  {
    name: "sidebar_state",
    kind: "cookie",
    category: "preferences",
    purpose: "Estado abierto/cerrado del panel lateral admin.",
    duration: "7 días",
    owner: "first-party",
    personalData: false,
    jsAccessible: true,
    notes: "Solo panel admin.",
  },
];

export type ExternalScript = {
  id: string;
  category: Exclude<CookieCategory, "necessary">;
  provider: string;
  description: string;
  envKey?: string;
};

/** Scripts de terceros condicionados al consentimiento. Solo se cargan si hay ID en env. */
export const EXTERNAL_SCRIPTS: ExternalScript[] = [
  {
    id: "ga4",
    category: "analytics",
    provider: "Google Analytics 4",
    description: "Medición de audiencia y comportamiento.",
    envKey: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  },
  {
    id: "gtm",
    category: "analytics",
    provider: "Google Tag Manager",
    description: "Contenedor de etiquetas de analítica.",
    envKey: "NEXT_PUBLIC_GTM_ID",
  },
  {
    id: "meta-pixel",
    category: "marketing",
    provider: "Meta (Facebook) Pixel",
    description: "Remarketing y conversiones.",
    envKey: "NEXT_PUBLIC_META_PIXEL_ID",
  },
  {
    id: "google-ads",
    category: "marketing",
    provider: "Google Ads",
    description: "Remarketing y conversiones.",
    envKey: "NEXT_PUBLIC_GOOGLE_ADS_ID",
  },
  {
    id: "tiktok",
    category: "marketing",
    provider: "TikTok Pixel",
    description: "Remarketing y conversiones.",
    envKey: "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
  },
  {
    id: "hotjar",
    category: "analytics",
    provider: "Hotjar",
    description: "Mapas de calor y grabaciones de sesión.",
    envKey: "NEXT_PUBLIC_HOTJAR_ID",
  },
  {
    id: "clarity",
    category: "analytics",
    provider: "Microsoft Clarity",
    description: "Análisis de interacción y mapas de calor.",
    envKey: "NEXT_PUBLIC_CLARITY_ID",
  },
];

/** Proveedores necesarios (siempre activos, sin consentimiento de marketing). */
export const NECESSARY_THIRD_PARTIES = [
  {
    provider: "Firebase Authentication",
    purpose: "Inicio de sesión, registro y gestión de cuenta.",
  },
  {
    provider: "Stripe",
    purpose: "Procesamiento seguro de pagos con tarjeta.",
  },
  {
    provider: "Aplazo",
    purpose: "Financiamiento y pagos a plazos.",
  },
  {
    provider: "Google Maps",
    purpose: "Autocompletado y validación de dirección de envío.",
  },
];

export function getRegistryByCategory(category: CookieCategory): RegistryEntry[] {
  return COOKIE_REGISTRY.filter((entry) => entry.category === category);
}
