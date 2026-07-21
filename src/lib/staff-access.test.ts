import assert from "node:assert/strict";
import test from "node:test";
import { isInternalAccount, isInternalRole, isStaffAreaPath } from "./staff-access";

test("all internal roles are separated from CLIENTE", () => {
  assert.equal(isInternalRole("CLIENTE"), false);
  for (const role of ["ADMIN", "EMPLEADO", "EMPLEADO_CLUB", "TRABAJADOR_CLUBLEON", "CONCESION_ADMIN"] as const) {
    assert.equal(isInternalRole(role), true);
  }
});

test("a CLIENTE with an additional worker role is still an internal account", () => {
  assert.equal(isInternalAccount("CLIENTE", ["CLIENTE", "TRABAJADOR_CLUBLEON"]), true);
  assert.equal(isInternalAccount("CLIENTE", ["CLIENTE"]), false);
});

test("staff landing and operational sections are not public storefront paths", () => {
  assert.equal(isStaffAreaPath("/staff"), true);
  assert.equal(isStaffAreaPath("/admin/ordenes"), true);
  assert.equal(isStaffAreaPath("/products"), false);
  assert.equal(isStaffAreaPath("/checkout"), false);
});
