import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { DELETE, POST } from "@/app/api/ai/[[...path]]/route";
import { evaluateAiRoute } from "./ai-route-policy";

test("AI route policy allows only the consumed route catalog", () => {
  const allowed: Array<[string, string[]]> = [
    ["GET", ["chat", "sessions"]],
    ["POST", ["chat", "sessions"]],
    ["POST", ["chat", "messages"]],
    ["GET", ["chat", "sessions", "session_1"]],
    ["POST", ["files", "upload"]],
    ["DELETE", ["files", "asset-1"]],
    ["POST", ["tryon", "eligibility"]],
    ["GET", ["tryon", "jobs"]],
    ["POST", ["tryon", "jobs"]],
    ["GET", ["tryon", "jobs", "job-1"]],
    ["GET", ["tryon", "jobs", "job-1", "image"]],
    ["GET", ["tryon", "jobs", "job-1", "download"]],
    ["GET", ["admin", "metrics"]],
    ["GET", ["admin", "jobs"]],
  ];
  for (const [method, path] of allowed) {
    assert.equal(evaluateAiRoute(method, path).status, 200);
  }
});

test("AI route policy rejects wrong methods and unsafe paths", async () => {
  assert.deepEqual(evaluateAiRoute("DELETE", ["admin", "metrics"]), {
    status: 405, allow: "GET",
  });
  for (const id of ["..", ".", "a/b", "a\\b", "%2e%2e"]) {
    assert.equal(evaluateAiRoute("GET", ["chat", "sessions", id]).status, 404);
  }
  assert.equal(evaluateAiRoute("GET", ["tryon", "jobs", "id", "image", "extra"]).status, 404);
  assert.deepEqual(evaluateAiRoute("GET", ["tryon", "eligibility"]), {
    status: 405,
    allow: "POST",
  });

  const request = (method: string) => new NextRequest("http://localhost/api/ai/test", { method });
  const unknown = await POST(request("POST"), {
    params: Promise.resolve({ path: ["admin", "tools", "execute"] }),
  });
  const wrongMethod = await DELETE(request("DELETE"), {
    params: Promise.resolve({ path: ["admin", "metrics"] }),
  });
  assert.equal(unknown.status, 404);
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "GET");
});

test("AI eligibility BFF forwards auth and App Check only on its exact route", async (t) => {
  const originalFetch = globalThis.fetch;
  let forwardedUrl = "";
  let forwardedInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    forwardedUrl = String(input);
    forwardedInit = init;
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

  const request = new NextRequest(
    "http://localhost/api/ai/tryon/eligibility",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer header.payload.signature",
        "x-firebase-appcheck": "app-check-token",
      },
      body: JSON.stringify({ productId: "prod_1" }),
    },
  );
  const response = await POST(request, {
    params: Promise.resolve({ path: ["tryon", "eligibility"] }),
  });

  const forwardedHeaders = new Headers(forwardedInit?.headers);
  assert.equal(response.status, 200);
  assert.match(forwardedUrl, /\/api\/ai\/tryon\/eligibility$/);
  assert.equal(
    forwardedHeaders.get("authorization"),
    "Bearer header.payload.signature",
  );
  assert.equal(
    forwardedHeaders.get("x-firebase-appcheck"),
    "app-check-token",
  );
});
