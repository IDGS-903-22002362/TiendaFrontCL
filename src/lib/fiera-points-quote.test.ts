import assert from "node:assert/strict";
import test from "node:test";
import type { FieraPointsQuote } from "./types";
import {
  canSelectFieraPoints,
  getCheckoutPayableTotal,
  getFieraPointsQuoteMessage,
} from "./fiera-points-quote";

const hybridQuote: FieraPointsQuote = {
  canRedeem: true,
  reason: "OK",
  availablePoints: 500,
  pointValueMinor: 100,
  minimumRedemptionPoints: 100,
  grossTotal: 399,
  providerAmount: 249,
  paymentComposition: {
    mode: "EXACT",
    grossTotalMinor: 39900,
    providerAmountMinor: 24900,
    pointsRequested: 150,
    pointsUsed: 150,
    pointValueMinor: 100,
    pointsDiscountMinor: 15000,
    minimumRedemptionPoints: 100,
    redemptionStatus: "NOT_REQUESTED",
  },
};

test("payable total stays gross when points are not used", () => {
  assert.equal(
    getCheckoutPayableTotal(399, hybridQuote, { mode: "NONE" }),
    399,
  );
});

test("payable total uses the quoted cash remainder for a valid redemption", () => {
  assert.equal(
    getCheckoutPayableTotal(399, hybridQuote, { mode: "EXACT", points: 150 }),
    249,
  );
});

test("payable total stays gross when the quote cannot redeem", () => {
  assert.equal(
    getCheckoutPayableTotal(
      399,
      { ...hybridQuote, canRedeem: false, reason: "MIN_NOT_MET" },
      { mode: "EXACT", points: 50 },
    ),
    399,
  );
});

test("MAX and EXACT stay disabled below the minimum balance", () => {
  assert.equal(
    canSelectFieraPoints(
      { ...hybridQuote, canRedeem: false, reason: "MIN_NOT_MET" },
      40,
    ),
    false,
  );
  assert.equal(canSelectFieraPoints(hybridQuote, 500), true);
});

test("quote messages stay user-safe", () => {
  assert.match(
    getFieraPointsQuoteMessage({
      ...hybridQuote,
      canRedeem: false,
      reason: "MIN_NOT_MET",
    }) ?? "",
    /canje mínimo/i,
  );
  assert.equal(getFieraPointsQuoteMessage(hybridQuote), null);
});
