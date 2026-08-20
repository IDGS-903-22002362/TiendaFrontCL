import { apiFetch } from "./client";

type ApiSuccess<T> = {
    success: true;
    message?: string;
    data: T;
    count?: number;
};

export const BENEFICIO_DESTINOS = [
    "none",
    "home",
    "rewards",
    "plantilla",
    "calendario",
    "galeria",
    "tienda",
] as const;

export type BeneficioDestinoModulo = (typeof BENEFICIO_DESTINOS)[number];

export type BeneficioMediaTipo = "imagen" | "video";

export const MAX_BENEFICIO_IMAGENES = 10;
export const MAX_BENEFICIO_PUNTOS_RECOMPENSA = 10_000;

export type BeneficioRedireccion = {
    modulo: BeneficioDestinoModulo;
};

export type Beneficio = {
    id: string;
    titulo: string;
    descripcion: string;
    imagen?: string;
    imagenes?: string[];
    video?: string;
    mediaTipo?: BeneficioMediaTipo;
    redireccion?: BeneficioRedireccion;
    puntosRecompensa?: number;
    estatus: boolean;
    createdAt?: string | Date | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
    updatedAt?: string | Date | { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number };
};

export type CrearBeneficioDTO = {
    titulo: string;
    descripcion: string;
    redireccion?: BeneficioRedireccion;
    puntosRecompensa?: number;
    estatus?: boolean;
};

export type ActualizarBeneficioDTO = {
    titulo?: string;
    descripcion?: string;
    redireccion?: BeneficioRedireccion;
    puntosRecompensa?: number;
    estatus?: boolean;
};

export const BENEFICIO_DESTINO_LABELS: Record<BeneficioDestinoModulo, string> = {
    none: "Sin redirección",
    home: "Inicio (Home)",
    rewards: "Rewards / Beneficios",
    plantilla: "Plantilla",
    calendario: "Calendario",
    galeria: "Galería de fotos",
    tienda: "Tienda (inicio)",
};

export const ALLOWED_BENEFICIO_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

export const ALLOWED_BENEFICIO_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
] as const;

export const MAX_BENEFICIO_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_BENEFICIO_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

/** Recomendaciones de dimensiones para que el media se vea bien en la app móvil. */
export const BENEFICIO_MEDIA_SIZE_RECOMMENDATIONS = {
    imagen: {
        label: "Imagen",
        hint: "16:9 ideal · vertical OK",
        summary:
            "Ideal horizontal 16:9 (1920×1080 px). También acepta vertical u otras proporciones: la app las adapta sin recortar.",
    },
    video: {
        label: "Video",
        hint: "16:9 ideal · vertical OK",
        summary:
            "Ideal horizontal 16:9 (1920×1080 px, máx. 50 MB). Vertical u horizontal: la app ajusta el reproductor al tamaño real.",
    },
} as const;

export function resolveBeneficioImagenes(beneficio: Pick<Beneficio, "imagen" | "imagenes">): string[] {
    if (Array.isArray(beneficio.imagenes) && beneficio.imagenes.length > 0) {
        return beneficio.imagenes.filter((url) => url.trim().length > 0);
    }

    return beneficio.imagen?.trim() ? [beneficio.imagen.trim()] : [];
}

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

    async uploadImages(id: string, files: File[]) {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("imagen", file);
        });

        const response = await apiFetch<
            ApiSuccess<{ urls: string[]; beneficio: Beneficio }>
        >(
            `/api/beneficios/${id}/imagen`,
            {
                method: "POST",
                body: formData,
            },
            { local: true },
        );

        return response.data;
    },

    async uploadImage(id: string, file: File) {
        return this.uploadImages(id, [file]);
    },

    async uploadVideo(id: string, file: File) {
        const formData = new FormData();
        formData.append("video", file);

        const response = await apiFetch<
            ApiSuccess<{ url: string; beneficio: Beneficio }>
        >(
            `/api/beneficios/${id}/video`,
            {
                method: "POST",
                body: formData,
            },
            { local: true },
        );

        return response.data;
    },

    async createWithMedia(
        payload: CrearBeneficioDTO,
        files: File[],
        mediaTipo: BeneficioMediaTipo,
    ) {
        const beneficio = await this.create(payload);

        try {
            if (mediaTipo === "imagen") {
                const result = await this.uploadImages(beneficio.id, files);
                return result.beneficio;
            }

            const result = await this.uploadVideo(beneficio.id, files[0]);
            return result.beneficio;
        } catch (error) {
            await this.delete(beneficio.id).catch(() => undefined);
            throw error;
        }
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

    async appendImages(id: string, files: File[]) {
        return this.uploadImages(id, files);
    },

    async replaceMedia(id: string, file: File, mediaTipo: BeneficioMediaTipo) {
        return mediaTipo === "imagen"
            ? this.uploadImage(id, file)
            : this.uploadVideo(id, file);
    },

    async removeImage(id: string, url: string) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            `/api/beneficios/${id}/imagen`,
            {
                method: "DELETE",
                body: JSON.stringify({ url }),
            },
            { local: true },
        );

        return response.data;
    },

    async removeMedia(id: string) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            `/api/beneficios/${id}/media`,
            { method: "DELETE" },
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

    async permanentlyDelete(id: string) {
        const response = await apiFetch<
            ApiSuccess<{ id: string; deletedMediaCount: number }>
        >(
            `/api/beneficios/${id}/permanente`,
            { method: "DELETE" },
            { local: true },
        );

        return response.data;
    },

    /** @deprecated Use createWithMedia instead */
    async createWithImage(payload: CrearBeneficioDTO, file: File) {
        return this.createWithMedia(payload, [file], "imagen");
    },
};
