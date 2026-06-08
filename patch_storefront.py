with open("src/lib/api/storefront.ts", "r") as f:
    content = f.read()

import re

new_imports = """
import type {
  CatalogQuery,
  CatalogResponse,
  CatalogProductCard,
  Product,
"""

content = re.sub(r'import type \{\s*Category,\s*Product,', new_imports.strip(), content)

new_methods = """
export function mapCatalogProductToProductCardViewModel(
  catalogProduct: CatalogProductCard,
): Product {
  const tags: Product["tags"] = [];
  if (catalogProduct.tieneOferta) tags.push("sale");
  if (catalogProduct.destacado) tags.push("new"); // map destacado to new for badge display if needed, or customize

  return {
    id: catalogProduct.id,
    name: catalogProduct.nombre,
    description: "", // Public catalog card doesn't need full description
    price: catalogProduct.precioOriginal,
    salePrice: catalogProduct.precioFinal,
    images: catalogProduct.imagenPrincipal ? [catalogProduct.imagenPrincipal] : [],
    category: catalogProduct.categoriaLabel || catalogProduct.categoria,
    lineName: catalogProduct.lineaLabel || catalogProduct.linea,
    tags,
    stock: catalogProduct.stockTotal,
    stockTotal: catalogProduct.stockTotal,
    activo: catalogProduct.disponible, // Use disponible for UI rendering if it maps closely
  };
}

export async function fetchCatalogPage(params: CatalogQuery = {}): Promise<CatalogResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const res = await fetch(`/api/productos/catalogo?${searchParams.toString()}`);

  if (!res.ok) {
    throw new Error("No se pudo cargar el catalogo");
  }

  return (await res.json()) as CatalogResponse;
}
"""

content += "\n" + new_methods

with open("src/lib/api/storefront.ts", "w") as f:
    f.write(content)
