import { apiFetch } from "./client";
import type { Usuario, UserRole } from "@/lib/types";

type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type CompleteProfilePayload = {
  telefono?: string;
  fechaNacimiento?: string;
  genero?: string;
};

export type UpdateProfilePayload = {
  telefono: string;
};

export type UserStreak = {
  streakCount: number;
  streakBest: number;
  streakLastDay?: string;
  streakUpdatedAt?: unknown;
};

export type UserStreakCheckIn = UserStreak & {
  todayKey: string;
  alreadyCheckedIn: boolean;
};

export async function completeUserProfile(payload: CompleteProfilePayload) {
  return apiFetch<ApiSuccess<{ uid: string; perfilCompleto: boolean }>>(
    "/api/usuarios/completar-perfil",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    { local: true },
  );
}

export async function updateUserProfile(payload: UpdateProfilePayload) {
  return apiFetch<ApiSuccess<{ uid: string; telefono: string }>>(
    "/api/usuarios/actualizar-perfil",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    { local: true },
  );
}

export async function getUserStreak() {
  return apiFetch<ApiSuccess<UserStreak>>(
    "/api/usuarios/me/racha",
    { method: "GET" },
    { local: true },
  );
}

export async function checkInUserStreak() {
  return apiFetch<ApiSuccess<UserStreakCheckIn>>(
    "/api/usuarios/me/racha/checkin",
    { method: "POST" },
    { local: true },
  );
}

export async function checkEmailExists(email: string) {
  const params = new URLSearchParams({ email });
  return apiFetch<{ success: true; exists: boolean }>(
    `/api/usuarios/exists/email?${params.toString()}`,
    { method: "GET" },
    { local: true },
  );
}

// Admin CRUD functions
export type CrearUsuarioAppDTO = {
  uid?: string;
  nombre: string;
  email: string;
  rol?: UserRole;
  telefono?: string;
  fechaNacimiento?: string;
  edad?: number;
  genero?: string;
  password: string; // Contraseña requerida para crear usuario
};

export type ActualizarUsuarioAppDTO = {
  nombre?: string;
  rol?: UserRole;
  telefono?: string;
  fechaNacimiento?: string;
  edad?: number;
  genero?: string;
  nivel?: string;
  activo?: boolean;
};

export const usuariosApi = {
  async getAll() {
    const response = await apiFetch<ApiSuccess<Usuario[]>>(
      "/api/usuarios",
      { method: "GET" },
      { local: true },
    );
    return response.data || [];
  },

  async getById(id: string) {
    const response = await apiFetch<ApiSuccess<Usuario>>(
      `/api/usuarios/${id}`,
      { method: "GET" },
      { local: true },
    );
    return response.data;
  },

  async create(payload: CrearUsuarioAppDTO) {
    const response = await apiFetch<ApiSuccess<Usuario>>(
      "/api/usuarios",
      {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          uid: payload.uid || `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        }),
      },
      { local: true },
    );
    return response.data;
  },

  async update(id: string, payload: ActualizarUsuarioAppDTO) {
    const response = await apiFetch<ApiSuccess<Usuario>>(
      `/api/usuarios/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      { local: true },
    );
    return response.data;
  },

  async delete(id: string) {
    const response = await apiFetch<ApiSuccess<{ success: boolean }>>(
      `/api/usuarios/${id}`,
      { method: "DELETE" },
      { local: true },
    );
    return response.data;
  },
};

