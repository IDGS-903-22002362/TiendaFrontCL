"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Grid2X2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lens } from "@/components/ui/lens";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const FALLBACK_IMAGE = "/images/leon.png";
const DESKTOP_PREVIEW_LIMIT = 4;

function getUniqueImages(images: string[]) {
  const seen = new Set<string>();

  return images.filter((image) => {
    const normalized = image.trim();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function getDesktopTileClass(imageCount: number, index: number) {
  if (imageCount === 1) {
    return "col-span-2 aspect-[4/5] min-h-[640px]";
  }

  if (imageCount === 3 && index === 0) {
    return "row-span-2 aspect-[4/5] min-h-[680px]";
  }

  return imageCount === 2
    ? "aspect-[4/5] min-h-[420px]"
    : "aspect-[4/5] min-h-[332px]";
}

function ProductGalleryFrame({
  image,
  alt,
  priority = false,
  sizes,
  zoomEnabled,
}: {
  image: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  zoomEnabled: boolean;
}) {
  const media = (
    <div className="relative h-full w-full overflow-hidden bg-[#f6f7f2]">
      <Image
        src={image}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain"
      />
    </div>
  );

  if (!zoomEnabled) {
    return media;
  }

  return (
    <Lens lensSize={220} zoomFactor={1.9}>
      {media}
    </Lens>
  );
}

export function ProductGallery({ product }: { product: Product }) {
  const images = useMemo(() => {
    const normalized = getUniqueImages(product.images ?? []);
    return normalized.length > 0 ? normalized : [FALLBACK_IMAGE];
  }, [product.images]);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [lightboxApi, setLightboxApi] = useState<CarouselApi>();
  const [mobileIndex, setMobileIndex] = useState(0);
  const [canHoverZoom, setCanHoverZoom] = useState(false);

  useEffect(() => {
    const mediaQuery =
      typeof window !== "undefined"
        ? window.matchMedia("(hover: hover) and (pointer: fine)")
        : null;

    if (!mediaQuery) {
      return;
    }

    const sync = () => setCanHoverZoom(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);

    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setDesktopExpanded(false);
    setMobileIndex(0);
    setLightboxIndex((current) =>
      current === null ? null : Math.min(current, images.length - 1),
    );
    mobileApi?.scrollTo(0, true);
    lightboxApi?.scrollTo(0, true);
  }, [images, lightboxApi, mobileApi]);

  useEffect(() => {
    if (!mobileApi) {
      return;
    }

    const onSelect = () => setMobileIndex(mobileApi.selectedScrollSnap());
    onSelect();
    mobileApi.on("select", onSelect);
    mobileApi.on("reInit", onSelect);

    return () => {
      mobileApi.off("select", onSelect);
      mobileApi.off("reInit", onSelect);
    };
  }, [mobileApi]);

  useEffect(() => {
    if (!lightboxApi || lightboxIndex === null) {
      return;
    }

    lightboxApi.scrollTo(lightboxIndex, true);

    const onSelect = () => setLightboxIndex(lightboxApi.selectedScrollSnap());
    lightboxApi.on("select", onSelect);
    lightboxApi.on("reInit", onSelect);

    return () => {
      lightboxApi.off("select", onSelect);
      lightboxApi.off("reInit", onSelect);
    };
  }, [lightboxApi, lightboxIndex]);

  const previewImages = desktopExpanded
    ? images
    : images.slice(0, DESKTOP_PREVIEW_LIMIT);
  const hiddenImagesCount = images.length - previewImages.length;
  const activeMobileImage = images[mobileIndex] ?? images[0];
  const currentLightboxIndex = lightboxIndex ?? 0;

  return (
    <>
      <div className="relative z-0 min-w-0 overflow-hidden space-y-4">
        <div className="lg:hidden">
          <Carousel
            setApi={setMobileApi}
            opts={{ align: "start", loop: images.length > 1 }}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {images.map((image, index) => (
                <CarouselItem key={`${image}-${index}`} className="pl-3">
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Ampliar imagen ${index + 1} de ${images.length}`}
                    className="group block w-full text-left"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.9rem] border border-border/70 bg-card shadow-[var(--shadow-elevated)]">
                      <ProductGalleryFrame
                        image={image}
                        alt={`${product.name} imagen ${index + 1}`}
                        priority={index === 0}
                        sizes="100vw"
                        zoomEnabled={false}
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[rgb(17_23_21_/_0.6)] via-[rgb(17_23_21_/_0.18)] to-transparent px-5 py-4 text-white">
                        <span className="text-xs font-medium uppercase tracking-[0.26em] text-white/78">
                          Imagen {index + 1}
                        </span>
                        <span className="inline-flex items-center gap-2 text-sm font-medium">
                          Ampliar
                          <Expand className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {images.length > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={`${image}-thumb-${index}`}
                    type="button"
                    onClick={() => mobileApi?.scrollTo(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                    aria-current={mobileIndex === index}
                    className={cn(
                      "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-card transition-all",
                      mobileIndex === index
                        ? "border-primary shadow-[var(--shadow-card)]"
                        : "border-border/70",
                    )}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} miniatura ${index + 1}`}
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </button>
                ))}
              </div>
              <div className="shrink-0 rounded-full border border-border/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-text-secondary">
                {mobileIndex + 1}/{images.length}
              </div>
            </div>
          ) : null}

          {activeMobileImage ? (
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-text-secondary">
              Desliza para ver todas las imágenes del producto.
            </p>
          ) : null}
        </div>

        <div className="hidden min-w-0 overflow-hidden lg:block">
          <div className="grid min-w-0 grid-cols-2 items-start gap-3 overflow-hidden xl:gap-4">
            {previewImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={`Abrir imagen ${index + 1} en vista ampliada`}
                className={cn(
                  "group relative block h-full w-full min-w-0 max-w-full overflow-hidden rounded-[1.9rem] border border-border/70 bg-card text-left shadow-[var(--shadow-elevated)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  getDesktopTileClass(previewImages.length, index),
                )}
              >
                <ProductGalleryFrame
                  image={image}
                  alt={`${product.name} imagen ${index + 1}`}
                  priority={index < 2}
                  sizes="(max-width: 1279px) 50vw, 36vw"
                  zoomEnabled={canHoverZoom}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[rgb(17_23_21_/_0.5)] via-[rgb(17_23_21_/_0.14)] to-transparent px-5 py-5 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="text-xs font-medium uppercase tracking-[0.24em] text-white/80">
                    {canHoverZoom ? "Zoom dinámico" : `Imagen ${index + 1}`}
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    Ver detalle
                    <Expand className="h-4 w-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {hiddenImagesCount > 0 ? (
            <button
              type="button"
              onClick={() => setDesktopExpanded(true)}
              className="mt-4 inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary/35 hover:text-primary"
            >
              <Grid2X2 className="h-4 w-4" />
              Mostrar {hiddenImagesCount} imagen
              {hiddenImagesCount === 1 ? "" : "es"} más
            </button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLightboxIndex(null);
          }
        }}
      >
        <DialogContent
          hideClose
          className="w-[calc(100%-0.75rem)] max-w-[1400px] overflow-hidden rounded-[2rem] border-border/60 bg-[rgb(244_246_241)] p-0"
        >
          <DialogTitle className="sr-only">
            Galería ampliada de {product.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Navega entre las imágenes del producto y revisa los detalles.
          </DialogDescription>

          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.26em] text-text-secondary">
                {product.category}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Imagen {currentLightboxIndex + 1} de {images.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => lightboxApi?.scrollPrev()}
                    aria-label="Imagen anterior"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/35 hover:text-primary disabled:pointer-events-none disabled:opacity-45"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => lightboxApi?.scrollNext()}
                    aria-label="Imagen siguiente"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/35 hover:text-primary disabled:pointer-events-none disabled:opacity-45"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Cerrar galería ampliada"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-medium uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/35 hover:text-primary"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_132px]">
            <div className="min-w-0 border-b border-border/60 lg:border-b-0 lg:border-r">
              <Carousel
                setApi={setLightboxApi}
                opts={{ align: "center", loop: images.length > 1 }}
                className="w-full"
              >
                <CarouselContent className="-ml-0">
                  {images.map((image, index) => (
                    <CarouselItem key={`${image}-lightbox-${index}`} className="pl-0">
                      <div className="relative aspect-[4/5] min-h-[60vh] bg-[rgb(244_246_241)]">
                        <Image
                          src={image}
                          alt={`${product.name} ampliada ${index + 1}`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 70vw"
                          className="object-contain"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>

            <div className="flex gap-3 overflow-x-auto px-4 py-4 lg:flex-col lg:overflow-y-auto lg:px-3">
              {images.map((image, index) => (
                <button
                  key={`${image}-nav-${index}`}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Ir a imagen ${index + 1}`}
                  aria-current={currentLightboxIndex === index}
                  className={cn(
                    "relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.25rem] border bg-card transition-all lg:h-[108px] lg:w-full",
                    currentLightboxIndex === index
                      ? "border-primary shadow-[var(--shadow-card)]"
                      : "border-border/70",
                  )}
                >
                  <Image
                    src={image}
                    alt={`${product.name} miniatura ampliada ${index + 1}`}
                    fill
                    sizes="108px"
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
