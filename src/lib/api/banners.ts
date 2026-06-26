import { Banner, CreateBannerDTO, UpdateBannerDTO } from "../ai/types";
import { Product } from "../types";
import { apiFetch } from "./client";

export type BannerAdminDetail = Banner;

export type BannerCreateResponse = {
    success: boolean;
    data?: Banner;
};

export type BannerListResponse = {
    success: boolean;
    data: Banner[];
};

export type BannerActiveResponse = {
    success: boolean;
    data: Array<{
        banner: Banner;
        products: Product[]; // Productos populados según contentConfig
    }>;
};

export const bannersAdminApi = {
    async getAll(): Promise<Banner[]> {
        const response = await apiFetch<BannerListResponse>(
            "/api/banners",
            { method: "GET", cache: "no-store" },
            { local: true, skipAuthRecovery: true }   // ← local: true
        );
        return response.data || [];
    },

    async getById(id: string, token?: string): Promise<Banner | null> {
        const response = await apiFetch<{ success: boolean; data?: Banner }>(
            `/api/banners/${id}`,
            { method: "GET" },
            { local: true, token }   // ← local: true
        );
        return response.data || null;
    },

    async create(payload: CreateBannerDTO, token?: string): Promise<Banner> {
        const response = await apiFetch<BannerCreateResponse>(
            "/api/banners",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            { local: true, token }   // ← local: true
        );
        if (!response.data) throw new Error("No se recibió el banner creado");
        return response.data;
    },

    async update(id: string, payload: UpdateBannerDTO, token?: string): Promise<Banner> {
        const response = await apiFetch<BannerCreateResponse>(
            `/api/banners/${id}`,
            {
                method: "PUT",
                body: JSON.stringify(payload),
            },
            { local: true, token }   // ← local: true
        );
        if (!response.data) throw new Error("No se recibió el banner actualizado");
        return response.data;
    },

    async delete(id: string, token?: string): Promise<void> {
        await apiFetch<{ success: boolean }>(
            `/api/banners/${id}`,
            { method: "DELETE" },
            { local: true, token }   // ← local: true
        );
    },

    // Obtener banners activos con sus productos
    async getActive(): Promise<Array<{ banner: Banner; products: Product[] }>> {
        try {
            const response = await apiFetch<BannerActiveResponse>(
                "/api/banners/active",
                { method: "GET", cache: "no-store" },
                { local: true, skipAuthRecovery: true }
            );
            return response.data || [];
        } catch (error) {
            // Fallback: obtener todos los banners y filtrar los activos en el cliente
            console.warn("Endpoint /api/banners/active falló, usando fallback con /api/banners");
            const allBanners = await this.getAll();
            return allBanners
                .filter((banner) => banner.active)
                .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                .map((banner) => ({
                    banner,
                    products: [], // Sin productos específicos en fallback
                }));
        }
    },

    // Subir imagen de fondo
    async uploadImage(id: string, file: File, token?: string): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append("imagen", file);

        const response = await apiFetch<{ success: boolean; data?: { url: string } }>(
            `/api/banners/${id}/imagen`,
            {
                method: "POST",
                body: formData,   // apiFetch detecta FormData y no añade Content-Type
            },
            { local: true, token }
        );
        if (!response.data?.url) throw new Error("No se recibió la URL de la imagen");
        return { url: response.data.url };
    },

    async uploadVideo(id: string, file: File, token?: string): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append("video", file);

        const response = await apiFetch<{ success: boolean; data?: { url: string } }>(
            `/api/banners/${id}/video`,
            {
                method: "POST",
                body: formData,
            },
            { local: true, token }
        );
        if (!response.data?.url) throw new Error("No se recibió la URL del vídeo");
        return { url: response.data.url };
    },
};