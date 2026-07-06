import type { MetadataRoute } from "next";

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

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/empleado", "/super-admin", "/api", "/checkout"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}