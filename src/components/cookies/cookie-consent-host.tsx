"use client";

import { AppPrivacyNotice } from "./app-privacy-notice";
import { CookieBanner } from "./cookie-banner";
import { CookieSettingsDialog } from "./cookie-settings-dialog";

export function CookieConsentHost() {
  return (
    <>
      <AppPrivacyNotice />
      <CookieBanner />
      <CookieSettingsDialog />
    </>
  );
}
