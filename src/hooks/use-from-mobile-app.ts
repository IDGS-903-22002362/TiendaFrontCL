// hooks/use-from-mobile-app.ts
"use client";

import { useEffect, useState } from "react";

function detectMobileAppFromLocation(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (sessionStorage.getItem("from_mobile_app") === "true") {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get("from");
  const mobileParam = params.get("mobile");
  const sourceParam = params.get("source");

  return (
    fromParam === "mobile-app" ||
    mobileParam === "1" ||
    sourceParam === "clubleon-app"
  );
}

export function useIsFromMobileApp() {
  const [isFromMobileApp, setIsFromMobileApp] = useState(
    detectMobileAppFromLocation,
  );

  useEffect(() => {
    if (!detectMobileAppFromLocation()) {
      return;
    }

    sessionStorage.setItem("from_mobile_app", "true");
    setIsFromMobileApp(true);
  }, []);

  const clearMobileAppFlag = () => {
    sessionStorage.removeItem("from_mobile_app");
    setIsFromMobileApp(false);
  };

  return { isFromMobileApp, clearMobileAppFlag };
}
