"use client";

import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieSettingsFooterLink() {
  const { openSettings } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className="text-left text-sm text-white/76 transition-colors hover:text-white"
      data-testid="cookie-settings-footer-link"
    >
      Configuración de cookies
    </button>
  );
}
