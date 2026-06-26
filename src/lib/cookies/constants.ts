/** Versión de la política de cookies. Incrementar para re-solicitar consentimiento. */
export const COOKIE_POLICY_VERSION = "1.0.0";

/** Cookie propia que almacena el consentimiento del usuario. */
export const CONSENT_COOKIE_NAME = "tiendafront_cookie_consent";

/** Duración del consentimiento: 13 meses (recomendación CNIL/ICO). */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 395;

/** Cookie CSRF (double-submit) para rutas con sesión HttpOnly. */
export const CSRF_COOKIE_NAME = "tiendafront_csrf_token";

export const CSRF_HEADER_NAME = "x-csrf-token";

/** Marcador interno: sesion activa via cookie HttpOnly sin JWT legible en JS. */
export const COOKIE_SESSION_TOKEN = "cookie-session";

export function isCookieBoundSessionToken(token?: string | null): boolean {
  return token === COOKIE_SESSION_TOKEN;
}

export function isBearerJwt(token?: string | null): boolean {
  if (!token || isCookieBoundSessionToken(token)) {
    return false;
  }

  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function resolveClientBearerToken(
  token?: string | null,
): string | undefined {
  if (!isBearerJwt(token)) {
    return undefined;
  }

  return token ?? undefined;
}

export function resolveAuthorizationHeader(
  headerAuthorization: string | null | undefined,
  cookieToken: string | null | undefined,
): string {
  const headerValue = headerAuthorization?.startsWith("Bearer ")
    ? headerAuthorization.slice("Bearer ".length).trim()
    : "";

  if (isBearerJwt(headerValue)) {
    return `Bearer ${headerValue}`;
  }

  if (isBearerJwt(cookieToken)) {
    return `Bearer ${cookieToken}`;
  }

  return "";
}

export type CookieCategory =
  | "necessary"
  | "preferences"
  | "analytics"
  | "marketing";

export type ConsentCategories = Record<CookieCategory, boolean>;

export const DEFAULT_CONSENT: ConsentCategories = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

export const ALL_ACCEPTED_CONSENT: ConsentCategories = {
  necessary: true,
  preferences: true,
  analytics: true,
  marketing: true,
};
