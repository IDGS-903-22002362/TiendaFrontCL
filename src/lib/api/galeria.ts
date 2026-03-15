import { apiFetch } from "./client";

type ApiSuccess<T> = {
    success: true;
    message?: string;
    data: T;
    count?: number;
};

export type Galeria = {
    id: string;
    descripcion: string;
    imagenes: string[];
    videos: string[];
    usuarioId?: string;
    autorNombre?: string;
    estatus: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
};

export type CrearGaleriaDTO = {
    descripcion: string;
};

export const galeriaApi = {
    async getAll(): Promise<Galeria[]> {
        const response = await apiFetch<ApiSuccess<Galeria[]>>(
            "/api/galeria",
            { method: "GET" },
            { local: true }
        );
        return response.data || [];
    },

    async getById(id: string): Promise<Galeria> {
        const response = await apiFetch<ApiSuccess<Galeria>>(
            `/api/galeria/${id}`,
            { method: "GET" },
            { local: true }
        );
        return response.data;
    },

    async create(data: CrearGaleriaDTO): Promise<Galeria> {
        const response = await apiFetch<ApiSuccess<Galeria>>(
            "/api/galeria",
            {
                method: "POST",
                body: JSON.stringify(data),
            },
            { local: true }
        );
        return response.data;
    },

    async uploadImages(id: string, files: File[]): Promise<string[]> {
        const formData = new FormData();
        files.forEach((file) => formData.append("imagenes", file));
        const response = await apiFetch<ApiSuccess<{ urls: string[] }>>(
            `/api/galeria/${id}/imagenes`,
            {
                method: "POST",
                body: formData,
            },
            { local: true }
        );
        return response.data.urls;
    },

    async uploadVideos(id: string, files: File[]): Promise<string[]> {
        const formData = new FormData();
        files.forEach((file) => formData.append("videos", file));
        const response = await apiFetch<ApiSuccess<{ urls: string[] }>>(
            `/api/galeria/${id}/videos`,
            {
                method: "POST",
                body: formData,
            },
            { local: true }
        );
        return response.data.urls;
    },

    async deleteImage(id: string, imageUrl: string): Promise<void> {
        await apiFetch<ApiSuccess<never>>(
            `/api/galeria/${id}/imagenes`,
            {
                method: "DELETE",
                body: JSON.stringify({ imageUrl }),
            },
            { local: true }
        );
    },

    async deleteVideo(id: string, videoUrl: string): Promise<void> {
        await apiFetch<ApiSuccess<never>>(
            `/api/galeria/${id}/videos`,
            {
                method: "DELETE",
                body: JSON.stringify({ videoUrl }),
            },
            { local: true }
        );
    },
};