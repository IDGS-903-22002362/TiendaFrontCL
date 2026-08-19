import assert from "node:assert/strict";
import test from "node:test";
import { normalizePosSku, pickProductBySku } from "./barcode";
import type { Product } from "@/lib/types";

function product(partial: Partial<Product> & Pick<Product, "id" | "name">): Product {
  return {
    description: partial.description ?? partial.name,
    price: partial.price ?? 100,
    images: [],
    category: "general",
    tags: [],
    stock: partial.stock ?? 5,
    activo: partial.activo ?? true,
    clave: partial.clave,
    ...partial,
  };
}

test("normalizePosSku trims and uppercases", () => {
  assert.equal(normalizePosSku("  cha-428  "), "CHA-428");
});

test("pickProductBySku prefers exact clave match", () => {
  const items = [
    product({ id: "1", name: "A", clave: "CHA-428" }),
    product({ id: "2", name: "B", clave: "CHA-428X" }),
  ];
  assert.equal(pickProductBySku(items, "cha-428")?.id, "1");
});

test("pickProductBySku falls back to exact id", () => {
  const items = [product({ id: "prod-9", name: "X" })];
  assert.equal(pickProductBySku(items, "PROD-9")?.id, "prod-9");
});

test("pickProductBySku ignores partial matches and inactive products", () => {
  const items = [
    product({ id: "1", name: "A", clave: "CHA-428X" }),
    product({ id: "2", name: "B", clave: "CHA-428", activo: false }),
  ];
  assert.equal(pickProductBySku(items, "CHA-428"), null);
});
