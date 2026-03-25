import type { Category, Linea, Product } from "@/lib/types";
import type {
  ProductPersonalization,
  StorefrontCategoryCard,
  StorefrontProductBadge,
} from "./types";

const PLAYER_PRESETS = [
  { id: "preset-10", label: "León 10", name: "LEON", number: "10" },
  { id: "preset-12", label: "La Fiera 12", name: "FIERA", number: "12" },
  { id: "preset-27", label: "Club 27", name: "CLUB", number: "27" },
];

export function normalizeStorefrontText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getProductPrice(product: Product) {
  return product.salePrice || product.price;
}

export function isCategoryVisible(category: Category) {
  const normalized = normalizeStorefrontText(`${category.name} ${category.slug}`);
  return !normalized.includes("test") && !normalized.includes("prueba");
}

export function isProductVisible(product: Product) {
  const normalized = normalizeStorefrontText(
    `${product.name} ${product.description} ${product.category} ${product.lineName ?? ""}`,
  );
  return !normalized.includes("test") && !normalized.includes("prueba");
}

export function isPersonalizableProduct(product: Product) {
  const normalized = normalizeStorefrontText(
    `${product.name} ${product.description} ${product.category}`,
  );
  return (
    (normalized.includes("jersey") || normalized.includes("playera")) &&
    Boolean(product.sizes?.length)
  );
}

export function getProductStockState(product: Product) {
  const stock = product.stockTotal ?? product.stock;

  if (stock <= 0) {
    return {
      label: "Agotado",
      hint: "Sin unidades disponibles por ahora",
      tone: "warning" as const,
    };
  }

  if (stock <= 4) {
    return {
      label: "Últimas piezas",
      hint: `${stock} unidades disponibles`,
      tone: "warning" as const,
    };
  }

  return {
    label: "Disponible",
    hint: "Entrega y compra inmediata",
    tone: "success" as const,
  };
}

export function getPrimaryProductBadge(product: Product): StorefrontProductBadge | null {
  const stockState = getProductStockState(product);

  if (stockState.label === "Agotado") {
    return { label: "Agotado", tone: "warning" };
  }

  if (product.tags.includes("sale")) {
    return { label: "Oferta", tone: "sale" };
  }

  if (product.tags.includes("new")) {
    return { label: "Nuevo", tone: "default" };
  }

  if (isPersonalizableProduct(product)) {
    return { label: "Personalizable", tone: "success" };
  }

  return null;
}

export function getEditorialProductCopy(product: Product) {
  const normalized = normalizeStorefrontText(
    `${product.name} ${product.description} ${product.category}`,
  );

  if (normalized.includes("jersey")) {
    return "Performance oficial con identidad de matchday.";
  }

  if (normalized.includes("gorra")) {
    return "Accesorio oficial con presencia limpia y deportiva.";
  }

  if (normalized.includes("balon")) {
    return "Pieza de entrenamiento y colección con acabado premium.";
  }

  if (normalized.includes("sudadera") || normalized.includes("chamarra")) {
    return "Capa funcional para estadio, viaje y rutina diaria.";
  }

  return "Selección oficial con enfoque en producto y uso real.";
}

export function getProductEyebrow(product: Product) {
  return product.lineName || product.category;
}

export function getProductRecommendationTitle(product: Product) {
  return isPersonalizableProduct(product)
    ? "Completa tu kit"
    : "Más piezas de la colección";
}

export function getCategoryCards(
  categories: Category[],
  products: Product[],
): StorefrontCategoryCard[] {
  return categories
    .filter(isCategoryVisible)
    .map((category) => {
      const count = products.filter((product) => {
        const productCategory = normalizeStorefrontText(product.category);
        const categorySlug = normalizeStorefrontText(category.slug);
        const categoryName = normalizeStorefrontText(category.name);
        return productCategory === categorySlug || productCategory === categoryName;
      }).length;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: getCategoryDescription(category.slug),
        eyebrow: getCategoryEyebrow(category.slug),
        href: `/products?category=${category.slug}`,
        count,
      };
    })
    .filter((category) => category.count > 0);
}

function getCategoryDescription(slug: string) {
  const normalized = normalizeStorefrontText(slug);

  if (normalized.includes("jersey") || normalized.includes("playera")) {
    return "Uniformes y siluetas clave para partido, colección y calle.";
  }

  if (normalized.includes("gorra") || normalized.includes("accesor")) {
    return "Complementos oficiales con detalle limpio y presencia real.";
  }

  if (normalized.includes("balon")) {
    return "Balones y piezas de juego con sello oficial.";
  }

  if (normalized.includes("sudadera") || normalized.includes("chamarra")) {
    return "Capas deportivas para clima variable y travel days.";
  }

  return "Selección oficial curada para una experiencia premium.";
}

function getCategoryEyebrow(slug: string) {
  const normalized = normalizeStorefrontText(slug);

  if (normalized.includes("jersey") || normalized.includes("playera")) {
    return "Matchday";
  }

  if (normalized.includes("gorra") || normalized.includes("accesor")) {
    return "Accesorios";
  }

  if (normalized.includes("balon")) {
    return "Juego";
  }

  return "Colección";
}

export function getFeaturedProducts(products: Product[]) {
  const filtered = products.filter(isProductVisible);
  return [...filtered].sort((a, b) => getProductPrice(b) - getProductPrice(a)).slice(0, 8);
}

export function getNewArrivalProducts(products: Product[]) {
  const filtered = products.filter(
    (product) => isProductVisible(product) && product.tags.includes("new"),
  );
  return filtered.length > 0 ? filtered.slice(0, 8) : getFeaturedProducts(products).slice(0, 4);
}

export function getHeroProduct(products: Product[]) {
  return (
    products.find((product) => isPersonalizableProduct(product) && isProductVisible(product)) ||
    products.find((product) => isProductVisible(product)) ||
    products[0]
  );
}

export function getLineNameById(lineas: Linea[], lineId?: string) {
  if (!lineId) {
    return "";
  }

  return lineas.find((linea) => linea.id === lineId)?.nombre ?? lineId;
}

export function getPersonalizationPresets() {
  return PLAYER_PRESETS;
}

export function sanitizePersonalizationName(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);
}

export function sanitizePersonalizationNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

export function buildPresetPersonalization(presetId: string): ProductPersonalization | null {
  const preset = PLAYER_PRESETS.find((item) => item.id === presetId);
  if (!preset) {
    return null;
  }

  return {
    mode: "player",
    name: preset.name,
    number: preset.number,
    styleLabel: "Tipografía oficial",
    previewLabel: preset.label,
    note: "Producto personalizado. No aplica para devoluciones.",
  };
}

export function buildCustomPersonalization(
  name: string,
  number: string,
): ProductPersonalization {
  const sanitizedName = sanitizePersonalizationName(name);
  const sanitizedNumber = sanitizePersonalizationNumber(number);

  return {
    mode: "custom",
    name: sanitizedName,
    number: sanitizedNumber,
    styleLabel: "Tipografía oficial",
    previewLabel: `${sanitizedName || "TU NOMBRE"} ${sanitizedNumber || ""}`.trim(),
    note: "Producto personalizado. No aplica para devoluciones.",
  };
}

export function getRelatedProducts(products: Product[], baseProduct: Product) {
  const sameCategory = products.filter(
    (product) =>
      product.id !== baseProduct.id &&
      normalizeStorefrontText(product.category) === normalizeStorefrontText(baseProduct.category),
  );

  const source = sameCategory.length > 0 ? sameCategory : products.filter((product) => product.id !== baseProduct.id);
  return source.filter(isProductVisible).slice(0, 8);
}
