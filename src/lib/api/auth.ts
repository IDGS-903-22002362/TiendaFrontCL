import type { UserRole } from "@/lib/types";
import { apiFetch } from "./client";

export type AuthUsuario = {
  id: string;
  uid: string;
  provider?: "google" | "apple" | "email" | string;
  nombre?: string;
  email?: string;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  genero?: string | null;
  perfilCompleto?: boolean;
  rol: UserRole;
  activo?: boolean;
};

export type RegisterOrLoginPayload = {
  nombre?: string;
  telefono?: string;
  fechaNacimiento?: string;
  genero?: string;
};

export type RegisterOrLoginResponse = {
  success: true;
  token: string;
  usuario: AuthUsuario;
};

export type SessionStatusResponse = {
  success?: boolean;
  data?: {
    isAuthenticated?: boolean;
    role?: UserRole | "";
    token?: string;
    user?: Partial<AuthUsuario>;
  };
};

export async function registerOrLoginWithFirebaseToken(
  firebaseIdToken: string,
  profile?: RegisterOrLoginPayload,
) {
  return apiFetch<RegisterOrLoginResponse>(
    "/auth/register-or-login",
    {
      method: "POST",
      body: JSON.stringify(profile ?? {}),
    },
    {
      token: firebaseIdToken,
    },
  );
}

export async function createLocalSessionFromFirebaseToken(
  firebaseIdToken: string,
) {
  return apiFetch<SessionStatusResponse>(
    "/api/auth/session",
    {
      method: "POST",
      body: JSON.stringify({ firebaseIdToken }),
    },
    { local: true },
  );
}

export async function getLocalSessionStatus() {
  return apiFetch<SessionStatusResponse>(
    "/api/auth/session",
    { method: "GET" },
    { local: true },
  );
}

export async function clearLocalSession() {
  return apiFetch<{ success: true }>(
    "/api/auth/session",
    { method: "DELETE" },
    { local: true },
  );
}
