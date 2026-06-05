import re

with open("src/lib/types.ts", "r") as f:
    content = f.read()

new_types = """
export type CatalogSort =
  | "destacados"
  | "precio_asc"
  | "precio_desc"
  | "recientes"
  | "nombre_asc";

export type CatalogQuery = {
  limit?: number; // default 24, max 48
  cursor?: string;
  category?: string;
  categoria?: string;
  line?: string;
  linea?: string;
  talla?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
  q?: string;
  onlyOffers?: boolean;
  onlyAvailable?: boolean;
};

export type CatalogProductCard = {
  id: string;
  slug: string;
  nombre: string;
  categoria: string;
  categoriaLabel: string;
  linea: string;
  lineaLabel: string;
  precioOriginal: number;
  precioFinal: number;
  tieneOferta: boolean;
  ofertaAplicadaId: string | null;
  ofertaTitulo: string | null;
  descuentoTotal: number;
  imagenPrincipal: string | null;
  stockTotal: number;
  disponible: boolean;
  destacado: boolean;
};

export type CatalogResponse = {
  items: CatalogProductCard[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type AdminProductStatus = "todos" | "activo" | "inactivo";

export type AdminProductListItem = {
  id: string;
  clave: string;
  descripcion: string;
  slug: string;
  lineaId: string;
  categoriaId: string;
  precioPublico: number;
  existencias: number;
  disponible: boolean;
  destacado: boolean;
  activo: boolean;
  imagenPrincipal: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AdminProductsResponse = {
  success: boolean;
  count: number;
  data: AdminProductListItem[];
};
"""

content += new_types

with open("src/lib/types.ts", "w") as f:
    f.write(content)
