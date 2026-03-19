import type { Product } from "@/lib/types";

const PRODUCT_CONTEXT_START = "[[PRODUCT_CONTEXT]]";
const PRODUCT_CONTEXT_END = "[[/PRODUCT_CONTEXT]]";

type ProductContextPayload = {
  type: "active_product_context";
  instruction: string;
  product: {
    productId: string;
    name: string;
    category: string;
    description: string;
    price: number;
    salePrice?: number;
    sizes?: string[];
    colors?: string[];
    stock: number;
    lineName?: string;
    sku?: string;
  };
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getProductContextPattern() {
  return new RegExp(
    `${escapeRegExp(PRODUCT_CONTEXT_START)}([\\s\\S]*?)${escapeRegExp(PRODUCT_CONTEXT_END)}`,
    "g",
  );
}

function normalizeStringList(values?: string[]) {
  return values?.map((value) => value.trim()).filter(Boolean) ?? [];
}

function buildProductContextPayload(product: Product): ProductContextPayload {
  const sizes = normalizeStringList(product.sizes);
  const colors = normalizeStringList(product.colors);

  return {
    type: "active_product_context",
    instruction:
      "The user is currently viewing this product page. Unless the user explicitly mentions a different product, assume follow-up questions refer to this product.",
    product: {
      productId: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      ...(product.salePrice !== undefined
        ? { salePrice: product.salePrice }
        : {}),
      ...(sizes.length > 0 ? { sizes } : {}),
      ...(colors.length > 0 ? { colors } : {}),
      stock: product.stockTotal ?? product.stock,
      ...(product.lineName ? { lineName: product.lineName } : {}),
      ...(product.clave ? { sku: product.clave } : {}),
    },
  };
}

function extractProductContextPayloads(content: string) {
  if (!content) {
    return [] as ProductContextPayload[];
  }

  const payloads: ProductContextPayload[] = [];

  for (const match of content.matchAll(getProductContextPattern())) {
    const serializedPayload = match[1]?.trim();
    if (!serializedPayload) {
      continue;
    }

    try {
      const parsedPayload = JSON.parse(serializedPayload) as ProductContextPayload;
      if (
        parsedPayload?.type === "active_product_context" &&
        parsedPayload.product?.productId
      ) {
        payloads.push(parsedPayload);
      }
    } catch {
      continue;
    }
  }

  return payloads;
}

export function buildProductContextMessage(product: Product, message: string) {
  const serializedPayload = JSON.stringify(buildProductContextPayload(product));
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return `${PRODUCT_CONTEXT_START}${serializedPayload}${PRODUCT_CONTEXT_END}`;
  }

  return `${PRODUCT_CONTEXT_START}${serializedPayload}${PRODUCT_CONTEXT_END}\n\n${trimmedMessage}`;
}

export function stripProductContextFromMessage(content: string) {
  if (!content) {
    return "";
  }

  return content
    .replace(getProductContextPattern(), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function messageContainsProductContext(
  content: string,
  productId: string,
) {
  return extractProductContextPayloads(content).some(
    (payload) => payload.product.productId === productId,
  );
}
