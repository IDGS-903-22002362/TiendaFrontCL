import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from "./checkout-draft";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

test("checkout draft preserves the selected FieraPoints composition request", () => {
  const sessionStorage = memoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage },
  });

  saveCheckoutDraft({
    paymentSignature: "cart=1||fieraMode=EXACT||fieraPoints=150",
    fulfillmentMethod: "DELIVERY",
    checkoutValues: { fulfillmentMethod: "DELIVERY" },
    selectedPickupLocationId: "",
    pickupContact: { name: "" },
    fieraPoints: { mode: "EXACT", points: 150 },
  });

  assert.deepEqual(loadCheckoutDraft()?.fieraPoints, {
    mode: "EXACT",
    points: 150,
  });
  clearCheckoutDraft();
  assert.equal(loadCheckoutDraft(), null);
});
