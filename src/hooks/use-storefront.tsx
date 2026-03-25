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
import type { ProductPersonalization } from "@/lib/storefront/types";

type PersonalizationMap = Record<string, ProductPersonalization>;

type StorefrontContextValue = {
  wishlistIds: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  personalizationByVariant: PersonalizationMap;
  setPersonalization: (variantKey: string, personalization: ProductPersonalization) => void;
  clearPersonalization: (variantKey: string) => void;
  getPersonalization: (variantKey: string) => ProductPersonalization | undefined;
};

const WISHLIST_STORAGE_KEY = "tiendafront_wishlist_ids";
const PERSONALIZATION_STORAGE_KEY = "tiendafront_personalization";

const StorefrontContext = createContext<StorefrontContextValue | undefined>(undefined);

function isSamePersonalization(
  left: ProductPersonalization | undefined,
  right: ProductPersonalization | undefined,
) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.mode === right.mode &&
    left.name === right.name &&
    left.number === right.number &&
    left.styleLabel === right.styleLabel &&
    left.previewLabel === right.previewLabel &&
    left.note === right.note
  );
}

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return fallback;
    }

    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [personalizationByVariant, setPersonalizationByVariant] =
    useState<PersonalizationMap>({});

  useEffect(() => {
    setWishlistIds(readLocalStorage<string[]>(WISHLIST_STORAGE_KEY, []));
    setPersonalizationByVariant(
      readLocalStorage<PersonalizationMap>(PERSONALIZATION_STORAGE_KEY, {}),
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PERSONALIZATION_STORAGE_KEY,
      JSON.stringify(personalizationByVariant),
    );
  }, [personalizationByVariant]);

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds],
  );

  const toggleWishlist = useCallback((productId: string) => {
    setWishlistIds((currentIds) =>
      currentIds.includes(productId)
        ? currentIds.filter((id) => id !== productId)
        : [...currentIds, productId],
    );
  }, []);

  const setPersonalization = useCallback(
    (variantKey: string, personalization: ProductPersonalization) => {
      setPersonalizationByVariant((currentMap) => {
        if (isSamePersonalization(currentMap[variantKey], personalization)) {
          return currentMap;
        }

        return {
          ...currentMap,
          [variantKey]: personalization,
        };
      });
    },
    [],
  );

  const clearPersonalization = useCallback((variantKey: string) => {
    setPersonalizationByVariant((currentMap) => {
      if (!(variantKey in currentMap)) {
        return currentMap;
      }

      const nextMap = { ...currentMap };
      delete nextMap[variantKey];
      return nextMap;
    });
  }, []);

  const getPersonalization = useCallback(
    (variantKey: string) => personalizationByVariant[variantKey],
    [personalizationByVariant],
  );

  const value = useMemo<StorefrontContextValue>(
    () => ({
      wishlistIds,
      isWishlisted,
      toggleWishlist,
      personalizationByVariant,
      setPersonalization,
      clearPersonalization,
      getPersonalization,
    }),
    [
      clearPersonalization,
      getPersonalization,
      isWishlisted,
      personalizationByVariant,
      setPersonalization,
      toggleWishlist,
      wishlistIds,
    ],
  );

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);

  if (!context) {
    throw new Error("useStorefront must be used within a StorefrontProvider");
  }

  return context;
}
