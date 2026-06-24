"use client";

import Link from "next/link";
import { Cookie, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieBanner() {
  const { showBanner, acceptAll, rejectNonEssential, openSettings } =
    useCookieConsent();

  if (!showBanner) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      aria-modal="false"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-[#111715]/95 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md md:p-6"
      data-testid="cookie-banner"
    >
      <div className="container flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-3xl gap-3">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d0ad63]/30 bg-[#d0ad63]/10 text-[#d0ad63]"
            aria-hidden="true"
          >
            <Cookie className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="cookie-banner-title"
              className="font-headline text-sm font-semibold uppercase tracking-[0.12em] text-white"
            >
              Tu privacidad importa
            </h2>
            <p
              id="cookie-banner-description"
              className="mt-2 text-sm leading-6 text-white/72"
            >
              Usamos cookies necesarias para sesión, carrito, checkout y pagos.
              Con tu permiso también usamos cookies de preferencias, analítica y
              marketing. Puedes cambiar tu elección en cualquier momento.{" "}
              <Link
                href="/politica-cookies"
                className="underline decoration-[#d0ad63]/60 underline-offset-2 hover:text-white"
              >
                Política de cookies
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={rejectNonEssential}
            data-testid="cookie-reject"
          >
            Rechazar no esenciales
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={openSettings}
            data-testid="cookie-configure"
          >
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Configurar
          </Button>
          <Button
            type="button"
            className="bg-[#d0ad63] text-[#111715] hover:bg-[#e0bd73]"
            onClick={acceptAll}
            data-testid="cookie-accept-all"
          >
            Aceptar todas
          </Button>
        </div>
      </div>
    </div>
  );
}
