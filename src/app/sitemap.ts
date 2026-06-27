import type { MetadataRoute } from "next";
import { fetchProducts } from "@/lib/api/storefront";

function getSiteUrl() {
  const configured = process.env.STORE_PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "https://tiendalaguarida.com";
}

const STATIC_ROUTES = [
  "",
  "/products",
  "/login",
  "/register",
  "/TerminosCondiciones",
  "/aviso-de-privacidad",
  "/politica-cookies",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  let productEntries: MetadataRoute.Sitemap = [];

  try {
    const products = await fetchProducts();
    productEntries = products
      .filter((product) => product.activo !== false && Boolean(product.id))
      .map((product) => ({
        url: `${siteUrl}/products/${product.id}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch {
    productEntries = [];
  }

  return [...staticEntries, ...productEntries];
}
