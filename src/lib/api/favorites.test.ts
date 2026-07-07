import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapFavoriteProductToProductCard } from "./favorites";

describe("mapFavoriteProductToProductCard", () => {
  it("maps backend favorite product fields and avoids NaN prices", () => {
    const product = mapFavoriteProductToProductCard({
      id: "prod-1",
      clave: "JER-01",
      descripcion: "Jersey local",
      precioPublico: 1299,
      imagenes: ["https://example.com/jersey.jpg"],
    });

    assert.equal(product.id, "prod-1");
    assert.equal(product.name, "Jersey local");
    assert.equal(product.price, 1299);
    assert.deepEqual(product.images, ["https://example.com/jersey.jpg"]);
  });

  it("falls back to zero when precioPublico is invalid", () => {
    const product = mapFavoriteProductToProductCard({
      id: "prod-2",
      clave: "JER-02",
      descripcion: "Jersey visita",
      precioPublico: Number.NaN,
      imagenes: [],
    });

    assert.equal(product.price, 0);
    assert.equal(product.name, "Jersey visita");
  });
});
