import { apiFetch } from "./client";

type ApiSuccess<T> = {
    success: true;
    message?: string;
    data: T;
    count?: number;
};

export type PatrocinadorLogoVariante = "blanca" | "negra" | "exclusiva";

export type Patrocinador = {
    id: string;
    nombre: string;
    imagenBlanca?: string;
    imagenNegra?: string;
    /** Logo unico del patrocinador exclusivo, o logo legado. */
    imagen?: string;
    exclusivo?: boolean;
    estatus: boolean;
    createdAt?: string | Date | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
    updatedAt?: string | Date | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
};

export type CrearPatrocinadorDTO = {
    nombre: string;
    estatus?: boolean;
    exclusivo?: boolean;
};

export type ActualizarPatrocinadorDTO = {
    nombre?: string;
    estatus?: boolean;
    exclusivo?: boolean;
};

export const ALLOWED_PATROCINADOR_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

export const MAX_PATROCINADOR_IMAGE_SIZE_BYTES = 32 * 1024 * 1024;
export const MAX_PATROCINADOR_IMAGE_SIZE_MB = 32;
export const PATROCINADOR_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.gif";
export const PATROCINADOR_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

export const PATROCINADOR_IMAGE_RECOMMENDATION = {
    hint: "Logo cuadrado o 16:9",
    summary:
        "Ideal logo cuadrado (800×800 px) o horizontal 16:9. PNG, WEBP o GIF con fondo transparente se ve mejor.",
} as const;

export const PATROCINADOR_EXCLUSIVE_IMAGE_RECOMMENDATION = {
    hint: "1920 × 300 px",
    summary:
        "Banner 1920 × 300 px (recomendado) o 1280 × 200 px. JPG, PNG, WEBP o GIF animado, siempre con esas medidas.",
} as const;

export function hasBothSponsorLogos(patrocinador: Pick<Patrocinador, "imagenBlanca" | "imagenNegra">) {
    return Boolean(patrocinador.imagenBlanca?.trim() && patrocinador.imagenNegra?.trim());
}

export function isPatrocinadorExclusivo(patrocinador: Pick<Patrocinador, "exclusivo">) {
    return patrocinador.exclusivo === true;
}

export function hasExclusiveImage(patrocinador: Pick<Patrocinador, "imagen">) {
    return Boolean(patrocinador.imagen?.trim());
}

export function isGifSource(src?: string) {
    if (!src?.trim()) {
        return false;
    }

    const normalized = src.trim().split("?")[0]?.split("#")[0] ?? "";
    return normalized.toLowerCase().endsWith(".gif");
}

export function isAllowedPatrocinadorImageFile(file: File) {
    if (
        ALLOWED_PATROCINADOR_IMAGE_TYPES.includes(
            file.type as (typeof ALLOWED_PATROCINADOR_IMAGE_TYPES)[number],
        )
    ) {
        return true;
    }

    const name = file.name.toLowerCase();
    return PATROCINADOR_IMAGE_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export const patrocinadoresApi = {
    async getAll() {
        const response = await apiFetch<ApiSuccess<Patrocinador[]>>(
            "/api/patrocinadores",
            { method: "GET" },
            { local: true },
        );

        return response.data || [];
    },

    async getById(id: string) {
        const response = await apiFetch<ApiSuccess<Patrocinador>>(
            `/api/patrocinadores/${id}`,
            { method: "GET" },
            { local: true },
        );

        return response.data;
    },

    async create(payload: CrearPatrocinadorDTO) {
        const response = await apiFetch<ApiSuccess<Patrocinador>>(
            "/api/patrocinadores",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            { local: true },
        );

        return response.data;
    },

    async uploadImage(id: string, file: File, variante: PatrocinadorLogoVariante) {
        const formData = new FormData();
        formData.append("imagen", file);

        const response = await apiFetch<
            ApiSuccess<{ url: string; variante: PatrocinadorLogoVariante; patrocinador: Patrocinador }>
        >(
            `/api/patrocinadores/${id}/imagen/${variante}`,
            {
                method: "POST",
                body: formData,
            },
            { local: true },
        );

        return response.data;
    },

    async createWithImages(
        payload: CrearPatrocinadorDTO,
        files: { blanca: File; negra: File },
    ) {
        const patrocinador = await this.create(payload);

        try {
            await this.uploadImage(patrocinador.id, files.blanca, "blanca");
            const result = await this.uploadImage(patrocinador.id, files.negra, "negra");
            return result.patrocinador;
        } catch (error) {
            await this.permanentlyDelete(patrocinador.id).catch(() => undefined);
            throw error;
        }
    },

    async createExclusive(payload: CrearPatrocinadorDTO, file: File) {
        const patrocinador = await this.create({
            ...payload,
            exclusivo: true,
        });

        try {
            const result = await this.uploadImage(patrocinador.id, file, "exclusiva");
            return result.patrocinador;
        } catch (error) {
            await this.permanentlyDelete(patrocinador.id).catch(() => undefined);
            throw error;
        }
    },

    async update(id: string, payload: ActualizarPatrocinadorDTO) {
        const response = await apiFetch<ApiSuccess<Patrocinador>>(
            `/api/patrocinadores/${id}`,
            {
                method: "PUT",
                body: JSON.stringify(payload),
            },
            { local: true },
        );

        return response.data;
    },

    async removeImage(id: string, variante: PatrocinadorLogoVariante) {
        const response = await apiFetch<ApiSuccess<Patrocinador>>(
            `/api/patrocinadores/${id}/imagen/${variante}`,
            { method: "DELETE" },
            { local: true },
        );

        return response.data;
    },

    async delete(id: string) {
        const response = await apiFetch<ApiSuccess<{ success: boolean }>>(
            `/api/patrocinadores/${id}`,
            { method: "DELETE" },
            { local: true },
        );

        return response.data;
    },

    async permanentlyDelete(id: string) {
        const response = await apiFetch<
            ApiSuccess<{ id: string; deletedMediaCount: number }>
        >(
            `/api/patrocinadores/${id}/permanente`,
            { method: "DELETE" },
            { local: true },
        );

        return response.data;
    },
};
