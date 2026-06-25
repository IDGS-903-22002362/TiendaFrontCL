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
import { showErrorToast, showSuccessToast } from "@/lib/app-toast";

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
  clearFavorites: () => void; // Añadimos esta función
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

function writeLocalStorage(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar errores de localStorage
  }
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [personalizationByVariant, setPersonalizationByVariant] =
    useState<PersonalizationMap>(() =>
      readLocalStorage<PersonalizationMap>(PERSONALIZATION_STORAGE_KEY, {})
    );

  // Función para limpiar favoritos (al cerrar sesión)
  const clearFavorites = useCallback(() => {
    setWishlistIds([]);
    // Limpiar localStorage también
    writeLocalStorage(WISHLIST_STORAGE_KEY, []);
  }, []);


  // Cargar favoritos cuando el usuario se autentica
  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      clearFavorites();
      return;
    }

    setIsWishlistLoading(true);

    try {
      const response = await getFavorites();

      if (response.success) {
        const backendWishlistIds = response.data
          .map((favorite) => favorite.producto?.id)
          .filter((productId): productId is string => Boolean(productId));

        setWishlistIds(backendWishlistIds);
        // No guardamos en localStorage cuando está autenticado
        // Los datos viven en el backend
      } else {
        setWishlistIds([]);
        showErrorToast({
          
          title: "Error al cargar favoritos",
          description: "No se pudieron cargar tus favoritos",
        });
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
      setWishlistIds([]);
      showErrorToast({
        
        title: "Error al cargar favoritos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsWishlistLoading(false);
    }
  }, [isAuthenticated, clearFavorites]);

  // Efecto para manejar cambios en autenticación
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (isAuthenticated) {
      // Usuario autenticado: cargar favoritos del backend
      void loadFavorites();
    } else {
      // Usuario no autenticado: limpiar favoritos
      clearFavorites();
    }
  }, [isAuthenticated, isAuthLoading, loadFavorites, clearFavorites]);

  // Efecto para personalización (esto sí se guarda en localStorage)
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    writeLocalStorage(PERSONALIZATION_STORAGE_KEY, personalizationByVariant);
  }, [personalizationByVariant]);

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!productId) {
        return false;
      }

      // Si no está autenticado, mostrar mensaje y no permitir
      if (!isAuthenticated) {
        showErrorToast({
          
          title: "Inicia sesión",
          description: "Necesitas iniciar sesión para guardar favoritos",
        });
        return false;
      }

      const currentlyWishlisted = wishlistIds.includes(productId);

      // Optimistic update
      setWishlistIds((currentIds) =>
        currentlyWishlisted
          ? currentIds.filter((id) => id !== productId)
          : [...currentIds, productId],
      );

      try {
        if (currentlyWishlisted) {
          await removeFavorite(productId);
          showSuccessToast({
            title: "Eliminado de favoritos",
            description: "El producto ha sido eliminado de tus favoritos",
          });
          return false;
        }

        await addFavorite(productId);
        showSuccessToast({
          title: "Agregado a favoritos",
          description: "El producto ha sido agregado a tus favoritos",
        });
        return true;
      } catch (error) {
        // Revertir optimistic update en caso de error
        setWishlistIds((currentIds) =>
          currentlyWishlisted
            ? [...currentIds, productId]
            : currentIds.filter((id) => id !== productId),
        );

        showErrorToast({
          
          title: currentlyWishlisted
            ? "No se pudo quitar de favoritos"
            : "No se pudo agregar a favoritos",
          description: getApiErrorMessage(error),
        });

        return currentlyWishlisted;
      }
    },
    [isAuthenticated, wishlistIds],
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
      clearFavorites,
    }),
    [
      clearFavorites,
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