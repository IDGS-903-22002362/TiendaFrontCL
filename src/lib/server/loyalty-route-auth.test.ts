import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/loyalty/[[...path]]/route";

test("loyalty BFF forwards the session JWT to the internal QR endpoint", async (t) => {
  const originalFetch = globalThis.fetch;
  let forwardedUrl = "";
  let forwardedAuthorization = "";
  globalThis.fetch = async (input, init) => {
    forwardedUrl = String(input);
    forwardedAuthorization = new Headers(init?.headers).get("authorization") ?? "";
    return Response.json({
      member: { memberId: "client_1", fullName: "Cliente", currentPoints: 10 },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const request = new NextRequest(
    "http://localhost:9002/api/loyalty/staff/qr-members/client_1",
    { headers: { cookie: "tiendafront_api_token=header.payload.signature" } },
  );
  const response = await GET(request, {
    params: Promise.resolve({ path: ["staff", "qr-members", "client_1"] }),
  });

  assert.equal(response.status, 200);
  assert.match(forwardedUrl, /\/api\/loyalty\/internal\/v1\/staff\/qr-members\/client_1$/);
  assert.equal(forwardedAuthorization, "Bearer header.payload.signature");
});
