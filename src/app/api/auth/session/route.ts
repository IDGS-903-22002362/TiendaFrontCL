import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";
import {
  csrfForbiddenResponse,
  setCsrfCookie,
  validateCsrfRequest,
} from "@/lib/server/csrf";
import {
  clearSessionCookies,
  getApiTokenFromRequest,
  getUserRoleFromRequest,
  setSessionCookies,
} from "@/lib/server/session";

const FALLBACK_API_BASE = "http://localhost:3000/api";

function resolveBackendBase() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    FALLBACK_API_BASE
  ).replace(/\/+$/, "");
}

function joinBackendUrl(path: string) {
  const base = resolveBackendBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${base}${normalizedPath}`;
}

type BackendAuthResponse = {
  success?: boolean;
  token?: string;
  usuario?: {
    id?: string;
    rol?: UserRole;
    uid?: string;
    email?: string;
    nombre?: string;
    perfilCompleto?: boolean;
  };
  message?: string;
};

export async function GET(request: NextRequest) {
  const token = getApiTokenFromRequest(request);
  const role = getUserRoleFromRequest(request);

  if (!token) {
    const response = NextResponse.json({
      success: true,
      data: { isAuthenticated: false, token: "", role: "", user: null },
    });
    setCsrfCookie(response);
    return response;
  }

  // Recuperar datos del usuario desde el backend
  try {
    const backendRes = await fetch(joinBackendUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!backendRes.ok) {
      // Token inválido o expirado — limpiar cookies
      const response = NextResponse.json({
        success: true,
        data: { isAuthenticated: false, token: "", role: "", user: null },
      });
      clearSessionCookies(response);
      setCsrfCookie(response);
      return response;
    }

    const payload = await backendRes.json() as BackendAuthResponse;

    // Renovar cookie con token fresco si el backend lo rotó
    const freshToken = payload.token ?? token;
    const response = NextResponse.json({
      success: true,
      data: {
        isAuthenticated: true,
        token: freshToken,
        role: payload.usuario?.rol ?? role,
        user: {
          id: payload.usuario?.id ?? payload.usuario?.uid,
          uid: payload.usuario?.uid,
          email: payload.usuario?.email,
          nombre: payload.usuario?.nombre,
          perfilCompleto: payload.usuario?.perfilCompleto,
          rol: payload.usuario?.rol,
        },
      },
    });

    // Sincronizar cookies con datos frescos de usuario (incluye perfilCompleto)
    setSessionCookies(response, {
      token: freshToken,
      role: payload.usuario?.rol ?? role,
      user: payload.usuario ?? null,
    });
    setCsrfCookie(response);

    return response;
  } catch {
    const response = NextResponse.json({
      success: true,
      data: { isAuthenticated: false, token: "", role: "", user: null },
    });
    setCsrfCookie(response);
    return response;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    firebaseIdToken?: string;
    backendToken?: string;
    user?: BackendAuthResponse["usuario"];
  };

  if (body.backendToken) {
    if (!body.user) {
      return NextResponse.json(
        { success: false, message: "user es requerido con backendToken" },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      success: true,
      data: {
        token: body.backendToken,
        role: body.user.rol ?? "",
        user: {
          id: body.user.uid,
          uid: body.user.uid,
          email: body.user.email,
          nombre: body.user.nombre,
          perfilCompleto: body.user.perfilCompleto,
          rol: body.user.rol,
        },
      },
    });

    setSessionCookies(response, {
      token: body.backendToken,
      role: body.user.rol ?? "",
      user: body.user,
    });
    setCsrfCookie(response);

    return response;
  }

  if (!body.firebaseIdToken) {
    return NextResponse.json(
      { success: false, message: "firebaseIdToken es requerido" },
      { status: 400 },
    );
  }

  try {
    const backendResponse = await fetch(
      joinBackendUrl("/api/auth/register-or-login"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${body.firebaseIdToken}`,
        },
        body: JSON.stringify({}),
      },
    );

    const payload = (await backendResponse
      .json()
      .catch(() => ({}))) as BackendAuthResponse;

    if (!backendResponse.ok || !payload.token) {
      return NextResponse.json(
        {
          success: false,
          message: payload.message || "No se pudo iniciar sesión",
        },
        { status: backendResponse.status || 500 },
      );
    }

    const response = NextResponse.json({
      success: true,
      data: {
        token: payload.token,
        role: payload.usuario?.rol ?? "",
        user: {
          id: payload.usuario?.id ?? payload.usuario?.uid,
          uid: payload.usuario?.uid,
          email: payload.usuario?.email,
          nombre: payload.usuario?.nombre,
          perfilCompleto: payload.usuario?.perfilCompleto,
          rol: payload.usuario?.rol,
        },
      },
    });

    setSessionCookies(response, {
      token: payload.token,
      role: payload.usuario?.rol ?? "",
      user: payload.usuario ?? null,
    });
    setCsrfCookie(response);

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo conectar con el backend" },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateCsrfRequest(request)) {
    return csrfForbiddenResponse();
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  setCsrfCookie(response);
  return response;
}
