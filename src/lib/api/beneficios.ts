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

export const BENEFICIO_TIPOS = ["estandar", "minijuego"] as const;
export type BeneficioTipo = (typeof BENEFICIO_TIPOS)[number];

export const MINIJUEGO_TIPOS = [
    "ruleta",
    "cofre",
    "rasca",
    "cartas",
    "sobre",
] as const;
export type MinijuegoTipo = (typeof MINIJUEGO_TIPOS)[number];

export const PRIZE_TYPES = [
    "points",
    "coupon",
    "physical",
    "digital",
    "none",
] as const;
export type PrizeType = (typeof PRIZE_TYPES)[number];

export type MinijuegoVisibilidad = "publico" | "restringido";

export type GanadoresEspecialAdmin = {
    premio: string;
    maxGanadores: number | null;
    totalGanadores: number;
    ganadores: Array<{
        uid: string;
        nombre?: string | null;
        email: string;
        telefono: string;
    }>;
};

export type GanadorPremioEspecial = {
    id: string;
    playId: string;
    minijuegoId: string;
    beneficioId: string;
    beneficioTitulo: string;
    uid: string;
    nombre: string;
    email: string;
    telefono: string;
    premioId: string;
    premioNombre: string;
    createdAt: string;
};

export type PremioMinijuego = {
    id?: string;
    nombre: string;
    tipo: PrizeType;
    valor?: number;
    stock?: number | null;
    /** Obsoleto. El backend lo ignora al guardar. */
    weight?: number;
    /** Probabilidad en porcentaje, hasta 3 decimales. La suma debe ser 100. */
    probabilidad?: number;
    descripcion?: string;
    terminos?: string;
    validoDesde?: string | null;
    caducaEl?: string | null;
    imagenUrl?: string;
    /**
     * Arte de la carta coleccionable. Solo aplica al premio especial.
     * Al guardar: un texto fija o conserva la carta, null la quita y, sin la
     * clave, el servidor conserva la anterior del mismo premio (al crear, sin
     * carta). Es independiente de imagenUrl.
     */
    cartaImagenUrl?: string | null;
    color?: string;
    especial?: boolean;
    maxGanadores?: number;
};

export type MinijuegoAdmin = {
    id: string;
    tipo: MinijuegoTipo;
    estatus: boolean;
    fechaInicio?: string;
    fechaFin?: string;
    intentosPorUsuario: number;
    audiencia: {
        visibilidad: MinijuegoVisibilidad;
        usuariosPermitidos: string[];
    };
    /**
     * "convertida": minijuego creado con pesos relativos. El backend muestra
     * sus porcentajes equivalentes y sigue sorteando con los pesos originales
     * hasta que se guarde de nuevo.
     */
    probabilidadModo?: "porcentaje" | "convertida";
    premios: PremioMinijuego[];
};

export type GuardarMinijuegoDTO = {
    beneficio: {
        titulo: string;
        descripcion: string;
        estatus: boolean;
    };
    minijuego: {
        tipo: MinijuegoTipo;
        fechaInicio?: string | null;
        fechaFin?: string | null;
        intentosPorUsuario: number;
        audiencia: {
            visibilidad: MinijuegoVisibilidad;
            usuariosPermitidos: string[];
        };
    };
    premios: PremioMinijuego[];
};

export const MAX_BENEFICIO_IMAGENES = 10;
export const MAX_BENEFICIO_PUNTOS_RECOMPENSA = 10_000;

/**
 * Tope técnico de premios por minijuego, incluido el especial. Es el mismo
 * que valida el backend (MAX_PREMIOS_MINIJUEGO).
 */
export const MAX_MINIJUEGO_PREMIOS = 50;

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
    tipo?: BeneficioTipo;
    minijuegoId?: string;
    minijuegoTipo?: MinijuegoTipo;
    minijuegoVisibilidad?: MinijuegoVisibilidad | null;
    usuariosPermitidosCount?: number;
    minijuego?: MinijuegoAdmin;
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
    tipo?: "estandar";
};

export const MINIJUEGO_TIPO_LABELS: Record<MinijuegoTipo, string> = {
    ruleta: "Ruleta",
    cofre: "Cofre sorpresa",
    rasca: "Rasca y gana",
    cartas: "Elige una carta",
    sobre: "Sobre sorpresa",
};

export const PRIZE_TYPE_LABELS: Record<PrizeType, string> = {
    points: "Puntos",
    coupon: "Cupón",
    physical: "Físico",
    digital: "Digital",
    none: "Ninguno",
};

export function resolveBeneficioTipo(
    beneficio: Pick<Beneficio, "tipo">,
): BeneficioTipo {
    return beneficio.tipo === "minijuego" ? "minijuego" : "estandar";
}

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

/** Arte de la carta coleccionable del premio especial. Sin GIF: la carta es una imagen fija. */
export const ALLOWED_CARTA_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
] as const;

export const MAX_CARTA_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** El servidor rechaza imágenes con algún lado menor a esto. */
export const MIN_CARTA_IMAGE_SIDE_PX = 400;

/** El servidor rechaza imágenes de más de 40 megapíxeles (ancho × alto). */
export const MAX_CARTA_IMAGE_PIXELS = 40_000_000;

/** Tamaño al que el servidor normaliza el arte (2× la ventana de la carta, 872×591). */
export const CARTA_IMAGE_WIDTH_PX = 1744;
export const CARTA_IMAGE_HEIGHT_PX = 1182;

export const CARTA_IMAGE_RECOMMENDATION =
    "1744 × 1182 px (horizontal, proporción 1.48:1)";

export type CartaImagenUpload = {
    url: string;
    path?: string;
    width?: number;
    height?: number;
    bytes?: number;
};

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
    async getGanadoresEspecial(id: string) {
        const response = await apiFetch<ApiSuccess<GanadoresEspecialAdmin>>(
            `/api/minijuegos/${id}/ganadores-especial`,
            { method: "GET" },
            { local: true },
        );

        return response.data;
    },

    async listGanadoresEspecial() {
        const response = await apiFetch<ApiSuccess<GanadorPremioEspecial[]>>(
            "/api/beneficios/ganadores-especial",
            { method: "GET" },
            { local: true },
        );

        return response.data || [];
    },

    async getAll() {
        const response = await apiFetch<ApiSuccess<Beneficio[]>>(
            "/api/beneficios?admin=1",
            { method: "GET" },
            { local: true },
        );

        return response.data || [];
    },

    async getById(id: string) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            `/api/beneficios/${id}?admin=1`,
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

    /**
     * Sube el arte de la carta coleccionable del premio especial. No depende
     * del minijuego: el panel lo sube al guardar y manda la URL en el JSON.
     */
    async uploadCartaImagen(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append("imagen", file);

        const response = await apiFetch<ApiSuccess<CartaImagenUpload>>(
            "/api/beneficios/minijuego/carta-imagen",
            {
                method: "POST",
                body: formData,
            },
            { local: true },
        );

        const url = response.data?.url;
        if (typeof url !== "string" || !url.trim()) {
            throw new Error("El servidor no devolvió la imagen de la carta. Intenta de nuevo.");
        }

        return { url: url.trim() };
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

    async createMinijuego(payload: GuardarMinijuegoDTO) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            "/api/beneficios/minijuego",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            { local: true },
        );

        return response.data;
    },

    async updateMinijuego(id: string, payload: GuardarMinijuegoDTO) {
        const response = await apiFetch<ApiSuccess<Beneficio>>(
            `/api/beneficios/${id}/minijuego`,
            {
                method: "PUT",
                body: JSON.stringify(payload),
            },
            { local: true },
        );

        return response.data;
    },

    async createMinijuegoWithMedia(
        payload: GuardarMinijuegoDTO,
        files: File[],
        mediaTipo: BeneficioMediaTipo,
    ) {
        const beneficio = await this.createMinijuego(payload);

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
