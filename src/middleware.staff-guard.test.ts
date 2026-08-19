import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function request(path: string, role: string, roles?: string[]) {
  return new NextRequest(`https://tiendalaguarida.com${path}`, {
    headers: {
      cookie: [
        "tiendafront_api_token=session-token",
        `tiendafront_user_role=${role}`,
        `tiendafront_user_data=${encodeURIComponent(JSON.stringify({ perfilCompleto: true, roles }))}`,
      ].join("; "),
    },
  });
}

test("middleware redirects an internal account away from the public store", () => {
  const response = middleware(request("/products", "ADMIN"));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")!).pathname, "/staff");
});

test("middleware blocks a CLIENTE cookie carrying an additional internal role", () => {
  const response = middleware(request("/checkout", "CLIENTE", ["CLIENTE", "TRABAJADOR_CLUBLEON"]));
  assert.equal(new URL(response.headers.get("location")!).pathname, "/staff");
});

test("middleware keeps CLIENTE on the public store and allows staff workspace", () => {
  assert.equal(middleware(request("/products", "CLIENTE")).headers.get("x-middleware-next"), "1");
  assert.equal(middleware(request("/admin", "ADMIN")).headers.get("x-middleware-next"), "1");
});

test("middleware allows EMPLEADO into POS and redirects unsupported admin areas to POS", () => {
  assert.equal(
    middleware(request("/admin/pos", "EMPLEADO")).headers.get("x-middleware-next"),
    "1",
  );
  assert.equal(
    middleware(request("/admin/cortes", "EMPLEADO")).headers.get("x-middleware-next"),
    "1",
  );
  const response = middleware(request("/admin/productos", "EMPLEADO"));
  assert.equal(new URL(response.headers.get("location")!).pathname, "/admin/pos");
});
