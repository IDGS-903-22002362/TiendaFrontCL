import { chromium } from "playwright";

const results = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  const text = msg.text();
  if (/appcheck|recaptcha/i.test(text)) {
    results.push(`[console:${msg.type()}] ${text.slice(0, 300)}`);
  }
});

page.on("response", async (response) => {
  const url = response.url();
  if (/firebaseappcheck\.googleapis\.com/i.test(url)) {
    let body = "";
    try {
      body = await response.text();
    } catch {}
    results.push(`[appcheck] ${response.status()} ${url.slice(0, 160)}\n${body.slice(0, 500)}`);
  } else if (/recaptcha/i.test(url)) {
    results.push(`[network] ${response.status()} ${url.slice(0, 160)}`);
  }
});

const baseUrl = process.argv[2] || "https://tiendalaguarida.com";
await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });

const productHref = await page
  .locator('a[href*="/products/"]')
  .first()
  .getAttribute("href", { timeout: 15000 })
  .catch(() => null);

if (productHref) {
  const productUrl = new URL(productHref, baseUrl).toString();
  results.push(`[nav] ${productUrl}`);
  await page.goto(productUrl, { waitUntil: "networkidle", timeout: 60000 });
}

await page.waitForTimeout(10000);

console.log(results.length ? results.join("\n") : "Sin actividad App Check/reCAPTCHA detectada");
await browser.close();
