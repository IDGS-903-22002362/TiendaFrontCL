import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCartMergeMarker,
  hasCompletedCartMerge,
  shouldSkipCartMerge,
} from "./cart-merge";

describe("shouldSkipCartMerge", () => {
  it("returns true when guest cart has no items", () => {
    assert.equal(shouldSkipCartMerge([]), true);
  });

  it("returns false when guest cart has items", () => {
    assert.equal(
      shouldSkipCartMerge([
        {
          id: "product-1",
          name: "Jersey",
          price: 100,
          quantity: 1,
          image: "/images/jersey.png",
        },
      ]),
      false,
    );
  });
});

describe("hasCompletedCartMerge", () => {
  it("matches marker for the same session and user", () => {
    const sessionId = "session-a";
    const userId = "user-1";
    const marker = getCartMergeMarker(sessionId, userId);

    assert.equal(hasCompletedCartMerge(sessionId, userId, marker), true);
  });

  it("does not match when session or user differ", () => {
    const marker = getCartMergeMarker("session-a", "user-1");

    assert.equal(hasCompletedCartMerge("session-b", "user-1", marker), false);
    assert.equal(hasCompletedCartMerge("session-a", "user-2", marker), false);
  });

  it("returns false when marker is missing", () => {
    assert.equal(hasCompletedCartMerge("session-a", "user-1", null), false);
  });
});
