import { type NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";

export const API_TOKEN_COOKIE = "tiendafront_api_token";
export const USER_ROLE_COOKIE = "tiendafront_user_role";

const COMMON_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function getApiTokenFromRequest(request: NextRequest): string {
  return request.cookies.get(API_TOKEN_COOKIE)?.value ?? "";
}

export function getUserRoleFromRequest(request: NextRequest): UserRole | "" {
  const role = request.cookies.get(USER_ROLE_COOKIE)?.value;
  if (role === "ADMIN" || role === "EMPLEADO" || role === "CLIENTE" || role === "EMPLEADO_CLUB" || role === "SUPER_ADMIN") {
    return role;
  }
  return "";
}

export function setSessionCookies(
  response: NextResponse,
  payload: { token: string; role?: UserRole | "" },
) {
  response.cookies.set(API_TOKEN_COOKIE, payload.token, {
    ...COMMON_COOKIE_OPTIONS,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  if (payload.role) {
    response.cookies.set(USER_ROLE_COOKIE, payload.role, {
      ...COMMON_COOKIE_OPTIONS,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(API_TOKEN_COOKIE, "", {
    ...COMMON_COOKIE_OPTIONS,
    httpOnly: true,
    maxAge: 0,
  });
  response.cookies.set(USER_ROLE_COOKIE, "", {
    ...COMMON_COOKIE_OPTIONS,
    httpOnly: false,
    maxAge: 0,
  });
}
