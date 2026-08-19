import assert from "node:assert/strict";
import test from "node:test";
import {
  completePosIntent,
  createPosIdempotencyKey,
  formatPosMoney,
  getOrCreatePosIntentKey,
  isPosPaymentTerminal,
  pesosToMinor,
} from "./client";
import {
  describeCashDifference,
  mapCutOperationalLabel,
  mapCutReconciliationLabel,
} from "./types";

test("pesosToMinor only accepts non-negative amounts with at most two decimals", () => {
  assert.equal(pesosToMinor("1299.99"), 129999);
  assert.equal(pesosToMinor("99,5"), 9950);
  assert.equal(pesosToMinor("0"), 0);
  assert.equal(pesosToMinor("10.999"), null);
  assert.equal(pesosToMinor("-1"), null);
  assert.equal(pesosToMinor("un peso"), null);
});

test("formatPosMoney converts integer minor units exactly once", () => {
  assert.match(formatPosMoney(129999), /\$1,299\.99/);
});

test("describeCashDifference uses explicit shortage/overage text", () => {
  assert.equal(describeCashDifference(0), "Cuadrado");
  assert.match(describeCashDifference(-18_000), /Faltante/);
  assert.match(describeCashDifference(25_000), /Sobrante/);
});

test("cut status labels map operational and reconciliation views", () => {
  assert.equal(mapCutOperationalLabel("COUNTING"), "En conteo");
  assert.equal(mapCutOperationalLabel("APPROVED"), "Cerrado");
  assert.equal(
    mapCutReconciliationLabel("APPROVED", "SHORTAGE", -18000),
    "Faltante aceptado",
  );
  assert.equal(mapCutReconciliationLabel("COUNTING", null, null), "Pendiente");
});

test("idempotency keys are operation-scoped and unique", () => {
  const first = createPosIdempotencyKey("payment-cash");
  const second = createPosIdempotencyKey("payment-cash");
  assert.match(first, /^pos-web:payment-cash:/);
  assert.notEqual(first, second);
});

test("an intent reuses its key until its terminal result is completed", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };

  const first = getOrCreatePosIntentKey("payment-card", "sale-1", storage);
  const retry = getOrCreatePosIntentKey("payment-card", "sale-1", storage);
  assert.equal(retry, first);

  completePosIntent("payment-card", "sale-1", storage);
  const nextIntent = getOrCreatePosIntentKey(
    "payment-card",
    "sale-1",
    storage,
  );
  assert.notEqual(nextIntent, first);
});

test("intent keys are isolated by operation and resource", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };

  assert.notEqual(
    getOrCreatePosIntentKey("payment-cash", "sale-1", storage),
    getOrCreatePosIntentKey("payment-cash", "sale-2", storage),
  );
  assert.notEqual(
    getOrCreatePosIntentKey("count-start", "shift-1", storage),
    getOrCreatePosIntentKey("count-submit", "shift-1", storage),
  );
});

test("payment intents remain active while the backend reports PAYMENT_PENDING", () => {
  assert.equal(isPosPaymentTerminal({ status: "PAYMENT_PENDING" }), false);
  assert.equal(isPosPaymentTerminal({ status: "PAID" }), true);
});
