import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { StorefrontProvider } from "@/hooks/use-storefront";
import { StorefrontShell } from "@/components/layout/storefront-shell";
import { CartAddedNotificationHost } from "@/components/cart/cart-added-notification-host";
import { CookieConsentProvider } from "@/hooks/use-cookie-consent";
import { CookieConsentHost } from "@/components/cookies/cookie-consent-host";
import { Suspense } from "react";
import { CookieSettingsOpener } from "@/components/cookies/cookie-settings-opener";

const bodyFont = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-body-family",
});

const headlineFont = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-headline-family",
});

export const metadata: Metadata = {
  title: {
    default: "La Guarida | Tienda Oficial Club León",
    template: "%s | La Guarida",
  },
  description: "Tienda oficial del Club León con experiencia premium deportiva.",
  icons: {
    icon: [{ url: "/images/leon.ico", type: "image/x-icon" }],
    shortcut: "/images/leon.ico",
    apple: "/images/leon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${bodyFont.variable} ${headlineFont.variable} font-body antialiased`}>
        <CookieConsentProvider>
          <AuthProvider>
            <StorefrontProvider>
              <CartProvider>
                <StorefrontShell>{children}</StorefrontShell>
                <CartAddedNotificationHost />
                <CookieConsentHost />
                <Suspense fallback={null}>
                  <CookieSettingsOpener />
                </Suspense>
                <Toaster />
              </CartProvider>
            </StorefrontProvider>
          </AuthProvider>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
