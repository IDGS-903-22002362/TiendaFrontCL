"use client";

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { apiFetch } from "./client";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;

export type GalleryMediaType = "imagen" | "video";

export type GalleryMediaMetadataRequest = {
  tipo: GalleryMediaType;
  url: string;
  storagePath: string;
  contentType: string;
  size: number;
  nombreOriginal: string;
  width?: number;
  height?: number;
  duration?: number;
  orden?: number;
};

export type GalleryMediaMetadataResponse = {
  success: true;
  message?: string;
  data: GalleryMediaMetadataRequest & {
    id: string;
    galeriaId: string;
    creadoEn: string;
  };
};

type UploadGalleryMediaInput = {
  galeriaId: string;
  file: File;
  tipo: GalleryMediaType;
  onProgress?: (progress: number) => void;
};

export function validateGalleryFile(file: File, tipo: GalleryMediaType) {
  if (tipo === "imagen") {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new Error("Formato de imagen no permitido");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("La imagen excede el limite de 10 MB");
    }
  }

  if (tipo === "video") {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])) {
      throw new Error("Formato de video no permitido");
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error("El video excede el limite de 200 MB");
    }
  }
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildGalleryStoragePath(galeriaId: string, file: File) {
  return `galeria/${galeriaId}/${Date.now()}_${sanitizeFileName(file.name)}`;
}

async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo leer la imagen"));
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function getVideoMetadata(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("No se pudo leer el video"));
    });

    return {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: Number.isFinite(video.duration) ? video.duration : undefined,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadGalleryMediaToStorage({
  galeriaId,
  file,
  tipo,
  onProgress,
}: UploadGalleryMediaInput): Promise<GalleryMediaMetadataRequest> {
  validateGalleryFile(file, tipo);

  const storage = getFirebaseStorage();
  const storagePath = buildGalleryStoragePath(galeriaId, file);
  const fileRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(fileRef, file, {
    contentType: file.type,
  });

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
        onProgress?.(progress);
      },
      reject,
      () => resolve(),
    );
  });

  const [url, extra] = await Promise.all([
    getDownloadURL(uploadTask.snapshot.ref),
    tipo === "imagen" ? getImageDimensions(file) : getVideoMetadata(file),
  ]);

  return {
    tipo,
    url,
    storagePath,
    contentType: file.type,
    size: file.size,
    nombreOriginal: file.name,
    ...extra,
  };
}

export async function saveGalleryMediaMetadata(
  galeriaId: string,
  metadata: GalleryMediaMetadataRequest,
) {
  return apiFetch<GalleryMediaMetadataResponse>(
    `/api/galeria/${galeriaId}/media/metadata`,
    {
      method: "POST",
      body: JSON.stringify(metadata),
    },
    { local: true },
  );
}

export async function uploadAndRegisterGalleryMedia(
  params: UploadGalleryMediaInput,
) {
  const metadata = await uploadGalleryMediaToStorage(params);
  return saveGalleryMediaMetadata(params.galeriaId, metadata);
}
