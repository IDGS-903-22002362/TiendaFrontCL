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
import { addFavorite, getFavorites, removeFavorite } from "@/lib/api/favorites";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { ProductPersonalization } from "@/lib/storefront/types";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

type PersonalizationMap = Record<string, ProductPersonalization>;

function areSameIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

type StorefrontContextValue = {
  wishlistIds: string[];
  showFavoritesNav: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  isWishlistLoading: boolean;
  personalizationByVariant: PersonalizationMap;
  setPersonalization: (
    variantKey: string,
    personalization: ProductPersonalization,
  ) => void;
  clearPersonalization: (variantKey: string) => void;
  getPersonalization: (
    variantKey: string,
  ) => ProductPersonalization | undefined;
};

const WISHLIST_STORAGE_KEY = "tiendafront_wishlist_ids";
const PERSONALIZATION_STORAGE_KEY = "tiendafront_personalization";

const StorefrontContext = createContext<StorefrontContextValue | undefined>(
  undefined,
);

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
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [personalizationByVariant, setPersonalizationByVariant] =
    useState<PersonalizationMap>({});

  useEffect(() => {
    setWishlistIds(readLocalStorage<string[]>(WISHLIST_STORAGE_KEY, []));
    setPersonalizationByVariant(
      readLocalStorage<PersonalizationMap>(PERSONALIZATION_STORAGE_KEY, {}),
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isAuthenticated) {
      return;
    }

    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(wishlistIds),
    );
  }, [isAuthenticated, wishlistIds]);

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

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      const localWishlistIds = readLocalStorage<string[]>(
        WISHLIST_STORAGE_KEY,
        [],
      );
      setWishlistIds((currentWishlistIds) =>
        areSameIds(currentWishlistIds, localWishlistIds)
          ? currentWishlistIds
          : localWishlistIds,
      );
      return;
    }

    let cancelled = false;
    setIsWishlistLoading(true);

    void getFavorites()
      .then((response) => {
        if (cancelled) {
          return;
        }

        const backendWishlistIds = response.data
          .map((favorite) => favorite.producto?.id)
          .filter((productId): productId is string => Boolean(productId));

        setWishlistIds((currentWishlistIds) =>
          areSameIds(currentWishlistIds, backendWishlistIds)
            ? currentWishlistIds
            : backendWishlistIds,
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        toast({
          variant: "destructive",
          title: "No se pudieron cargar tus favoritos",
          description: getApiErrorMessage(error),
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsWishlistLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading, toast]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!productId) {
        return false;
      }

      const currentlyWishlisted = wishlistIds.includes(productId);

      setWishlistIds((currentIds) =>
        currentlyWishlisted
          ? currentIds.filter((id) => id !== productId)
          : [...currentIds, productId],
      );

      if (!isAuthenticated) {
        return !currentlyWishlisted;
      }

      try {
        if (currentlyWishlisted) {
          await removeFavorite(productId);
          return false;
        }

        await addFavorite(productId);
        return true;
      } catch (error) {
        setWishlistIds((currentIds) =>
          currentlyWishlisted
            ? [...currentIds, productId]
            : currentIds.filter((id) => id !== productId),
        );

        toast({
          variant: "destructive",
          title: currentlyWishlisted
            ? "No se pudo quitar de favoritos"
            : "No se pudo agregar a favoritos",
          description: getApiErrorMessage(error),
        });

        return currentlyWishlisted;
      }
    },
    [isAuthenticated, toast, wishlistIds],
  );

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

  const showFavoritesNav =
    !isAuthLoading &&
    isAuthenticated &&
    !isWishlistLoading &&
    wishlistIds.length > 0;

  const value = useMemo<StorefrontContextValue>(
    () => ({
      wishlistIds,
      showFavoritesNav,
      isWishlisted,
      toggleWishlist,
      isWishlistLoading,
      personalizationByVariant,
      setPersonalization,
      clearPersonalization,
      getPersonalization,
    }),
    [
      clearPersonalization,
      getPersonalization,
      isWishlisted,
      isWishlistLoading,
      personalizationByVariant,
      setPersonalization,
      showFavoritesNav,
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
