import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  notifyMobileAppAuth,
  notifyMobileAppLogout,
  resetMobileAppAuthNotification,
} from "./mobile-app-bridge";

type TestWindow = {
  navigator: {
    userAgent: string;
  };
  ClubLeonBridge?: {
    messages: string[];
    postMessage(message: string): void;
  };
};

type TestDocument = {
  cookie: string;
};

function installBridgeWindow({ embedded = false } = {}) {
  const testWindow: TestWindow = {
    navigator: {
      userAgent: embedded ? "ClubLeonMobile/1.0 Android" : "Mozilla/5.0",
    },
    ClubLeonBridge: {
      messages: [],
      postMessage(message: string) {
        this.messages.push(message);
      },
    },
  };

  (globalThis as unknown as { window?: TestWindow }).window = testWindow;
  (globalThis as unknown as { document?: TestDocument }).document = {
    cookie: "",
  };
  return testWindow;
}

afterEach(() => {
  delete (globalThis as unknown as { window?: TestWindow }).window;
  delete (globalThis as unknown as { document?: TestDocument }).document;
  resetMobileAppAuthNotification();
});

describe("mobile app auth bridge", () => {
  it("does not notify outside the embedded mobile app", () => {
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

  it("notifies auth inside the embedded mobile app when the native bridge exists", () => {
    const testWindow = installBridgeWindow({ embedded: true });

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

  it("notifies logout inside the embedded mobile app when the native bridge exists", () => {
    const testWindow = installBridgeWindow({ embedded: true });

    const loggedOut = notifyMobileAppLogout();

    assert.equal(loggedOut, true);
    assert.equal(testWindow.ClubLeonBridge?.messages.length, 1);
    assert.match(
      testWindow.ClubLeonBridge?.messages[0] ?? "",
      /CLUBLEON_LOGOUT/,
    );
  });
});
