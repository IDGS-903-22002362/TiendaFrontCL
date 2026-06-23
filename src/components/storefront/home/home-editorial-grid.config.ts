export type HomeEditorialGridTile = {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
  ctaLabel: string;
  imageSrc: string;
  imageAlt: string;
};

/**
 * Swap `imageSrc` per tile when final creative is ready.
 * All URLs use images.unsplash.com (already allowed in next.config.ts).
 */
export const HOME_EDITORIAL_GRID_TILES: HomeEditorialGridTile[] = [
  {
    id: "ofertas",
    eyebrow: "Rebajas",
    title: "Ofertas",
    href: "/products?onlyOffers=true",
    ctaLabel: "Comprar",
    imageSrc: "/home/gato.jpeg",
    imageAlt: "Producto Club León en oferta",
  },
  {
    id: "populares",
    eyebrow: "Alta demanda",
    title: "Populares",
    href: "/products?sort=populares",
    ctaLabel: "Ver más",
    imageSrc: "/home/zam.jpeg",
    imageAlt: "Playera Club León popular",
  },
  {
    id: "mas-comprados",
    eyebrow: "Top ventas",
    title: "Más comprados",
    href: "/products?sort=mas_comprados",
    ctaLabel: "Ver más",
    imageSrc: "/home/pau.jpeg",
    imageAlt: "Producto Club León más comprado",
  },
  {
    id: "novedades",
    eyebrow: "Recién llegados",
    title: "Novedades",
    href: "/products?sort=recientes",
    ctaLabel: "Ver más",
    imageSrc: "/home/pato.jpeg",
    imageAlt: "Nueva colección Club León",
  },
];
