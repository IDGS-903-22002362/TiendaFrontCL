"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

/** Abre el panel si la URL incluye ?openCookieSettings=1 */
export function CookieSettingsOpener() {
  const searchParams = useSearchParams();
  const { openSettings } = useCookieConsent();

  useEffect(() => {
    if (searchParams.get("openCookieSettings") === "1") {
      openSettings();
    }
  }, [searchParams, openSettings]);

  return null;
}
