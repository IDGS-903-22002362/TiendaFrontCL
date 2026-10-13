import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  PRODUCTION_BACKEND_BASE,
  joinBackendApiUrl,
  resolveBackendBaseUrl,
} from "./backend-url";

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

describe("resolveBackendBaseUrl", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalApiBase = env.API_BASE_URL;
  const originalPublicApiBase = env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    env.API_BASE_URL = originalApiBase;
    env.NEXT_PUBLIC_API_BASE_URL = originalPublicApiBase;
  });

  it("keeps an explicit local backend while developing", () => {
    env.NODE_ENV = "development";
    env.API_BASE_URL = "http://localhost:3000/api";
    env.NEXT_PUBLIC_API_BASE_URL = undefined;

    assert.equal(resolveBackendBaseUrl(), "http://localhost:3000/api");
  });

  it("ignores a localhost override in production", () => {
    env.NODE_ENV = "production";
    env.API_BASE_URL = "http://127.0.0.1:3000/api";
    env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

    assert.equal(resolveBackendBaseUrl(), PRODUCTION_BACKEND_BASE);
  });
});
