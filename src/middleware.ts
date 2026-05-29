import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_TOKEN_COOKIE = "tiendafront_api_token";
const USER_DATA_COOKIE = "tiendafront_user_data";

const EXCLUDED_PATH_PREFIXES = [
  "/_next",
  "/api",
  "/images",
  "/herobanner",
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
];

function isExcludedPath(pathname: string) {
  return EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(API_TOKEN_COOKIE)?.value;
  const perfilCompleto = getPerfilCompletoFromCookie(request);

  if (!token) {
    if (pathname === "/complete-profile") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "redirect=/complete-profile";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (perfilCompleto === false && pathname !== "/complete-profile") {
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

  // Evitar que login/register se muestren cuando ya hay sesión.
  if (pathname === "/login" || pathname === "/register") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};