export type HeroSlide = {
  type: "video" | "image";
  src: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  poster?: string;
  alt?: string;
  autoPlayDurationMs?: number;
};

export const heroSlides: HeroSlide[] = [
  {
    type: "video",
    src: "/herobanner/video 1.mp4",
    poster: "/herobanner/fondonuevajersey.webp",
    title: "",
    subtitle: "",
    ctaText: "Comprar jerseys",
    ctaLink: "/products?category=jerseys",
    secondaryCtaText: "Ver novedades",
    secondaryCtaLink: "/products?tag=new",
    alt: "Video principal de la nueva campana de La Guarida",
  },
  {
    type: "image",
    src: "/herobanner/fondonuevajersey.webp",
    title: "",
    subtitle: "",
    ctaText: "Explorar coleccion",
    ctaLink: "/products",
    secondaryCtaText: "Ver jersey oficial",
    secondaryCtaLink: "/products?category=jerseys",
    alt: "Imagen editorial de jersey oficial del Club Leon",
    autoPlayDurationMs: 5200,
  },
  {
    type: "image",
    src: "/herobanner/sisiz.webp",
    title: "",
    subtitle: "",
    ctaText: "Ir al catalogo",
    ctaLink: "/products",
    secondaryCtaText: "Ver accesorios",
    secondaryCtaLink: "/products?category=accesorios",
    alt: "Imagen editorial secundaria de la campana premium",
    autoPlayDurationMs: 5600,
  },
];
