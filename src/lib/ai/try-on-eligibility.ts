type TryOnEligibilityInput = {
  categoryId?: string | null;
  categoryName?: string | null;
  lineId?: string | null;
  lineName?: string | null;
  description?: string | null;
};

const ADULT_LINE_IDS = new Set(["caballero", "dama", "viejito"]);
const NON_ADULT_LINE_IDS = new Set([
  "bebe",
  "infantil",
  "adolescente",
  "juvenil",
  "nino",
  "nina",
  "kids",
  "baby",
]);

const APPAREL_CATEGORY_IDS = new Set([
  "jersey",
  "playera",
  "sudadera",
  "chamarra",
  "pantalon",
  "short",
]);

const EXCLUDED_CATEGORY_IDS = new Set([
  "gorra",
  "calcetas",
  "balon",
  "accesorios",
]);

const ADULT_LINE_KEYWORDS = [
  "caballero",
  "dama",
  "viejito",
  "viejita",
  "adulto",
  "adulta",
  "hombre",
  "mujer",
];
const NON_ADULT_LINE_KEYWORDS = [
  "bebe",
  "baby",
  "infantil",
  "adolescente",
  "juvenil",
  "nino",
  "nina",
  "kids",
  "kid",
];
const APPAREL_KEYWORDS = [
  "jersey",
  "playera",
  "camiseta",
  "sudadera",
  "hoodie",
  "chamarra",
  "pantalon",
  "short",
  "prenda",
];
const EXCLUDED_CATEGORY_KEYWORDS = [
  "gorra",
  "cachucha",
  "beanie",
  "calceta",
  "calcetin",
  "balon",
  "accesorio",
  "souvenir",
  "bufanda",
  "llavero",
  "bandera",
  "termo",
  "taza",
  "mochila",
];

const normalizeToken = (value: string | undefined | null): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hasKeyword = (normalizedText: string, keywords: string[]): boolean =>
  keywords.some((keyword) => normalizedText.includes(keyword));

export function isTryOnEligibleProduct(input: TryOnEligibilityInput): boolean {
  const normalizedLineId = normalizeToken(input.lineId);
  const normalizedLineName = normalizeToken(input.lineName);
  const normalizedCategoryId = normalizeToken(input.categoryId);
  const normalizedCategoryName = normalizeToken(input.categoryName);
  const normalizedDescription = normalizeToken(input.description);

  if (
    NON_ADULT_LINE_IDS.has(normalizedLineId) ||
    hasKeyword(normalizedLineName, NON_ADULT_LINE_KEYWORDS)
  ) {
    return false;
  }

  if (
    EXCLUDED_CATEGORY_IDS.has(normalizedCategoryId) ||
    hasKeyword(normalizedCategoryName, EXCLUDED_CATEGORY_KEYWORDS) ||
    hasKeyword(normalizedDescription, EXCLUDED_CATEGORY_KEYWORDS)
  ) {
    return false;
  }

  const isAdultLine =
    ADULT_LINE_IDS.has(normalizedLineId) ||
    hasKeyword(normalizedLineName, ADULT_LINE_KEYWORDS);
  const isApparelCategory =
    APPAREL_CATEGORY_IDS.has(normalizedCategoryId) ||
    hasKeyword(normalizedCategoryName, APPAREL_KEYWORDS) ||
    hasKeyword(normalizedDescription, APPAREL_KEYWORDS);

  return isAdultLine && isApparelCategory;
}

export function getTryOnIneligibilityMessage(
  input: TryOnEligibilityInput,
): string {
  const normalizedLineId = normalizeToken(input.lineId);
  const normalizedLineName = normalizeToken(input.lineName);

  if (
    NON_ADULT_LINE_IDS.has(normalizedLineId) ||
    hasKeyword(normalizedLineName, NON_ADULT_LINE_KEYWORDS)
  ) {
    return "El probador virtual solo esta disponible para prendas de adulto.";
  }

  return "Este producto no es compatible con el probador virtual.";
}
