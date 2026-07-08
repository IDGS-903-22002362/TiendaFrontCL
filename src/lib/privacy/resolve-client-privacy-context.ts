import {
  APP_SOURCE_QUERY_PARAM,
  CL_APP_CONTEXT_COOKIE,
  CLUBLEON_MOBILE_UA_MARKERS,
  isAppClientOrigin,
  LEGACY_MOBILE_QUERY_PARAMS,
  TRACKING_DISABLED_VALUE,
  TRACKING_QUERY_PARAM,
} from "./constants";
import type { ClientOrigin, ClientPrivacyContext } from "./types";
import { WEB_PRIVACY_CONTEXT } from "./types";

export type ResolvePrivacyInput = {
  cookieValue?: string | null;
  appSourceParam?: string | null;
  trackingParam?: string | null;
  fromParam?: string | null;
  mobileParam?: string | null;
  sourceParam?: string | null;
  userAgent?: string | null;
};

function inferOriginFromUserAgent(userAgent: string | null | undefined): ClientOrigin | null {
  if (!userAgent) {
    return null;
  }

  if (userAgent.includes(CLUBLEON_MOBILE_UA_MARKERS.ios)) {
    return "ios_app";
  }

  if (userAgent.includes(CLUBLEON_MOBILE_UA_MARKERS.android)) {
    return "android_app";
  }

  return null;
}

function normalizeAppOrigin(value: string | null | undefined): ClientOrigin | null {
  if (value === "ios_app" || value === "android_app") {
    return value;
  }

  return null;
}

function isLegacyMobileAppRequest(input: ResolvePrivacyInput): boolean {
  return (
    input.fromParam === LEGACY_MOBILE_QUERY_PARAMS.from ||
    input.mobileParam === LEGACY_MOBILE_QUERY_PARAMS.mobile ||
    input.sourceParam === LEGACY_MOBILE_QUERY_PARAMS.source
  );
}

export function resolveClientPrivacyContext(
  input: ResolvePrivacyInput = {},
): ClientPrivacyContext {
  const explicitAppSource = normalizeAppOrigin(input.appSourceParam);
  const cookieOrigin = normalizeAppOrigin(input.cookieValue);
  const uaOrigin = inferOriginFromUserAgent(input.userAgent);

  let origin: ClientOrigin = "web";

  if (explicitAppSource) {
    origin = explicitAppSource;
  } else if (cookieOrigin) {
    origin = cookieOrigin;
  } else if (isLegacyMobileAppRequest(input)) {
    origin = uaOrigin ?? "ios_app";
  } else if (uaOrigin) {
    origin = uaOrigin;
  }

  if (!isAppClientOrigin(origin)) {
    return WEB_PRIVACY_CONTEXT;
  }

  return {
    origin,
    isEmbeddedApp: true,
    trackingDisabled: true,
  };
}

export function resolveClientPrivacyContextFromRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
  nextUrl: { searchParams: URLSearchParams };
  headers: { get: (name: string) => string | null };
}): ClientPrivacyContext {
  const { searchParams } = request.nextUrl;

  return resolveClientPrivacyContext({
    cookieValue: request.cookies.get(CL_APP_CONTEXT_COOKIE)?.value,
    appSourceParam: searchParams.get(APP_SOURCE_QUERY_PARAM),
    trackingParam: searchParams.get(TRACKING_QUERY_PARAM),
    fromParam: searchParams.get("from"),
    mobileParam: searchParams.get("mobile"),
    sourceParam: searchParams.get("source"),
    userAgent: request.headers.get("user-agent"),
  });
}

export function shouldStripAppPrivacyQueryParams(
  searchParams: URLSearchParams,
): boolean {
  return (
    searchParams.has(APP_SOURCE_QUERY_PARAM) ||
    searchParams.has(TRACKING_QUERY_PARAM)
  );
}

export function stripAppPrivacyQueryParams(url: URL): URL {
  const next = new URL(url.toString());
  next.searchParams.delete(APP_SOURCE_QUERY_PARAM);
  next.searchParams.delete(TRACKING_QUERY_PARAM);
  return next;
}

export function isEmbeddedAppRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
  nextUrl: { searchParams: URLSearchParams };
  headers: { get: (name: string) => string | null };
}): boolean {
  return resolveClientPrivacyContextFromRequest(request).isEmbeddedApp;
}
