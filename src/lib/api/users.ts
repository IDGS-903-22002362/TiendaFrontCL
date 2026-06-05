import { apiFetch } from "./client";
import type { Usuario, UserRole } from "@/lib/types";

type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type CompleteProfilePayload = {
  nombre?: string;
  telefono?: string;
  fechaNacimiento?: string;
  genero?: string;
};

export type UpdateProfilePayload = {
  telefono: string;
};

export type EditableProfileData = {
  id?: string;
  uid?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  fechaNacimiento?: string;
  genero?: string;
  nivel?: string;
  puntosActuales?: number;
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

type UserPointsPayload = {
  success?: boolean;
  data?: {
    puntos?: number;
    puntosActuales?: number;
    usuario?: {
      puntos?: number | string;
      puntosActuales?: number | string;
    };
    [key: string]: unknown;
  };
  puntos?: number | string;
  puntosActuales?: number | string;
  usuario?: {
    puntos?: number | string;
    puntosActuales?: number | string;
  };
  [key: string]: unknown;
};

function parsePointsValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getPointsFromPayload(payload: UserPointsPayload): number {
  const maybeData = payload.data;

  const candidates: unknown[] = [
    maybeData?.puntos,
    maybeData?.puntosActuales,
    maybeData?.usuario?.puntos,
    maybeData?.usuario?.puntosActuales,
    payload.puntos,
    payload.puntosActuales,
    payload.usuario?.puntos,
    payload.usuario?.puntosActuales,
  ];

  for (const value of candidates) {
    const parsed = parsePointsValue(value);
    if (parsed !== null) {
      return parsed;
    }
  }

  return 0;
}

export async function getMyPoints() {
  const endpoints = [
    "/api/usuarios/me/getpuntos",
    "/api/usuarios/me/puntos",
    "/api/usuarios/me",
  ];

  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const payload = await apiFetch<UserPointsPayload>(
        endpoint,
        { method: "GET" },
        { local: true },
      );

      return {
        points: getPointsFromPayload(payload),
        payload,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No se pudo obtener puntos del usuario");
}

export async function completeUserProfile(payload: CompleteProfilePayload) {
  return apiFetch<ApiSuccess<{ uid: string; perfilCompleto: boolean; nombre?: string; telefono?: string; fechaNacimiento?: string; genero?: string; edad?: number }>>(
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

function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeEditableProfileData(payload: unknown): EditableProfileData {
  const root = payload as {
    data?: Record<string, unknown>;
    usuario?: Record<string, unknown>;
  };

  const source = (root.data as Record<string, unknown> | undefined)
    ?? (root.usuario as Record<string, unknown> | undefined)
    ?? (payload as Record<string, unknown>);

  return {
    id: typeof source.id === "string" ? source.id : undefined,
    uid: typeof source.uid === "string" ? source.uid : undefined,
    nombre: typeof source.nombre === "string" ? source.nombre : undefined,
    email: typeof source.email === "string" ? source.email : undefined,
    telefono: typeof source.telefono === "string" ? source.telefono : undefined,
    fechaNacimiento:
      typeof source.fechaNacimiento === "string"
        ? source.fechaNacimiento
        : undefined,
    genero: typeof source.genero === "string" ? source.genero : undefined,
    nivel: typeof source.nivel === "string" ? source.nivel : undefined,
    puntosActuales: parseNumericValue(source.puntosActuales),
  };
}

export async function getMyProfile(uid?: string) {
  const endpoints = [
    "/api/usuarios/me",
    uid ? `/api/usuarios/${uid}` : "",
  ].filter(Boolean);

  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const payload = await apiFetch<unknown>(endpoint, { method: "GET" }, { local: true });
      return normalizeEditableProfileData(payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No se pudo obtener el perfil del usuario");
}

export async function saveEditableProfile(payload: {
  telefono: string;
  fechaNacimiento?: string;
  genero?: string;
}) {
  const hasExtendedFields =
    Boolean(payload.fechaNacimiento) || Boolean(payload.genero);

  if (hasExtendedFields) {
    return completeUserProfile({
      telefono: payload.telefono,
      fechaNacimiento: payload.fechaNacimiento,
      genero: payload.genero,
    });
  }

  return updateUserProfile({ telefono: payload.telefono });
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

  async reactivate(id: string) {
    const response = await apiFetch<ApiSuccess<Usuario>>(
      `/api/usuarios/${id}/reactivar`,
      {
        method: "PUT",
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

