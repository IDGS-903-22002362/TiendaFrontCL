import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSponsorUrl } from "./patrocinadores-url";

describe("normalizeSponsorUrl", () => {
  it("deja vacío un enlace en blanco", () => {
    assert.equal(normalizeSponsorUrl("   "), "");
  });

  it("normaliza una url https", () => {
    assert.equal(
      normalizeSponsorUrl("https://corona.mx/promo"),
      "https://corona.mx/promo",
    );
  });

  it("rechaza un esquema que no abre en la web", () => {
    assert.equal(normalizeSponsorUrl("javascript:alert(1)"), null);
    assert.equal(normalizeSponsorUrl("corona.mx"), null);
  });
});
