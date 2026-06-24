"use client";

import { CookieBanner } from "./cookie-banner";
import { CookieSettingsDialog } from "./cookie-settings-dialog";

export function CookieConsentHost() {
  return (
    <>
      <CookieBanner />
      <CookieSettingsDialog />
    </>
  );
}
