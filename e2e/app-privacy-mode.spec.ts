/**
 * E2E: modo privacidad WebView móvil
 *
 * Ejecutar:
 *   npx playwright test e2e/app-privacy-mode.spec.ts
 */

import { test, expect } from "@playwright/test";
import { CL_APP_CONTEXT_COOKIE } from "../src/lib/privacy/constants";
import {
  CONSENT_COOKIE_NAME,
} from "../src/lib/cookies/constants";

test.describe("Modo privacidad app embebida", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("ios_app activa cookie de contexto y limpia params internos", async ({
    page,
  }) => {
    const response = await page.goto(
      "/?app_source=ios_app&tracking=disabled",
      { waitUntil: "commit" },
    );

    expect(page.url()).not.toContain("app_source=");
    expect(page.url()).not.toContain("tracking=");

    const cookies = await page.context().cookies();
    const appContext = cookies.find((cookie) => cookie.name === CL_APP_CONTEXT_COOKIE);
    expect(appContext?.value).toBe("ios_app");

    if (response) {
      expect(response.status()).toBeLessThan(400);
    }
  });

  test("no carga scripts de marketing en modo app", async ({ page }) => {
    const blockedRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (
        url.includes("googletagmanager.com") ||
        url.includes("connect.facebook.net") ||
        url.includes("clarity.ms") ||
        url.includes("hotjar.com")
      ) {
        blockedRequests.push(url);
      }
    });

    await page.goto("/?app_source=android_app&tracking=disabled");
    await page.waitForLoadState("networkidle");

    expect(blockedRequests).toEqual([]);
  });

  test("muestra aviso informativo y no banner de consentimiento marketing", async ({
    page,
  }) => {
    await page.goto("/?app_source=ios_app&tracking=disabled");

    await expect(page.getByTestId("app-privacy-notice")).toBeAttached({
      timeout: 15_000,
    });
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);
  });

  test("navegador web normal sigue mostrando banner de cookies", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("cookie-banner")).toBeVisible({
      timeout: 15_000,
    });

    const cookies = await page.context().cookies();
    const consentCookie = cookies.find(
      (cookie) => cookie.name === CONSENT_COOKIE_NAME,
    );
    expect(consentCookie).toBeUndefined();
  });
});
