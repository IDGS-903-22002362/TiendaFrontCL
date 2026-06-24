"use client";

import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStorefront } from "@/hooks/use-storefront";
import {
  loadBuyAgainRailProducts,
  loadFavoritesRailProducts,
  loadRecentlyViewedRailProducts,
} from "@/lib/api/home-sections";
import { HomeRailSection } from "./home-rail-section";

export function HomeDynamicRails() {
  const { token, isAuthenticated } = useAuth();
  const { showFavoritesNav, wishlistIds } = useStorefront();

  const loadFavorites = useCallback(async () => {
    if (!token) {
      return [];
    }
    return loadFavoritesRailProducts();
  }, [token]);

  const loadBuyAgain = useCallback(async () => {
    if (!token) {
      return [];
    }
    return loadBuyAgainRailProducts(token);
  }, [token]);

  const loadRecentlyViewed = useCallback(
    () =>
      loadRecentlyViewedRailProducts(
        token && token !== "cookie-session" ? token : undefined,
      ),
    [token],
  );

  return (
    <>
      <HomeRailSection
        enabled={showFavoritesNav}
        reloadKey={`${token}:${wishlistIds.join(",")}`}
        title="Favoritos"
        eyebrow="Tu selección"
        description="Los productos que guardaste para volver a ellos cuando quieras."
        href="/products?wishlist=1"
        hrefLabel="Ver todos"
        loadProducts={loadFavorites}
      />

      <HomeRailSection
        enabled={isAuthenticated && Boolean(token)}
        reloadKey={token}
        title="Volver a comprar"
        eyebrow="Tus compras"
        description="Piezas que ya llevaste contigo y puedes repetir con confianza."
        href="/profile"
        hrefLabel="Ver compras"
        loadProducts={loadBuyAgain}
      />

      <HomeRailSection
        reloadKey={token}
        title="Vistos recientemente"
        eyebrow="Continúa explorando"
        description="Retoma las piezas que acabas de descubrir."
        showCategoryTabs={false}
        loadProducts={loadRecentlyViewed}
      />
    </>
  );
}
