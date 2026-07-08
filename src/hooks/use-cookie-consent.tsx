"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type ConsentCategories,
  DEFAULT_CONSENT,
} from "@/lib/cookies/constants";
import {
  acceptAllConsent,
  buildConsentRecord,
  isValidConsent,
  rejectNonEssentialConsent,
  type CookieConsentRecord,
} from "@/lib/cookies/consent-model";
import {
  readConsentFromDocument,
  writeConsentToDocument,
} from "@/lib/cookies/consent-storage";
import {
  cleanupNonEssentialStorage,
  markScriptsUnloaded,
} from "@/lib/cookies/cleanup";
import {
  loadConsentedScripts,
  resetLoadedScriptsState,
} from "@/lib/cookies/script-loader";
import { useClientPrivacy } from "@/hooks/use-client-privacy";
import { cleanupTrackingStorage } from "@/lib/privacy/cleanup-tracking-storage";

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  hasDecided: boolean;
  showBanner: boolean;
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (categories: Partial<ConsentCategories>) => void;
  hasCategory: (category: keyof ConsentCategories) => boolean;
};

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(
  undefined,
);

function applyConsent(
  record: CookieConsentRecord,
  options?: { trackingDisabled?: boolean },
) {
  writeConsentToDocument(record);
  resetLoadedScriptsState();
  markScriptsUnloaded();
  loadConsentedScripts(record, options);
  cleanupNonEssentialStorage(record.categories);

  if (options?.trackingDisabled) {
    cleanupTrackingStorage();
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const { trackingDisabled } = useClientPrivacy();
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (trackingDisabled) {
      const necessaryOnly = rejectNonEssentialConsent();
      setConsent(necessaryOnly);
      setHydrated(true);
      applyConsent(necessaryOnly, { trackingDisabled: true });

      if (typeof window !== "undefined") {
        sessionStorage.setItem("from_mobile_app", "true");
      }
      return;
    }

    const stored = readConsentFromDocument();
    setConsent(stored);
    setHydrated(true);

    if (stored && isValidConsent(stored)) {
      loadConsentedScripts(stored, { trackingDisabled: false });
    }
  }, [trackingDisabled]);

  const hasDecided = trackingDisabled || (hydrated && isValidConsent(consent));
  const showBanner = !trackingDisabled && hydrated && !hasDecided;

  const persist = useCallback(
    (record: CookieConsentRecord) => {
      setConsent(record);
      applyConsent(record, { trackingDisabled });
      setShowSettings(false);
    },
    [trackingDisabled],
  );

  const acceptAll = useCallback(() => {
    if (trackingDisabled) {
      return;
    }
    persist(acceptAllConsent());
  }, [persist, trackingDisabled]);

  const rejectNonEssential = useCallback(() => {
    persist(rejectNonEssentialConsent());
  }, [persist]);

  const savePreferences = useCallback(
    (categories: Partial<ConsentCategories>) => {
      if (trackingDisabled) {
        return;
      }

      persist(
        buildConsentRecord({
          ...DEFAULT_CONSENT,
          ...categories,
          necessary: true,
        }),
      );
    },
    [persist, trackingDisabled],
  );

  const hasCategory = useCallback(
    (category: keyof ConsentCategories) => {
      if (category === "necessary") {
        return true;
      }

      if (trackingDisabled) {
        return false;
      }

      if (!consent || !isValidConsent(consent)) {
        return false;
      }
      return Boolean(consent.categories[category]);
    },
    [consent, trackingDisabled],
  );

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecided,
      showBanner,
      showSettings,
      openSettings: () => {
        if (!trackingDisabled) {
          setShowSettings(true);
        }
      },
      closeSettings: () => setShowSettings(false),
      acceptAll,
      rejectNonEssential,
      savePreferences,
      hasCategory,
    }),
    [
      consent,
      hasDecided,
      showBanner,
      showSettings,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      hasCategory,
      trackingDisabled,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent debe usarse dentro de CookieConsentProvider");
  }
  return context;
}
