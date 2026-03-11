import { apiFetch } from "./client";

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
