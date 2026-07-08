import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLE_REVIEW_TEST_EMAIL,
  isAppleReviewTestEmail,
} from "./apple-review-credentials";

describe("isAppleReviewTestEmail", () => {
  it("matches the Apple review email case-insensitively", () => {
    assert.equal(isAppleReviewTestEmail(APPLE_REVIEW_TEST_EMAIL), true);
    assert.equal(isAppleReviewTestEmail("Cliente@Gmail.com"), true);
    assert.equal(isAppleReviewTestEmail("  cliente@gmail.com  "), true);
  });

  it("rejects other emails", () => {
    assert.equal(isAppleReviewTestEmail("otro@gmail.com"), false);
    assert.equal(isAppleReviewTestEmail("cliente@gmail.com.mx"), false);
    assert.equal(isAppleReviewTestEmail(""), false);
  });
});
