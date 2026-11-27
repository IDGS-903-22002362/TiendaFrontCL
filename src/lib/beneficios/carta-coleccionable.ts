/**
 * Lógica pura del arte de la carta coleccionable del premio especial
 * (contrato 1.1 y 1.4). El servidor valida y normaliza el archivo de nuevo;
 * esto solo guía al administrador y arma el payload.
 */

import {
    ALLOWED_CARTA_IMAGE_TYPES,
    CARTA_IMAGE_HEIGHT_PX,
    CARTA_IMAGE_WIDTH_PX,
    MAX_CARTA_IMAGE_PIXELS,
    MAX_CARTA_IMAGE_SIZE_BYTES,
    MIN_CARTA_IMAGE_SIDE_PX,
} from "@/lib/api/beneficios";

/** Proporción de la ventana de arte de la carta (872:591 ≈ 1.4755:1). */
export const CARTA_ART_ASPECT_RATIO = CARTA_IMAGE_WIDTH_PX / CARTA_IMAGE_HEIGHT_PX;

/**
 * Si la proporción de origen difiere hasta 3 % de la ventana, el servidor la
 * recorta con cover; si difiere más, la pone completa (contain) sobre un fondo
 * difuminado de la misma imagen.
 */
export const CARTA_ART_COVER_TOLERANCE = 0.03;

export type CartaArtFit = "cover" | "contain";

/** Valida tipo y tamaño al elegir el archivo. Devuelve el mensaje de error o null. */
export function validateCartaImageFile(file: { type: string; size: number }): string | null {
    if (!(ALLOWED_CARTA_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        return "La carta solo acepta imágenes JPG, PNG o WEBP.";
    }
    if (!(file.size > 0)) {
        return "El archivo está vacío. Elige otra imagen.";
    }
    if (file.size > MAX_CARTA_IMAGE_SIZE_BYTES) {
        return `La imagen de la carta no puede pesar más de ${Math.round(
            MAX_CARTA_IMAGE_SIZE_BYTES / (1024 * 1024),
        )} MB.`;
    }
    return null;
}

/**
 * El servidor rechaza imágenes con algún lado menor a MIN_CARTA_IMAGE_SIDE_PX
 * o de más de MAX_CARTA_IMAGE_PIXELS.
 */
export function validateCartaImageDimensions(width: number, height: number): string | null {
    if (!(width > 0) || !(height > 0)) {
        return "No pudimos leer las medidas de la imagen. Elige otro archivo.";
    }
    if (width < MIN_CARTA_IMAGE_SIDE_PX || height < MIN_CARTA_IMAGE_SIDE_PX) {
        return `La imagen mide ${width} × ${height} px; cada lado debe medir al menos ${MIN_CARTA_IMAGE_SIDE_PX} px.`;
    }
    if (width * height > MAX_CARTA_IMAGE_PIXELS) {
        return `La imagen mide ${width} × ${height} px; el máximo es ${
            MAX_CARTA_IMAGE_PIXELS / 1_000_000
        } megapíxeles. Usa una versión de menor resolución.`;
    }
    return null;
}

/** Cómo quedará la imagen dentro de la ventana de la carta, igual que en el servidor. */
export function cartaArtFit(width: number, height: number): CartaArtFit {
    if (!(width > 0) || !(height > 0)) {
        return "contain";
    }

    const difference = Math.abs(width / height - CARTA_ART_ASPECT_RATIO) / CARTA_ART_ASPECT_RATIO;
    return difference <= CARTA_ART_COVER_TOLERANCE ? "cover" : "contain";
}

/** Rectángulo en porcentajes de la ventana de la carta. */
export type CartaArtRect = { left: number; top: number; width: number; height: number };

/**
 * Dónde queda la imagen completa (contain) dentro de la ventana, centrada,
 * igual que el resize «inside» del servidor. El resto es el fondo difuminado.
 */
export function cartaContainRect(width: number, height: number): CartaArtRect {
    if (!(width > 0) || !(height > 0)) {
        return { left: 0, top: 0, width: 100, height: 100 };
    }

    const ratio = width / height;
    if (ratio >= CARTA_ART_ASPECT_RATIO) {
        const alto = (CARTA_ART_ASPECT_RATIO / ratio) * 100;
        return { left: 0, top: (100 - alto) / 2, width: 100, height: alto };
    }

    const ancho = (ratio / CARTA_ART_ASPECT_RATIO) * 100;
    return { left: (100 - ancho) / 2, top: 0, width: ancho, height: 100 };
}

/** URL guardada del premio que manda el API (string, null o ausente) como texto del formulario. */
export function cartaImagenUrlFromPremio(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export type CartaPreviewState = "pendiente" | "guardada" | "quitada" | "vacia";

/**
 * Qué muestra el campo: un archivo elegido sin subir, la carta guardada, la
 * carta guardada que se quitará al guardar, o nada.
 */
export function cartaPreviewState(input: {
    hasPendingFile: boolean;
    savedUrl: string;
    initialUrl: string;
}): CartaPreviewState {
    if (input.hasPendingFile) {
        return "pendiente";
    }
    if (input.savedUrl.trim()) {
        return "guardada";
    }
    if (input.initialUrl.trim()) {
        return "quitada";
    }
    return "vacia";
}

/** Control del campo que recibe el foco después de elegir, quitar o conservar la carta. */
export type CartaFocusTarget = "reemplazar" | "conservar" | "archivo";

/**
 * Adónde va el foco cuando el control activado se oculta o se desmonta, según
 * el estado que queda: con vista previa (archivo elegido o carta conservada),
 * a «Reemplazar»; con la carta guardada quitada, a «Conservar la carta
 * guardada»; sin carta, al input de archivo.
 */
export function cartaFocusTarget(state: CartaPreviewState): CartaFocusTarget {
    if (state === "quitada") {
        return "conservar";
    }
    if (state === "vacia") {
        return "archivo";
    }
    return "reemplazar";
}

export type CartaImagenUrlPayload = { cartaImagenUrl?: string | null };

/**
 * Valor de cartaImagenUrl del premio especial al guardar:
 * - URL recién subida → esa URL (reemplaza a la anterior);
 * - si no, la URL guardada que se conserva → la misma URL;
 * - si había una carta guardada y se quitó → null (sin carta);
 * - si nunca hubo carta → sin la clave (al crear queda sin carta; al editar
 *   el servidor no cambia nada).
 */
export function resolveCartaImagenUrlPayload(input: {
    uploadedUrl?: string | null;
    savedUrl: string;
    initialUrl: string;
}): CartaImagenUrlPayload {
    const uploaded = input.uploadedUrl?.trim();
    if (uploaded) {
        return { cartaImagenUrl: uploaded };
    }

    const saved = input.savedUrl.trim();
    if (saved) {
        return { cartaImagenUrl: saved };
    }

    if (input.initialUrl.trim()) {
        return { cartaImagenUrl: null };
    }

    return {};
}
