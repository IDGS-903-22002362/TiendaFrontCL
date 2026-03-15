import { apiFetch } from "./client";

type ApiSuccess<T> = {
    success: true;
    message?: string;
    data: T;
    count?: number;
};

export type CategoriaNoticia = "femenil" | "varonil" | "mixto";

export type Noticia = {
    id: string;
    titulo: string;
    descripcion: string;
    contenido: string;
    imagenes: string[];
    origen: "app" | "instagram" | "facebook" | "x" | "youtube";
    categoria: CategoriaNoticia;
    usuarioId?: string;
    autorNombre?: string;
    estatus: boolean;
    likes: number;
    liked?: boolean;
    likesCount?: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    ia?: {
        tituloIA: string;
        resumenCorto: string;
        contenidoFormateado: string;
    };
};

export type CrearNoticiaDTO = {
    titulo: string;
    descripcion: string;
    contenido: string;
    imagenes?: string[];
    categoria: CategoriaNoticia;
};

export type ActualizarNoticiaDTO = {
    titulo?: string;
    descripcion?: string;
    contenido?: string;
    imagenes?: string[];
    estatus?: boolean;
    categoria?: CategoriaNoticia;
};

export type IAContenido = {
    tituloIA: string;
    resumenCorto: string;
    contenidoFormateado: string;
};

export const noticiasApi = {
    async getAll() {
        const response = await apiFetch<ApiSuccess<Noticia[]>>(
            "/api/noticias",
            { method: "GET" },
            { local: true },
        );
        return response.data || [];
    },

    async getById(id: string) {
        const response = await apiFetch<ApiSuccess<Noticia>>(
            `/api/noticias/${id}`,
            { method: "GET" },
            { local: true },
        );
        return response.data;
    },

    async search(termino: string) {
        const response = await apiFetch<ApiSuccess<Noticia[]>>(
            `/api/noticias/buscar/${encodeURIComponent(termino)}`,
            { method: "GET" },
            { local: true },
        );
        return response.data || [];
    },

    async create(payload: CrearNoticiaDTO) {
        const response = await apiFetch<ApiSuccess<Noticia>>(
            "/api/noticias",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            { local: true },
        );
        return response.data;
    },

    async update(id: string, payload: ActualizarNoticiaDTO) {
        const response = await apiFetch<ApiSuccess<Noticia>>(
            `/api/noticias/${id}`,
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
            `/api/noticias/${id}`,
            { method: "DELETE" },
            { local: true },
        );
        return response.data;
    },

    async uploadImages(id: string, files: File[]) {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append("imagenes", file);
        });

        const response = await apiFetch<
            ApiSuccess<{ urls: string[]; totalImagenes: number }>
        >(
            `/api/noticias/${id}/imagenes`,
            {
                method: "POST",
                body: formData,
            },
            { local: true },
        );
        return response.data;
    },

    async deleteImage(id: string, imageUrl: string) {
        const response = await apiFetch<
            ApiSuccess<{ imagenesRestantes: number }>
        >(
            `/api/noticias/${id}/imagenes`,
            {
                method: "DELETE",
                body: JSON.stringify({ imageUrl }),
            },
            { local: true },
        );
        return response.data;
    },

    async toggleLike(id: string) {
        const response = await apiFetch<ApiSuccess<{ liked: boolean; likes: number }>>(
            `/api/noticias/${id}/like`,
            { method: "POST" },
            { local: true },
        );
        return response.data;
    },

    async generateIA(id: string) {
        const response = await apiFetch<ApiSuccess<{ ia: IAContenido }>>(
            `/api/noticias/${id}/generar-ia`,
            { method: "POST" },
            { local: true },
        );
        return response.data;
    },

    /**
     * Crear noticia con imágenes y generación de IA en un flujo único
     * @param payload Datos básicos de la noticia
     * @param imageFiles Array de archivos de imagen (opcional)
     * @param generateAI Si se debe generar el contenido IA automáticamente (default: true)
     * @returns Noticia creada con imágenes e IA generado
     */
    async createWithMediaAndIA(
        payload: CrearNoticiaDTO,
        imageFiles?: File[],
        generateAI: boolean = true
    ) {
        try {
            // 1. Crear la noticia básica (SIN imágenes para evitar payload grande)
            const payloadSinImagenes = {
                ...payload,
                imagenes: [], // Siempre vacío al crear
            };
            const noticia = await this.create(payloadSinImagenes);
            console.log("✅ Noticia creada:", noticia.id, noticia);

            // Pequeño delay para asegurar que Firestore procesó la escritura
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Subir imágenes si hay
            if (imageFiles && imageFiles.length > 0) {
                try {
                    const mediaResult = await this.uploadImages(noticia.id, imageFiles);
                    console.log("✅ Imágenes subidas:", mediaResult?.urls?.length, mediaResult);

                    // Delay después de subir imágenes
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (imageError) {
                    console.error("⚠️ Error al subir imágenes:", imageError);
                    // No lanzar error, continuar con IA
                }
            }

            // 3. Generar contenido IA si está habilitado
            if (generateAI) {
                try {
                    const iaResult = await this.generateIA(noticia.id);
                    console.log("✅ IA generado:", iaResult);

                    // Delay después de generar IA
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (iaError) {
                    console.error("⚠️ Error al generar IA:", iaError);
                    // No lanzar error, continuar
                }
            }

            // 4. Re-fetch final para obtener datos completos
            console.log("🔄 Re-fetch de noticia...");
            const noticiaCompleta = await this.getById(noticia.id);
            console.log("✅ Noticia completa obtenida:", noticiaCompleta);

            return noticiaCompleta;
        } catch (error) {
            console.error("❌ Error en createWithMediaAndIA:", error);
            throw error;
        }
    },
};
