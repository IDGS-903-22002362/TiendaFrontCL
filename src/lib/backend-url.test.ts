import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinBackendApiUrl } from "./backend-url";

describe("joinBackendApiUrl", () => {
  it("dedupes /api when base already ends with /api", () => {
    assert.equal(
      joinBackendApiUrl("http://localhost:3000/api", "/api/favoritos"),
      "http://localhost:3000/api/favoritos",
    );
  });

  it("keeps a single /api when base has no /api suffix", () => {
    assert.equal(
      joinBackendApiUrl("http://localhost:3000", "/api/favoritos"),
      "http://localhost:3000/api/favoritos",
    );
  });

  it("normalizes production Cloud Function base URLs", () => {
    assert.equal(
      joinBackendApiUrl(
        "https://us-central1-e-comerce-leon.cloudfunctions.net/api",
        "/api/favoritos",
      ),
      "https://us-central1-e-comerce-leon.cloudfunctions.net/api/favoritos",
    );
  });
});
