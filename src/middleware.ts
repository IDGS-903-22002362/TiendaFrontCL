import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/lib/types";
import {
  getEmpleadoDefaultAdminPath,
  isEmpleadoAdminPath,
} from "@/lib/admin-access";
import {
  CL_APP_CONTEXT_COOKIE,
  CL_APP_CONTEXT_MAX_AGE_SECONDS,
  isAppClientOrigin,
} from "@/lib/privacy/constants";
import {
  isEmbeddedAppRequest,
  resolveClientPrivacyContextFromRequest,
  shouldStripAppPrivacyQueryParams,
  stripAppPrivacyQueryParams,
} from "@/lib/privacy/resolve-client-privacy-context";
import type { ClientOrigin } from "@/lib/privacy/types";

const API_TOKEN_COOKIE = "tiendafront_api_token";
const USER_ROLE_COOKIE = "tiendafront_user_role";
const USER_DATA_COOKIE = "tiendafront_user_data";
const BLOCKED_PAGE_IMAGE = "/images/fondopaginaporx.png";

const EXCLUDED_PATH_PREFIXES = [
  "/_next",
  "/api",
  "/images",
  "/herobanner",
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
  "/monitoring",
];

const STATIC_FILE_EXTENSIONS = [
  ".avif",
  ".css",
  ".eot",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".map",
  ".otf",
  ".png",
  ".svg",
  ".ttf",
  ".txt",
  ".webmanifest",
  ".woff",
  ".woff2",
  ".xml",
];

function isExcludedPath(pathname: string) {
  return (
    EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    STATIC_FILE_EXTENSIONS.some((extension) =>
      pathname.toLowerCase().endsWith(extension),
    )
  );
}

function getAllowedFrontIps() {
  return new Set(
    (process.env.ALLOWED_FRONT_IPS ?? "")
      .split(",")
      .map((ip) => normalizeIp(ip))
      .filter(Boolean),
  );
}

function normalizeIp(ip: string) {
  const normalized = ip.trim();

  if (!normalized) {
    return "";
  }

  return normalized.startsWith("::ffff:")
    ? normalized.slice("::ffff:".length)
    : normalized;
}

function getClientIp(request: NextRequest) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return normalizeIp(cfConnectingIp);
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    return normalizeIp(xRealIp);
  }

  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return normalizeIp(xForwardedFor.split(",")[0] ?? "");
  }

  return "";
}

function isAllowedIp(request: NextRequest) {
  const allowedIps = getAllowedFrontIps();

  if (allowedIps.size === 0) {
    return true;
  }

  const clientIp = getClientIp(request);

  return Boolean(clientIp && allowedIps.has(clientIp));
}

function forbiddenPage() {
  return new NextResponse(
    `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>403</title>
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        background: #0d253d;
      }

      body {
        display: grid;
        min-height: 100svh;
        place-items: center;
      }

      img {
        display: block;
        width: 100%;
        height: 100svh;
        object-fit: cover;
      }
    </style>
  </head>
  <body>
    <img src="${BLOCKED_PAGE_IMAGE}" alt="" />
  </body>
</html>`,
    {
      status: 403,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

function getPerfilCompletoFromCookie(request: NextRequest): boolean | undefined {
  const rawUserData = request.cookies.get(USER_DATA_COOKIE)?.value;
  if (!rawUserData) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawUserData)) as {
      perfilCompleto?: boolean;
    };

    if (typeof parsed.perfilCompleto === "boolean") {
      return parsed.perfilCompleto;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const STAFF_ROUTE_ROLES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin", roles: ["ADMIN", "EMPLEADO", "SUPER_ADMIN"] },
  { prefix: "/super-admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/empleado", roles: ["EMPLEADO", "CONCESION_VENDEDOR"] },
  { prefix: "/empleado-club", roles: ["EMPLEADO_CLUB"] },
];

function getRequiredStaffRoles(pathname: string): UserRole[] | null {
  const match = STAFF_ROUTE_ROLES.find(({ prefix }) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.roles ?? null;
}

function getUserRoleFromCookie(request: NextRequest): UserRole | "" {
  const role = request.cookies.get(USER_ROLE_COOKIE)?.value;
  if (
    role === "ADMIN" ||
    role === "EMPLEADO" ||
    role === "CLIENTE" ||
    role === "EMPLEADO_CLUB" ||
    role === "CONCESION_VENDEDOR" ||
    role === "SUPER_ADMIN"
  ) {
    return role;
  }
  return "";
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `redirect=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

function setAppContextCookie(response: NextResponse, origin: ClientOrigin) {
  if (!isAppClientOrigin(origin)) {
    return;
  }

  response.cookies.set(CL_APP_CONTEXT_COOKIE, origin, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CL_APP_CONTEXT_MAX_AGE_SECONDS,
  });
}

function attachAppContextCookie(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const context = resolveClientPrivacyContextFromRequest(request);
  if (!context.isEmbeddedApp) {
    return response;
  }

  const existing = request.cookies.get(CL_APP_CONTEXT_COOKIE)?.value;
  if (existing === context.origin) {
    return response;
  }

  setAppContextCookie(response, context.origin);
  return response;
}

function applyAppPrivacyRedirect(request: NextRequest): NextResponse | null {
  if (!shouldStripAppPrivacyQueryParams(request.nextUrl.searchParams)) {
    return null;
  }

  const context = resolveClientPrivacyContextFromRequest(request);
  const url = stripAppPrivacyQueryParams(request.nextUrl);
  const response = NextResponse.redirect(url);

  if (context.isEmbeddedApp) {
    setAppContextCookie(response, context.origin);
  }

  return response;
}

function isMobileAppRequest(request: NextRequest) {
  return isEmbeddedAppRequest(request);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isMobileApp = isMobileAppRequest(request);

  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  const privacyRedirect = applyAppPrivacyRedirect(request);
  if (privacyRedirect) {
    return privacyRedirect;
  }

  if (!isAllowedIp(request)) {
    return forbiddenPage();
  }

  const token = request.cookies.get(API_TOKEN_COOKIE)?.value;
  const perfilCompleto = getPerfilCompletoFromCookie(request);

  if (!token) {
    const staffRoles = getRequiredStaffRoles(pathname);
    if (staffRoles) {
      return redirectToLogin(request);
    }

    if (pathname === "/complete-profile") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "redirect=/complete-profile";
      return NextResponse.redirect(url);
    }

    return attachAppContextCookie(request, NextResponse.next());
  }

  const staffRoles = getRequiredStaffRoles(pathname);
  if (staffRoles) {
    const role = getUserRoleFromCookie(request);
    if (!role || !staffRoles.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (
      role === "EMPLEADO" &&
      (pathname === "/admin" || pathname.startsWith("/admin/")) &&
      !isEmpleadoAdminPath(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = getEmpleadoDefaultAdminPath();
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (
    perfilCompleto === false &&
    pathname !== "/complete-profile" &&
    pathname !== "/register" &&
    !isMobileApp
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/complete-profile";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (perfilCompleto === true && pathname === "/complete-profile") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Evitar que login/register se muestren cuando ya hay sesión web.
  // La app móvil carga /login en WebView y debe permanecer ahí para OTP/bridge.
  if (
    (pathname === "/login" || pathname === "/register") &&
    !isMobileApp
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return attachAppContextCookie(request, NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};
