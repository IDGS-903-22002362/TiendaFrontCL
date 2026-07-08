import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveClientPrivacyContext,
  shouldStripAppPrivacyQueryParams,
  stripAppPrivacyQueryParams,
} from "./resolve-client-privacy-context";
import { CL_APP_CONTEXT_COOKIE } from "./constants";

describe("resolveClientPrivacyContext", () => {
  it("ios_app with tracking=disabled enables trackingDisabled", () => {
    const context = resolveClientPrivacyContext({
      appSourceParam: "ios_app",
      trackingParam: "disabled",
    });

    assert.equal(context.origin, "ios_app");
    assert.equal(context.isEmbeddedApp, true);
    assert.equal(context.trackingDisabled, true);
  });

  it("android_app enables trackingDisabled", () => {
    const context = resolveClientPrivacyContext({
      appSourceParam: "android_app",
      trackingParam: "disabled",
    });

    assert.equal(context.origin, "android_app");
    assert.equal(context.trackingDisabled, true);
  });

  it("web keeps normal browser behavior", () => {
    const context = resolveClientPrivacyContext({
      cookieValue: "web",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });

    assert.equal(context.origin, "web");
    assert.equal(context.trackingDisabled, false);
  });

  it("cl_app_context cookie persists embedded app mode", () => {
    const context = resolveClientPrivacyContext({
      cookieValue: "ios_app",
    });

    assert.equal(context.origin, "ios_app");
    assert.equal(context.trackingDisabled, true);
  });

  it("ClubLeonMobile user agent is used as fallback", () => {
    const context = resolveClientPrivacyContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ClubLeonMobile/1.0 iOS",
    });

    assert.equal(context.origin, "ios_app");
    assert.equal(context.trackingDisabled, true);
  });

  it("legacy from=mobile-app maps using user agent", () => {
    const context = resolveClientPrivacyContext({
      fromParam: "mobile-app",
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 ClubLeonMobile/1.0 Android",
    });

    assert.equal(context.origin, "android_app");
    assert.equal(context.trackingDisabled, true);
  });
});

describe("app privacy query params", () => {
  it("strips internal params while preserving business query params", () => {
    const url = new URL(
      "https://tiendalaguarida.com/products?tag=sale&app_source=ios_app&tracking=disabled",
    );

    assert.equal(shouldStripAppPrivacyQueryParams(url.searchParams), true);

    const cleaned = stripAppPrivacyQueryParams(url);
    assert.equal(cleaned.search, "?tag=sale");
  });

  it("uses cl_app_context cookie name constant", () => {
    assert.equal(CL_APP_CONTEXT_COOKIE, "cl_app_context");
  });
});
