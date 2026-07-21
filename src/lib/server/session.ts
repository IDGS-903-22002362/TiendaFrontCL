import { type NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";
import { AuthUsuario } from "../api/auth";

export const API_TOKEN_COOKIE = "tiendafront_api_token";
export const USER_ROLE_COOKIE = "tiendafront_user_role";
export const USER_DATA_COOKIE = "tiendafront_user_data";

function usesSecureCookiePolicy(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.FORCE_SECURE_COOKIES === "true"
  );
}

// HttpOnly: lax en local HTTP para que el navegador envíe la cookie al proxy /api/*
const SERVER_COOKIE_OPTIONS = {
  path: "/",
  sameSite: (usesSecureCookiePolicy() ? "none" : "lax") as "none" | "lax",
  secure: usesSecureCookiePolicy(),
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,
};

// Legibles desde JS (rol, datos de usuario)
const CLIENT_COOKIE_OPTIONS = {
  path: "/",
  sameSite: (usesSecureCookiePolicy() ? "none" : "lax") as "none" | "lax",
  secure: usesSecureCookiePolicy(),
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
    role === "TRABAJADOR_CLUBLEON" ||
    role === "CONCESION_SUPERADMIN" ||
    role === "CONCESION_ADMIN" ||
    role === "CONCESION_VENDEDOR" ||
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
      roles: payload.user.roles,
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
