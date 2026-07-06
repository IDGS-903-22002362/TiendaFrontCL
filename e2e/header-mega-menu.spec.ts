import { expect, test } from "@playwright/test";

test.describe("Header mega menu", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function dismissCookies(page: import("@playwright/test").Page) {
    const accept = page.getByRole("button", { name: "Aceptar todas" });
    if (await accept.isVisible().catch(() => false)) {
      await accept.click();
    }
  }

  test("permanece oculto al cargar y abre con hover intencional", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissCookies(page);

    const megaPanel = page.locator("#storefront-mega-menu-panel");
    await expect(megaPanel).toHaveCSS("opacity", "0");

    const trigger = page.getByRole("button", { name: "Todos los productos" });
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();

    if (triggerBox) {
      await page.mouse.move(
        triggerBox.x + triggerBox.width / 2,
        triggerBox.y + triggerBox.height / 2,
      );
      await page.waitForTimeout(320);
    }

    await expect(megaPanel).toHaveCSS("opacity", "1");
    await expect(
      megaPanel.getByRole("link", { name: "Ver todo" }).first(),
    ).toBeVisible();
  });

  test("cierra con Escape", async ({ page }) => {
    await page.goto("/");
    await dismissCookies(page);

    const trigger = page.getByRole("button", { name: "Ofertas" });
    const triggerBox = await trigger.boundingBox();

    if (triggerBox) {
      await page.mouse.move(
        triggerBox.x + triggerBox.width / 2,
        triggerBox.y + triggerBox.height / 2,
      );
      await page.waitForTimeout(320);
    }

    await page.keyboard.press("Escape");
    await expect(page.locator("#storefront-mega-menu-panel")).toHaveCSS(
      "opacity",
      "0",
    );
  });
});