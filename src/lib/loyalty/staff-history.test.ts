import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStaffHistorySearchParams,
  formatHistoryAmount,
  getHistoryCustomerLabel,
  getHistorySaleLabel,
} from "./staff-history";

const row = {
  transactionId: "tx-1",
  memberId: "uid-1",
  customerFullName: "Ana León",
  customerExists: true,
  saleId: "TICKET-10",
  amountMxn: 150,
  points: 15,
  createdAt: "2026-07-20T12:00:00.000Z",
};

test("prioriza el nombre real y conserva UID como dato secundario", () => {
  assert.deepEqual(getHistoryCustomerLabel(row), {
    primary: "Ana León",
    secondary: "ID: uid-1",
  });
});

test("usa Cliente UID solo como fallback secundario de perfil eliminado", () => {
  assert.deepEqual(
    getHistoryCustomerLabel({ ...row, customerFullName: null, customerExists: false }),
    { primary: "Perfil no disponible", secondary: "Cliente uid-1" },
  );
});

test("no inventa folios ni montos legacy", () => {
  assert.equal(getHistorySaleLabel({ ...row, saleId: null }), "Folio no disponible");
  assert.equal(formatHistoryAmount(null), "Monto no disponible");
  assert.match(formatHistoryAmount(150), /150/);
});

test("construye query backend con búsqueda y cursor, no filtrado local", () => {
  const query = buildStaffHistorySearchParams({
    limit: 20,
    cursor: "tx-cursor",
    search: "  Ana  ",
    actorId: "employee-1",
  });
  assert.equal(
    query.toString(),
    "limit=20&cursor=tx-cursor&search=Ana&empleadoId=employee-1",
  );
});
