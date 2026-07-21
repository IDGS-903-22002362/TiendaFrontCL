import type { Product } from "@/lib/types";

const PRODUCT_CONTEXT_START = "[[PRODUCT_CONTEXT]]";
const PRODUCT_CONTEXT_END = "[[/PRODUCT_CONTEXT]]";

type ProductContextPayload = {
  type: "active_product_context";
  productId?: string;
  pageContext?: "product_detail";
  product?: {
    productId: string;
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
      const parsedPayload = JSON.parse(
        serializedPayload,
      ) as ProductContextPayload;
      if (
        parsedPayload?.type === "active_product_context" &&
        (parsedPayload.productId || parsedPayload.product?.productId)
      ) {
        payloads.push(parsedPayload);
      }
    } catch {
      continue;
    }
  }

  return payloads;
}

export function buildProductContextMessage(
  product: Pick<Product, "id">,
  message: string,
): string {
  // The backend currently accepts clientContext but does not apply it to chat
  // planning. Keep this compatibility marker identifier-only so the backend
  // (and its tools) must rehydrate all commercial product data.
  const serializedPayload = JSON.stringify({
    type: "active_product_context",
    productId: product.id,
    pageContext: "product_detail",
  });
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
    (payload) =>
      (payload.productId ?? payload.product?.productId) === productId,
  );
}
