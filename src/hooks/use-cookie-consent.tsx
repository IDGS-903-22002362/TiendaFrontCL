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

function applyConsent(record: CookieConsentRecord) {
  writeConsentToDocument(record);
  resetLoadedScriptsState();
  markScriptsUnloaded();
  loadConsentedScripts(record);
  cleanupNonEssentialStorage(record.categories);
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const stored = readConsentFromDocument();
    setConsent(stored);
    setHydrated(true);

    if (stored && isValidConsent(stored)) {
      loadConsentedScripts(stored);
    }
  }, []);

  const hasDecided = hydrated && isValidConsent(consent);
  const showBanner = hydrated && !hasDecided;

  const persist = useCallback((record: CookieConsentRecord) => {
    setConsent(record);
    applyConsent(record);
    setShowSettings(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist(acceptAllConsent());
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist(rejectNonEssentialConsent());
  }, [persist]);

  const savePreferences = useCallback(
    (categories: Partial<ConsentCategories>) => {
      persist(
        buildConsentRecord({
          ...DEFAULT_CONSENT,
          ...categories,
          necessary: true,
        }),
      );
    },
    [persist],
  );

  const hasCategory = useCallback(
    (category: keyof ConsentCategories) => {
      if (category === "necessary") {
        return true;
      }
      if (!consent || !isValidConsent(consent)) {
        return false;
      }
      return Boolean(consent.categories[category]);
    },
    [consent],
  );

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecided,
      showBanner,
      showSettings,
      openSettings: () => setShowSettings(true),
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
