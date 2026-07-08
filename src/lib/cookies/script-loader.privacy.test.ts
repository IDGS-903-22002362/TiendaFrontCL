import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rejectNonEssentialConsent } from "../cookies/consent-model";
import { loadConsentedScripts } from "../cookies/script-loader";

describe("loadConsentedScripts privacy guard", () => {
  it("does not mark scripts loaded when tracking is disabled", () => {
    const record = rejectNonEssentialConsent();

    loadConsentedScripts(record, { trackingDisabled: true });

    assert.equal(
      typeof window !== "undefined"
        ? window.__tiendafront_consent_scripts_loaded
        : undefined,
      undefined,
    );
  });
});
