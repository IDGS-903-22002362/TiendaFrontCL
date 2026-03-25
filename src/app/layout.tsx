import type { Metadata } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { StorefrontProvider } from "@/hooks/use-storefront";
import { StorefrontShell } from "@/components/layout/storefront-shell";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body-family",
});

const headlineFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-headline-family",
});

export const metadata: Metadata = {
  title: {
    default: "La Guarida | Tienda Oficial Club León",
    template: "%s | La Guarida",
  },
  description: "Tienda oficial del Club León con experiencia premium deportiva.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${bodyFont.variable} ${headlineFont.variable} font-body antialiased`}>
        <AuthProvider>
          <StorefrontProvider>
            <CartProvider>
              <StorefrontShell>{children}</StorefrontShell>
              <Toaster />
            </CartProvider>
          </StorefrontProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
