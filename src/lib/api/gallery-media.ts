export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
] as const;

/** Límites del backend (`galeria.routes` + Cloud Functions HTTP). */
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_IMAGE_FILES_PER_REQUEST = 10;
export const MAX_VIDEO_FILES_PER_REQUEST = 5;

export type GalleryMediaType = "imagen" | "video";

export function validateGalleryFile(file: File, tipo: GalleryMediaType) {
  if (tipo === "imagen") {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new Error("Formato de imagen no permitido");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("La imagen excede el límite de 20 MB");
    }
  }

  if (tipo === "video") {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])) {
      throw new Error("Formato de video no permitido");
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error("El video excede el límite de 30 MB");
    }
  }
}
