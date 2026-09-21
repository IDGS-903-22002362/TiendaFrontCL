import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentComposition } from "../types";
import {
  getFieraPointsEarnNote,
  getFieraPointsRedemptionDetail,
  getOrderCashPaidAmount,
  getOrderDisplayTotal,
  getOrderPaymentMethodLabel,
  hasFieraPointsRedemption,
} from "./fiera-points";

const hybrid: PaymentComposition = {
  mode: "EXACT",
  grossTotalMinor: 3900,
  providerAmountMinor: 2490,
  pointsRequested: 141,
  pointsUsed: 141,
  pointValueMinor: 10,
  pointsDiscountMinor: 1410,
  minimumRedemptionPoints: 100,
  redemptionStatus: "CONFIRMED",
};

const fullPoints: PaymentComposition = {
  ...hybrid,
  mode: "MAX",
  providerAmountMinor: 0,
  pointsRequested: 390,
  pointsUsed: 390,
  pointsDiscountMinor: 3900,
};

test("detects a FieraPuntos redemption", () => {
  assert.equal(hasFieraPointsRedemption({ paymentComposition: hybrid }), true);
  assert.equal(hasFieraPointsRedemption({ paymentComposition: undefined }), false);
});

test("cash paid is the provider remainder, not the merchandise total", () => {
  assert.equal(getOrderCashPaidAmount({ total: 24.9, paymentComposition: hybrid }), 24.9);
  assert.equal(getOrderCashPaidAmount({ total: 0, paymentComposition: fullPoints }), 0);
  assert.equal(getOrderCashPaidAmount({ total: 39 }), 39);
});

test("display total keeps the merchandise amount when points covered the order", () => {
  assert.equal(
    getOrderDisplayTotal({ total: 0, grossTotal: 39, paymentComposition: fullPoints }),
    39,
  );
});

test("payment method labels describe hybrid and full-points checkouts", () => {
  assert.equal(
    getOrderPaymentMethodLabel({ total: 24.9, paymentComposition: hybrid }),
    "Tarjeta + FieraPuntos",
  );
  assert.equal(
    getOrderPaymentMethodLabel({ total: 0, paymentComposition: fullPoints }),
    "FieraPuntos (cubrió el total)",
  );
  assert.match(
    getFieraPointsRedemptionDetail({ paymentComposition: fullPoints }) ?? "",
    /Cubrió el total/,
  );
});

test("earn note explains that only cash generates new points", () => {
  assert.match(
    getFieraPointsEarnNote({ total: 0, paymentComposition: fullPoints }) ?? "",
    /no genera FieraPuntos adicionales/,
  );
  assert.match(
    getFieraPointsEarnNote({ total: 24.9, paymentComposition: hybrid }) ?? "",
    /\$24\.90/,
  );
  assert.equal(getFieraPointsEarnNote({ total: 39 }), null);
});
