export type StorefrontBadgeTone = "default" | "sale" | "warning" | "success";

export type StorefrontProductBadge = {
  label: string;
  tone: StorefrontBadgeTone;
};

export type ProductPersonalizationMode = "player" | "custom";

export type ProductPersonalization = {
  mode: ProductPersonalizationMode;
  name: string;
  number: string;
  styleLabel: string;
  previewLabel: string;
  note: string;
};

export type StorefrontCategoryCard = {
  id: string;
  name: string;
  slug: string;
  description: string;
  eyebrow: string;
  href: string;
  count: number;
};
