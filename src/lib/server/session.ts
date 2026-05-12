import { type NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";
import { AuthUsuario } from "../api/auth";

export const API_TOKEN_COOKIE = "tiendafront_api_token";
export const USER_ROLE_COOKIE = "tiendafront_user_role";
export const USER_DATA_COOKIE = "tiendafront_user_data";

const COMMON_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function getUserDataFromRequest(request: NextRequest): Partial<AuthUsuario> | null {
  const raw = request.cookies.get(USER_DATA_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as Partial<AuthUsuario>;
  } catch {
    return null;
  }
}

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
  payload: { token: string; role?: UserRole | ""; user?: Partial<AuthUsuario> | null },
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

  if (payload.user) {
    // Solo guardar campos ligeros — no historial de puntos ni arrays grandes
    const slim = {
      uid: payload.user.uid,
      email: payload.user.email,
      nombre: payload.user.nombre,
      perfilCompleto: payload.user.perfilCompleto,
      rol: payload.user.rol,
    };
    response.cookies.set(USER_DATA_COOKIE, encodeURIComponent(JSON.stringify(slim)), {
      ...COMMON_COOKIE_OPTIONS,
      httpOnly: false,  // legible desde JS para evitar el fetch extra
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [API_TOKEN_COOKIE, USER_ROLE_COOKIE, USER_DATA_COOKIE]) {
    response.cookies.set(name, "", { ...COMMON_COOKIE_OPTIONS, httpOnly: name === API_TOKEN_COOKIE, maxAge: 0 });
  }
}
