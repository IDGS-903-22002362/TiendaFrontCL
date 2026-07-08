// hooks/use-from-mobile-app.ts
"use client";

import { useClientPrivacy } from "@/hooks/use-client-privacy";

export function useIsFromMobileApp() {
  const { isEmbeddedApp } = useClientPrivacy();

  const clearMobileAppFlag = () => {
    if (typeof window === "undefined") {
      return;
    }

    sessionStorage.removeItem("from_mobile_app");
  };

  return { isFromMobileApp: isEmbeddedApp, clearMobileAppFlag };
}
