import type { CookieCategory } from "@/lib/cookies/constants";
import { CL_APP_CONTEXT_COOKIE } from "./constants";

export type CookieAllowlistEntry = {
  name: string;
  category: CookieCategory;
  purpose: string;
};

/**
 * Cookies y storage de primera parte permitidos en modo aplicación (solo strictly_necessary).
 */
export const APP_MODE_COOKIE_ALLOWLIST: CookieAllowlistEntry[] = [
  {
    name: "tiendafront_api_token",
    category: "necessary",
    purpose: "Sesión autenticada HttpOnly.",
  },
  {
    name: "tiendafront_user_role",
    category: "necessary",
    purpose: "Rol de usuario para navegación UX.",
  },
  {
    name: "tiendafront_user_data",
    category: "necessary",
    purpose: "Datos mínimos de perfil.",
  },
  {
    name: "tiendafront_csrf_token",
    category: "necessary",
    purpose: "Protección CSRF.",
  },
  {
    name: "tiendafront_cookie_consent",
    category: "necessary",
    purpose: "Registro de consentimiento necesario-only en app.",
  },
  {
    name: CL_APP_CONTEXT_COOKIE,
    category: "necessary",
    purpose: "Contexto de privacidad WebView móvil.",
  },
  {
    name: "tiendafront_session_id",
    category: "necessary",
    purpose: "Identificador anónimo de carrito invitado (localStorage).",
  },
  {
    name: "tiendafront_codigo_promocion",
    category: "necessary",
    purpose: "Código promocional aplicado.",
  },
  {
    name: "tiendafront_checkout_idempotency_key",
    category: "necessary",
    purpose: "Idempotencia de checkout.",
  },
  {
    name: "tiendafront_checkout_recovery",
    category: "necessary",
    purpose: "Recuperación de checkout en curso.",
  },
  {
    name: "from_mobile_app",
    category: "necessary",
    purpose: "Detección legacy de WebView (sessionStorage).",
  },
];

/** Prefijos de cookies de terceros bloqueadas/eliminadas en modo app. */
export const BLOCKED_TRACKING_COOKIE_PREFIXES = [
  "_ga",
  "_gid",
  "_gat",
  "_gcl",
  "_fbp",
  "_fbc",
  "_tt",
  "tt_",
  "_hj",
  "_clck",
  "_clsk",
  "CLID",
] as const;

/** Dominios de marketing/analytics que no deben cargarse en modo app. */
export const BLOCKED_TRACKING_DOMAINS = [
  "googletagmanager.com",
  "google-analytics.com",
  "doubleclick.net",
  "connect.facebook.net",
  "facebook.com",
  "analytics.tiktok.com",
  "clarity.ms",
  "hotjar.com",
  "static.hotjar.com",
] as const;
