import { type NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";
import { AuthUsuario } from "../api/auth";

export const API_TOKEN_COOKIE = "tiendafront_api_token";
export const USER_ROLE_COOKIE = "tiendafront_user_role";
export const USER_DATA_COOKIE = "tiendafront_user_data";

// Para cookies HttpOnly del servidor — lax está bien
const SERVER_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "none" as const,
  secure: true,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,
};

// Para cookies legibles desde JS — none para compatibilidad con WebView
const CLIENT_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "none" as const,
  secure: true,
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 7,
};

export function getUserDataFromRequest(
  request: NextRequest,
): Partial<AuthUsuario> | null {
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
  if (
    role === "ADMIN" ||
    role === "EMPLEADO" ||
    role === "CLIENTE" ||
    role === "EMPLEADO_CLUB" ||
    role === "SUPER_ADMIN"
  ) {
    return role;
  }
  return "";
}

export function setSessionCookies(
  response: NextResponse,
  payload: {
    token: string;
    role?: UserRole | "";
    user?: Partial<AuthUsuario> | null;
  },
) {
  response.cookies.set(API_TOKEN_COOKIE, payload.token, SERVER_COOKIE_OPTIONS);

  if (payload.role) {
    response.cookies.set(
      USER_ROLE_COOKIE,
      payload.role,
      CLIENT_COOKIE_OPTIONS,
    );
  }

  if (payload.user) {
    const slim = {
      uid: payload.user.uid,
      email: payload.user.email,
      nombre: payload.user.nombre,
      perfilCompleto: payload.user.perfilCompleto,
      rol: payload.user.rol,
    };
    response.cookies.set(
      USER_DATA_COOKIE,
      encodeURIComponent(JSON.stringify(slim)),
      CLIENT_COOKIE_OPTIONS,
    );
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(API_TOKEN_COOKIE, "", {
    ...SERVER_COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set(USER_ROLE_COOKIE, "", {
    ...CLIENT_COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set(USER_DATA_COOKIE, "", {
    ...CLIENT_COOKIE_OPTIONS,
    maxAge: 0,
  });
}