import assert from "node:assert/strict";
import test from "node:test";
import { buildLoyaltyBackendPath } from "./loyalty-proxy-path";

test("storefront loyalty calls use the internal JWT namespace", () => {
  assert.equal(
    buildLoyaltyBackendPath(["staff", "qr-members", "client_1"]),
    "/api/loyalty/internal/v1/staff/qr-members/client_1",
  );
  assert.equal(
    buildLoyaltyBackendPath(["earn-preview"]),
    "/api/loyalty/internal/v1/earn-preview",
  );
});
