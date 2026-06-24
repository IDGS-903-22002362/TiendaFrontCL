import { randomBytes, timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/cookies/constants";

const CSRF_MAX_AGE = 60 * 60 * 24 * 7;

function isProductionSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function getCsrfCookieOptions(maxAge = CSRF_MAX_AGE) {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: isProductionSecure(),
    httpOnly: false,
    maxAge,
  };
}

export function setCsrfCookie(response: NextResponse, token?: string): string {
  const value = token ?? generateCsrfToken();
  response.cookies.set(CSRF_COOKIE_NAME, value, getCsrfCookieOptions());
  return value;
}

export function getCsrfTokenFromRequest(request: NextRequest): string {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value ?? "";
}

function safeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const storeUrl = process.env.STORE_PUBLIC_BASE_URL?.trim();
  if (storeUrl) {
    try {
      origins.add(new URL(storeUrl).origin);
    } catch {
      // Ignorar URL inválida
    }
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:9002");
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
  }

  origins.add("https://tiendalaguarida.com");
  origins.add("https://www.tiendalaguarida.com");
  origins.add("https://ecomerce-next-front--e-comerce-leon.us-central1.hosted.app");

  return origins;
}

function resolveRequestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function validateCsrfRequest(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const cookieToken = getCsrfTokenFromRequest(request);
  if (!cookieToken) {
    // Sin cookie CSRF aún: permitir (se emitirá en el próximo GET).
    return true;
  }

  const headerToken =
    request.headers.get(CSRF_HEADER_NAME) ??
    request.headers.get("X-CSRF-Token") ??
    "";

  if (!safeCompare(cookieToken, headerToken)) {
    return false;
  }

  const origin = resolveRequestOrigin(request);
  if (!origin) {
    // Same-origin fetch siempre envía Origin en navegadores modernos;
    // permitir solo si hay token CSRF válido (double-submit).
    return true;
  }

  const allowed = getAllowedOrigins();
  const requestOrigin = new URL(request.nextUrl).origin;
  allowed.add(requestOrigin);

  return allowed.has(origin);
}

export function csrfForbiddenResponse() {
  return NextResponse.json(
    { success: false, message: "Solicitud rechazada por protección CSRF." },
    { status: 403 },
  );
}

export function isMutatingMethod(method: string): boolean {
  const normalized = method.toUpperCase();
  return (
    normalized === "POST" ||
    normalized === "PUT" ||
    normalized === "PATCH" ||
    normalized === "DELETE"
  );
}
