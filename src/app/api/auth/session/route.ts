import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";
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
  );
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

  return NextResponse.json({
    success: true,
    data: {
      isAuthenticated: Boolean(token),
      token,
      role,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    firebaseIdToken?: string;
  };

  if (!body.firebaseIdToken) {
    return NextResponse.json(
      { success: false, message: "firebaseIdToken es requerido" },
      { status: 400 },
    );
  }

  try {
    const backendResponse = await fetch(
      `${resolveBackendBase()}/api/auth/register-or-login`,
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
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo conectar con el backend" },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
