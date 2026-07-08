import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  notifyMobileAppAuth,
  notifyMobileAppLogout,
  resetMobileAppAuthNotification,
} from "./mobile-app-bridge";

type TestWindow = {
  ClubLeonBridge?: {
    messages: string[];
    postMessage(message: string): void;
  };
};

function installBridgeWindow() {
  const testWindow: TestWindow = {
    ClubLeonBridge: {
      messages: [],
      postMessage(message: string) {
        this.messages.push(message);
      },
    },
  };

  (globalThis as unknown as { window?: TestWindow }).window = testWindow;
  return testWindow;
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CL_ENABLE_MOBILE_AUTH_BRIDGE;
  delete (globalThis as unknown as { window?: TestWindow }).window;
  resetMobileAppAuthNotification();
});

describe("mobile app auth bridge", () => {
  it("does not notify the mobile app unless explicitly enabled", () => {
    const testWindow = installBridgeWindow();

    const notified = notifyMobileAppAuth({
      token: "backend-token",
      uid: "uid-123",
    });
    const loggedOut = notifyMobileAppLogout();

    assert.equal(notified, false);
    assert.equal(loggedOut, false);
    assert.deepEqual(testWindow.ClubLeonBridge?.messages, []);
  });

  it("notifies the mobile app when the legacy bridge is enabled", () => {
    process.env.NEXT_PUBLIC_CL_ENABLE_MOBILE_AUTH_BRIDGE = "true";
    const testWindow = installBridgeWindow();

    const notified = notifyMobileAppAuth({
      token: "backend-token",
      uid: "uid-123",
    });

    assert.equal(notified, true);
    assert.equal(testWindow.ClubLeonBridge?.messages.length, 1);
    assert.match(
      testWindow.ClubLeonBridge?.messages[0] ?? "",
      /CLUBLEON_AUTH_SUCCESS/,
    );
  });
});
