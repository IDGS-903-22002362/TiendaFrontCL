import type { Category, Linea } from "@/lib/types";
import { isCategoryVisible } from "@/lib/storefront";

export type NavLinkItem = {
  label: string;
  href: string;
};

export type NavColumn = {
  title: string;
  links: NavLinkItem[];
  viewAllHref?: string;
};

export type NavSection = {
  id: string;
  label: string;
  href: string;
  columns: NavColumn[];
};

export type StorefrontNavModel = {
  sections: NavSection[];
  utilityLinks: NavLinkItem[];
};

type CatalogUrlParams = {
  category?: string;
  line?: string;
  sort?: string;
  tag?: string;
  onlyOffers?: boolean;
  onlyAvailable?: boolean;
};

export function buildCatalogUrl(params: CatalogUrlParams = {}): string {
  const search = new URLSearchParams();

  if (params.category) search.set("category", params.category);
  if (params.line) search.set("line", params.line);
  if (params.sort) search.set("sort", params.sort);
  if (params.tag) search.set("tag", params.tag);
  if (params.onlyOffers) search.set("onlyOffers", "true");
  if (params.onlyAvailable) search.set("onlyAvailable", "true");

  const query = search.toString();
  return query ? `/products?${query}` : "/products";
}

const SORT_LINKS: NavLinkItem[] = [
  { label: "Destacados", href: buildCatalogUrl({ sort: "destacados" }) },
  { label: "Populares", href: buildCatalogUrl({ sort: "populares" }) },
  { label: "Más vendidos", href: buildCatalogUrl({ sort: "mas_comprados" }) },
  { label: "Recientes", href: buildCatalogUrl({ sort: "recientes" }) },
];

export function buildNavModel(
  categories: Category[],
  lineas: Linea[],
): StorefrontNavModel {
  const visibleCategories = categories
    .filter(isCategoryVisible)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const activeLineas = lineas
    .filter((linea) => linea.activo)
    .sort((a, b) => a.codigo - b.codigo);

  const sections: NavSection[] = [];

  sections.push({
    id: "all-products",
    label: "Todos los productos",
    href: "/products",
    columns: [
      {
        title: "Explorar",
        links: [...SORT_LINKS, { label: "Ver todo", href: "/products" }],
        viewAllHref: "/products",
      },
      ...(activeLineas.length
        ? [
            {
              title: "Líneas",
              links: activeLineas.map((linea) => ({
                label: linea.nombre,
                href: buildCatalogUrl({ line: linea.id }),
              })),
              viewAllHref: "/products",
            },
          ]
        : []),
    ],
  });

  sections.push({
    id: "offers",
    label: "Ofertas",
    href: buildCatalogUrl({ onlyOffers: true }),
    columns: [
      {
        title: "Rebajas",
        links: [
          { label: "Todas las ofertas", href: buildCatalogUrl({ onlyOffers: true }) },
          {
            label: "Ofertas populares",
            href: buildCatalogUrl({ sort: "ofertas_populares", onlyOffers: true }),
          },
          {
            label: "Ofertas recientes",
            href: buildCatalogUrl({ sort: "ofertas_recientes", onlyOffers: true }),
          },
        ],
        viewAllHref: buildCatalogUrl({ onlyOffers: true }),
      },
    ],
  });

  for (const linea of activeLineas.slice(0, 4)) {
    const lineCategories = visibleCategories.filter(
      (category) => category.lineaId === linea.id,
    );

    if (lineCategories.length === 0) {
      continue;
    }

    sections.push({
      id: `line-${linea.id}`,
      label: linea.nombre,
      href: buildCatalogUrl({ line: linea.id }),
      columns: [
        {
          title: linea.nombre,
          links: lineCategories.map((category) => ({
            label: category.name,
            href: buildCatalogUrl({ category: category.id, line: linea.id }),
          })),
          viewAllHref: buildCatalogUrl({ line: linea.id }),
        },
      ],
    });
  }

  const accessoriesCategory = visibleCategories.find((category) =>
    `${category.slug} ${category.name}`.toLowerCase().includes("accesor"),
  );

  if (accessoriesCategory) {
    sections.push({
      id: `category-${accessoriesCategory.id}`,
      label: accessoriesCategory.name,
      href: buildCatalogUrl({ category: accessoriesCategory.id }),
      columns: [
        {
          title: accessoriesCategory.name,
          links: [
            {
              label: `Ver ${accessoriesCategory.name.toLowerCase()}`,
              href: buildCatalogUrl({ category: accessoriesCategory.id }),
            },
          ],
          viewAllHref: buildCatalogUrl({ category: accessoriesCategory.id }),
        },
      ],
    });
  }

  sections.push({
    id: "new",
    label: "Novedades",
    href: buildCatalogUrl({ tag: "new" }),
    columns: [
      {
        title: "Nuevo en La Guarida",
        links: [
          { label: "Últimos lanzamientos", href: buildCatalogUrl({ tag: "new" }) },
          { label: "Destacados", href: buildCatalogUrl({ sort: "destacados" }) },
        ],
        viewAllHref: buildCatalogUrl({ tag: "new" }),
      },
    ],
  });

  return {
    sections: sections.filter((section) => section.columns.some((col) => col.links.length > 0)),
    utilityLinks: [
      { label: "Ayuda", href: "/TerminosCondiciones#ayuda" },
      { label: "Pedidos", href: "/order-history" },
      { label: "Devoluciones", href: "/TerminosCondiciones#devoluciones" },
      { label: "Contacto", href: "/TerminosCondiciones#contacto" },
    ],
  };
}

export function sectionHasMegaMenu(section: NavSection): boolean {
  return section.columns.some((column) => column.links.length > 0);
}
