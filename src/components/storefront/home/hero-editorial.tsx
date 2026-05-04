"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bannersAdminApi } from "@/lib/api/banners";
import { Banner, BannerContentConfig } from "@/lib/ai/types";

/**
 * Genera URL dinámica basada en contentConfig del banner
 * Mapea tipos de contenido a parámetros de query para /products
 * Si es un solo producto, redirije directamente a /products/[productId]
 */
function generateProductsUrlFromBannerConfig(config: BannerContentConfig): string {
  // Si es un solo producto, ir directamente al detalle
  if (
    config.type === "productos" &&
    config.productIds &&
    config.productIds.length === 1
  ) {
    return `/products/${config.productIds[0]}`;
  }

  const params = new URLSearchParams();

  switch (config.type) {
    case "categoria":
      if (config.categoriaId) {
        params.set("category", config.categoriaId);
      }
      break;

    case "linea":
      if (config.lineaId) {
        params.set("linea", config.lineaId);
      }
      break;

    case "talla":
      if (config.tallaId) {
        params.set("size", config.tallaId);
      }
      break;

    case "productos":
      if (config.productIds && config.productIds.length > 0) {
        params.set("ids", config.productIds.join(","));
      }
      break;

    case "novedades":
      params.set("sort", "newest");
      break;

    case "mas_vendidos":
      params.set("sort", "featured");
      break;

    default:
      break;
  }

  // Añadir límite si está configurado
  if (config.limit && config.limit > 0) {
    params.set("limit", config.limit.toString());
  }

  const queryString = params.toString();
  return queryString ? `/products?${queryString}` : "/products";
}

const IMAGE_AUTOPLAY_FALLBACK_MS = 5000;

type HeroSlide = {
  id: string;
  type: "video" | "image";
  src: string;               // URL del video o imagen
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  poster?: string;           // solo para video (imagen de poster)
  alt?: string;
  autoPlayDurationMs?: number;
};

// Función para mapear un banner individual (sin los productos)
function mapBannerToSlide(banner: Banner): HeroSlide | null {
  const isVideo = !!banner.videoUrl?.trim();
  const src = isVideo ? banner.videoUrl! : banner.backgroundImage;

  // Si no hay ni imagen ni video, no podemos mostrar el slide
  if (!src) return null;

  const buttons = banner.buttons ?? [];
  const primary = buttons[0];
  const secondary = buttons[1];

  // Generar URL dinámica basada en contentConfig
  // Si el botón no tiene URL custom, usar la generada desde contentConfig
  const ctaLink =
    primary?.url && primary.url !== "/" && primary.url.trim()
      ? primary.url
      : generateProductsUrlFromBannerConfig(banner.contentConfig);

  const secondaryCtaLink = secondary?.url?.trim() || "";

  return {
    id: banner.id!,
    type: isVideo ? "video" : "image",
    src,
    title: banner.title,
    subtitle: banner.subtitle ?? "",
    //Nombre del botón principal o texto por defecto si no se configura en gestión.
    ctaText: primary?.text ?? "Ver más",
    ctaLink,
    secondaryCtaText: secondary?.text ?? "",
    secondaryCtaLink,
    poster: isVideo ? banner.backgroundImage : undefined,
    alt: banner.title,
    autoPlayDurationMs: isVideo ? undefined : IMAGE_AUTOPLAY_FALLBACK_MS,
  };
}

export function HeroEditorial() {
  const heroId = useId();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const autoPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Cargar banners activos desde la API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    bannersAdminApi
      .getActive()
      .then((activeItems) => {
        if (!isMounted) return;
        // activeItems es Array<{ banner: Banner; products: Product[] }>
        const validSlides = activeItems
          .map((item) => mapBannerToSlide(item.banner))
          .filter((slide): slide is HeroSlide => slide !== null)
          .sort((a, b) => {
            // Encontrar el order original desde los banners (podría no estar en el slide)
            // Buscamos en activeItems el banner correspondiente para obtener order
            const orderA = activeItems.find(i => i.banner.id === a.id)?.banner.order ?? 999;
            const orderB = activeItems.find(i => i.banner.id === b.id)?.banner.order ?? 999;
            return orderA - orderB;
          });
        setSlides(validSlides);
        setActiveSlideIndex(0);
      })
      .catch((error) => {
        console.error("Error loading banners:", error);
        setSlides([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // --- Lógica del carrusel (igual que antes, pero usando `slides`) ---
  const clearAutoPlay = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, []);

  const pauseAndResetVideoIfNeeded = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.pause();
    videoElement.currentTime = 0;
  }, []);

  const restartVideoFromBeginning = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.pause();
    videoElement.currentTime = 0;
    void videoElement.play().catch(() => { });
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      setActiveSlideIndex((currentIndex) => {
        const nextIndex = (index + slides.length) % slides.length;
        if (currentIndex === nextIndex) {
          if (nextIndex === 0) restartVideoFromBeginning();
          return currentIndex;
        }
        if (currentIndex === 0 && nextIndex !== 0) pauseAndResetVideoIfNeeded();
        return nextIndex;
      });
    },
    [slides.length, pauseAndResetVideoIfNeeded, restartVideoFromBeginning]
  );

  const nextSlide = useCallback(() => {
    goToSlide(activeSlideIndex + 1);
  }, [activeSlideIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(activeSlideIndex - 1);
  }, [activeSlideIndex, goToSlide]);

  const resetAutoPlay = useCallback(() => {
    clearAutoPlay();
    if (slides.length === 0) return;
    const activeSlide = slides[activeSlideIndex];
    if (!activeSlide || activeSlide.type !== "image" || prefersReducedMotion) return;
    autoPlayTimeoutRef.current = setTimeout(() => {
      setActiveSlideIndex((current) => (current + 1) % slides.length);
    }, activeSlide.autoPlayDurationMs ?? IMAGE_AUTOPLAY_FALLBACK_MS);
  }, [activeSlideIndex, clearAutoPlay, prefersReducedMotion, slides]);

  const handleVideoEnded = useCallback(() => {
    nextSlide();
  }, [nextSlide]);

  const handleManualNavigation = useCallback(
    (target: number | "next" | "prev") => {
      clearAutoPlay();
      if (activeSlideIndex === 0) pauseAndResetVideoIfNeeded();
      if (target === "next") nextSlide();
      else if (target === "prev") prevSlide();
      else goToSlide(target);
    },
    [activeSlideIndex, clearAutoPlay, goToSlide, nextSlide, pauseAndResetVideoIfNeeded, prevSlide]
  );

  // Effect para prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryList | MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    updatePreference(mediaQuery);
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  // Effect para reproducción de video / autoplay de imagen
  useEffect(() => {
    if (slides.length === 0) return;
    const activeSlide = slides[activeSlideIndex];
    const videoElement = videoRef.current;
    if (activeSlide?.type === "video") {
      if (!videoElement) return;
      videoElement.currentTime = 0;
      void videoElement.play().catch(() => { });
      clearAutoPlay();
      return;
    }
    pauseAndResetVideoIfNeeded();
    resetAutoPlay();
    return clearAutoPlay;
  }, [activeSlideIndex, clearAutoPlay, pauseAndResetVideoIfNeeded, resetAutoPlay, slides]);

  useEffect(() => clearAutoPlay, [clearAutoPlay]);

  // Estados de carga y vacío
  if (isLoading) {
    return (
      <section className="storefront-frame pt-3 md:pt-4 lg:pt-5">
        <div className="relative isolate overflow-hidden border border-white/10 bg-[#050505]">
          <div className="relative min-h-[58vh] sm:min-h-[62vh] md:min-h-[72vh] lg:min-h-[82vh] xl:min-h-[86vh] bg-black/40 animate-pulse" />
        </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return null; // No mostrar nada si no hay banners activos
  }

  return (
    <section className="storefront-frame pt-3 md:pt-4 lg:pt-5">
      <div
        className="relative isolate overflow-hidden border border-white/10 bg-[#050505]"
        role="region"
        aria-roledescription="carousel"
        aria-label="La Guarida"
      >
        <div className="relative min-h-[58vh] sm:min-h-[62vh] md:min-h-[72vh] lg:min-h-[82vh] xl:min-h-[86vh]">
          {slides.map((slide, index) => {
            const isActive = index === activeSlideIndex;
            const slideId = `${heroId}-slide-${index}`;
            return (
              <article
                key={slide.id}
                id={slideId}
                className={cn(
                  "absolute inset-0 transition-opacity ease-out will-change-[opacity]",
                  prefersReducedMotion ? "duration-200" : "duration-700",
                  isActive
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                )}
                aria-hidden={!isActive}
              >
                <div className="absolute inset-0">
                  {slide.type === "video" ? (
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover object-center"
                      muted
                      autoPlay
                      playsInline
                      preload="auto"
                      controls={false}
                      loop={false}
                      poster={slide.poster}
                      onEnded={handleVideoEnded}
                      aria-label={slide.alt}
                    >
                      <source src={slide.src} type="video/mp4" />
                    </video>
                  ) : (
                    <Image
                      src={slide.src}
                      alt={slide.alt ?? slide.title}
                      fill
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes="100vw"
                      className="object-cover object-center"
                    />
                  )}
                </div>

                {/* Overlays (igual que antes) */}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.18)_32%,rgba(0,0,0,0.56)_72%,rgba(0,0,0,0.8)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.1),transparent_26%),linear-gradient(90deg,rgba(0,0,0,0.36)_0%,rgba(0,0,0,0.1)_44%,rgba(0,0,0,0.24)_100%)]" />

                <div className="relative z-10 flex h-full items-end">
                  <div className="w-full px-5 pb-8 pt-24 sm:px-7 sm:pb-10 md:px-10 md:pb-12 lg:px-14 lg:pb-14 xl:px-16 xl:pb-16">
                    <div className="max-w-[36rem] text-white">
                      <h1 className="mt-4 max-w-[10ch] font-headline text-[3.15rem] font-semibold uppercase leading-[0.84] tracking-[0.02em] text-white sm:text-[3.8rem] md:text-[4.7rem] lg:text-[5.8rem] xl:text-[6.4rem]">
                        {slide.title}
                      </h1>
                      {slide.subtitle && (
                        <p className="mt-4 max-w-[34rem] text-sm leading-6 text-white/76 sm:text-[0.95rem] sm:leading-7 md:text-base">
                          {slide.subtitle}
                        </p>
                      )}
                      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button
                          asChild
                          className="h-12 border border-white/12 bg-white px-6 text-black shadow-none hover:bg-white/92"
                        >
                          <Link href={slide.ctaLink}>
                            {slide.ctaText}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        {slide.secondaryCtaText && (
                          <Button
                            asChild
                            variant="outline"
                            className="h-12 border-white/22 bg-white/6 px-6 text-white shadow-none backdrop-blur-sm hover:border-white/38 hover:bg-white/10 hover:text-white"
                          >
                            <Link href={slide.secondaryCtaLink}>
                              {slide.secondaryCtaText}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Indicadores y controles */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 px-4 pb-4 sm:px-6 sm:pb-6 md:px-8 lg:px-10">
            <div className="pointer-events-auto flex items-center gap-2">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  className={cn(
                    "h-2.5 rounded-full border border-white/35 bg-white/24 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    idx === activeSlideIndex ? "w-9 bg-white" : "w-2.5 hover:bg-white/58"
                  )}
                  aria-label={`Ir al slide ${idx + 1}`}
                  aria-current={idx === activeSlideIndex ? "true" : undefined}
                  onClick={() => handleManualNavigation(idx)}
                />
              ))}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center border border-white/16 bg-black/24 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/40"
                aria-label="Slide anterior"
                onClick={() => handleManualNavigation("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center border border-white/16 bg-black/24 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/40"
                aria-label="Siguiente slide"
                onClick={() => handleManualNavigation("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}