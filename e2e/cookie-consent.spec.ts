/**
 * E2E: consentimiento de cookies
 *
 * Ejecutar:
 *   npx playwright test e2e/cookie-consent.spec.ts
 */

import { test, expect } from "@playwright/test";
import {
  CONSENT_COOKIE_NAME,
  COOKIE_POLICY_VERSION,
} from "../src/lib/cookies/constants";

const CONSENT_COOKIE = CONSENT_COOKIE_NAME;

test.describe("Consentimiento de cookies", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("primera visita muestra banner y no establece consentimiento", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("cookie-banner")).toBeVisible({
      timeout: 15_000,
    });

    const cookies = await page.context().cookies();
    const consentCookie = cookies.find((c) => c.name === CONSENT_COOKIE);
    expect(consentCookie).toBeUndefined();
  });

  test("aceptar todas oculta banner y guarda consentimiento", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("cookie-banner")).toBeVisible();

    await page.getByTestId("cookie-accept-all").click();
    await expect(page.getByTestId("cookie-banner")).toBeHidden();

    const cookies = await page.context().cookies();
    const consentCookie = cookies.find((c) => c.name === CONSENT_COOKIE);
    expect(consentCookie).toBeDefined();

    const decoded = decodeURIComponent(consentCookie!.value);
    const parsed = JSON.parse(decoded);
    expect(parsed.version).toBe(COOKIE_POLICY_VERSION);
    expect(parsed.categories.necessary).toBe(true);
    expect(parsed.categories.analytics).toBe(true);
    expect(parsed.categories.marketing).toBe(true);
  });

  test("rechazar no esenciales guarda solo categorías necesarias", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("cookie-reject").click();
    await expect(page.getByTestId("cookie-banner")).toBeHidden();

    const cookies = await page.context().cookies();
    const consentCookie = cookies.find((c) => c.name === CONSENT_COOKIE);
    expect(consentCookie).toBeDefined();

    const parsed = JSON.parse(decodeURIComponent(consentCookie!.value));
    expect(parsed.categories.necessary).toBe(true);
    expect(parsed.categories.analytics).toBe(false);
    expect(parsed.categories.marketing).toBe(false);
    expect(parsed.categories.preferences).toBe(false);
  });

  test("configuración parcial desde panel", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cookie-configure").click();
    await expect(page.getByTestId("cookie-settings-dialog")).toBeVisible();

    await page.getByTestId("cookie-toggle-analytics").click();
    await page.getByTestId("cookie-save-preferences").click();

    await expect(page.getByTestId("cookie-banner")).toBeHidden();

    const cookies = await page.context().cookies();
    const parsed = JSON.parse(
      decodeURIComponent(
        cookies.find((c) => c.name === CONSENT_COOKIE)!.value,
      ),
    );
    expect(parsed.categories.analytics).toBe(true);
    expect(parsed.categories.marketing).toBe(false);
  });

  test("no muestra banner tras selección válida en recarga", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("cookie-accept-all").click();
    await page.reload();
    await expect(page.getByTestId("cookie-banner")).toBeHidden();
  });

  test("footer abre panel de configuración", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cookie-accept-all").click();

    await page.getByTestId("cookie-settings-footer-link").click();
    await expect(page.getByTestId("cookie-settings-dialog")).toBeVisible();
  });

  test("navegación sin clic no implica aceptación", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("cookie-banner")).toBeVisible();

    await page.goto("/products");
    await expect(page.getByTestId("cookie-banner")).toBeVisible();

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === CONSENT_COOKIE)).toBeUndefined();
  });

  test("política de cookies es accesible", async ({ page }) => {
    await page.goto("/politica-cookies");
    await expect(
      page.getByRole("heading", { name: /política de cookies/i }),
    ).toBeVisible();
    await expect(page.locator("code").filter({ hasText: CONSENT_COOKIE_NAME }).first()).toBeVisible();
  });

  test("sin consentimiento no carga scripts GA/GTM", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("cookie-banner")).toBeVisible();

    const gaScript = page.locator("#tiendafront-ga4, #tiendafront-gtm");
    await expect(gaScript).toHaveCount(0);
  });

  test("incógnito: banner visible en primera visita", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByTestId("cookie-banner")).toBeVisible();
    await context.close();
  });
});
