import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getTryOnEligibility, sendAiMessageSse } from "./ai";
test("incomplete accepted AI streams are never resubmitted", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response("event: status\ndata: {\"status\":\"processing\"}\n\n", {
      status: 200, headers: { "Content-Type": "text/event-stream" },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    sendAiMessageSse({ sessionId: "session-1", message: "hola" }, {}),
    /antes de entregar una respuesta final/,
  );
  assert.equal(requestCount, 1);
});

test("try-on eligibility sends identifiers only to the same-origin BFF", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestBody = "";
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body ?? "");
    return Response.json({
      success: true,
      data: {
        eligible: true,
        mode: "body_tryon",
        reason: null,
        requirements: [],
        disclaimer: "",
      },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await getTryOnEligibility({
    productId: "prod_1",
    userImageAssetId: "asset_1",
    sessionId: "session_1",
    price: 1,
    stock: 99,
    sku: "CLIENT-SKU",
    description: "client description",
    eligible: true,
  } as never);

  assert.equal(requestUrl, "/api/ai/tryon/eligibility");
  assert.deepEqual(JSON.parse(requestBody), {
    productId: "prod_1",
    userImageAssetId: "asset_1",
    sessionId: "session_1",
  });
  assert.deepEqual(result, {
    eligible: true,
    mode: "body_tryon",
    reason: null,
    requirements: [],
    disclaimer: "",
  });
});

test("try-on eligibility maps malformed backend claims to a safe ineligible state", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      data: {
        eligible: true,
        mode: "admin_override",
        reason: null,
        requirements: ["consent", "admin", "consent"],
        disclaimer: "x".repeat(500),
        price: 1,
        stock: 99,
      },
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await getTryOnEligibility({ productId: "prod_1" });

  assert.deepEqual(result, {
    eligible: false,
    mode: "unsupported",
    reason: "PRODUCT_UNAVAILABLE",
    requirements: [],
    disclaimer: "",
  });
  assert.equal("price" in result, false);
  assert.equal("stock" in result, false);
});

test("storefront keeps presentation copy but no local try-on business classifier", () => {
  const presentation = readFileSync(
    "src/lib/ai/try-on-eligibility.ts",
    "utf8",
  );
  const panel = readFileSync(
    "src/components/ai/ai-try-on-panel.tsx",
    "utf8",
  );
  const hook = readFileSync("src/hooks/use-try-on-eligibility.ts", "utf8");

  assert.doesNotMatch(
    presentation,
    /ADULT_LINE|APPAREL_CATEGORY|isTryOnEligibleProduct|categoryId|lineId|description/i,
  );
  assert.doesNotMatch(panel, /isTryOnEligibleProduct|getTryOnIneligibilityMessage/);
  assert.doesNotMatch(panel, /sku:\s*selectedProduct|price:\s*selectedProduct|stock:/);
  assert.match(panel, /await deleteAiUserImage\(cleanupAssetId\)/);
  assert.match(panel, /conservamos la referencia/);
  assert.match(hook, /state\.productId === productId/);
  assert.match(hook, /refetch/);
});
