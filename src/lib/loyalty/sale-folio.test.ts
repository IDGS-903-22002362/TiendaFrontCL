import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStaffSaleIdempotencyKey,
  buildStaffSaleRequest,
  getSaleFolioError,
  normalizeSaleFolio,
} from "./sale-folio";

test("normaliza folios y conserva un identificador estable", () => {
  assert.equal(normalizeSaleFolio("  ticket   10-a "), "TICKET 10-A");
  assert.equal(
    buildStaffSaleIdempotencyKey("client-a", " ticket-1 "),
    "staff-sale:client-a:TICKET-1",
  );
});

test("la idempotencia queda separada entre clientes", () => {
  assert.notEqual(
    buildStaffSaleIdempotencyKey("client-a", "TICKET-1"),
    buildStaffSaleIdempotencyKey("client-b", "TICKET-1"),
  );
});

test("construye el payload con folio pero sin reintroducir el UID en el body", () => {
  const request = buildStaffSaleRequest({
    memberId: "client-a",
    saleFolio: " ticket-1 ",
    amountCents: 12345,
  });

  assert.deepEqual(request.body, {
    dinero: 123.45,
    folioVenta: "TICKET-1",
    descripcion: "Venta TICKET-1",
  });
  assert.equal(request.idempotencyKey, "staff-sale:client-a:TICKET-1");
  assert.equal("memberId" in request.body, false);
});

test("rechaza folio vacio, caracteres invalidos y el UID del cliente", () => {
  assert.match(getSaleFolioError("", "client-a") ?? "", /obligatorio/);
  assert.match(getSaleFolioError("ticket@1", "client-a") ?? "", /solo letras/);
  assert.match(getSaleFolioError("CLIENT-A", "client-a") ?? "", /distinto/);
  assert.equal(getSaleFolioError("ticket-1", "client-a"), null);
});
