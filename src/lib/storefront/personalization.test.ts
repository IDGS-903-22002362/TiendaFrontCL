import assert from "node:assert/strict";
import test from "node:test";
import type { Product } from "@/lib/types";
import { isPersonalizableProduct } from "./index";

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    name: "Jersey Leon Local cab",
    description: "Jersey oficial de la temporada",
    price: 1499,
    images: [],
    category: "Jerseys",
    tags: [],
    sizes: ["s", "m", "l"],
    stock: 10,
    ...overrides,
  };
}

test("personalization follows the backend flag, never the product name", () => {
  assert.equal(
    isPersonalizableProduct(buildProduct({ personalizable: true })),
    true,
  );
  assert.equal(
    isPersonalizableProduct(buildProduct({ personalizable: false })),
    false,
  );
});

test("a jersey without the backend flag is not offered for personalization", () => {
  // Inferirlo por nombre hacía que el carrito respondiera 500 al agregarlo.
  assert.equal(
    isPersonalizableProduct(buildProduct({ personalizable: undefined })),
    false,
  );
});

test("a non-jersey marked as personalizable is still personalizable", () => {
  assert.equal(
    isPersonalizableProduct(
      buildProduct({
        name: "Playera entrenamiento",
        description: "Playera oficial",
        category: "Playeras",
        personalizable: true,
      }),
    ),
    true,
  );
});
