import { apiFetch } from "./client";

type ApiSuccess<T> = {
    success: true;
    message?: string;
    data: T;
    count?: number;
};

export type Beneficio = {
    id: string;
    titulo: string;
    descripcion: string;
    estatus: boolean;
    createdAt?: string | Date | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
    updatedAt?: string | Date | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
};

export type CrearBeneficioDTO = {
    titulo: string;
    descripcion: string;
    estatus?: boolean;
};

export type ActualizarBeneficioDTO = {
    titulo?: string;
    descripcion?: string;
    estatus?: boolean;
};

export const beneficiosApi = {
    async getAll() {
        const response = await apiFetch<ApiSuccess<Beneficio[]>>(
            "/api/beneficios",
            { method: "GET" },
            { local: true },
        );

        return response.data || [];
    },

    async getById(id: string) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            `/api/beneficios/${id}`,
            { method: "GET" },
            { local: true },
        );

        return response.data;
    },

    async create(payload: CrearBeneficioDTO) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            "/api/beneficios",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            { local: true },
        );

        return response.data;
    },

    async update(id: string, payload: ActualizarBeneficioDTO) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            `/api/beneficios/${id}`,
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
            `/api/beneficios/${id}`,
            { method: "DELETE" },
            { local: true },
        );

        return response.data;
    },
};