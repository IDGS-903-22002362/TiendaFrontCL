"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/lib/types";
import { showErrorToast } from "@/lib/app-toast";
import {
  addCartItem,
  clearCart,
  fetchCart,
  getOrCreateSessionId,
  mergeCartSession,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart";
import { resolveClientBearerToken } from "@/lib/cookies/constants";
import { useAuth } from "@/hooks/use-auth";
import {
  getApiErrorMessage,
  getCartQuantityUpdateErrorMessage,
} from "@/lib/api/errors";

type CartContextType = {
  state: { id?: string; items: CartItem[] };
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => Promise<void>;
  removeItem: (
    id: string,
    tallaId?: string,
    personalizacion?: CartItem["personalizacion"],
  ) => Promise<void>;
  setItemQuantity: (
    id: string,
    tallaId: string | undefined,
    quantity: number,
    personalizacion?: CartItem["personalizacion"],
  ) => Promise<void>;
  clearAllItems: () => Promise<void>;
  reloadCart: () => Promise<void>;
  isLoading: boolean;
  totalItems: number;
  subtotal: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  addedToCartNotification: {
    title: string;
    description?: string;
  } | null;
  dismissAddedToCartNotification: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | undefined>(undefined);
  const [sessionId, setSessionId] = useState("");
  const [mergedToken, setMergedToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [addedToCartNotification, setAddedToCartNotification] = useState<{
    title: string;
    description?: string;
  } | null>(null);
  
  const { token, isAuthenticated } = useAuth();
  const authToken = resolveClientBearerToken(token);

  const reloadCart = useCallback(async () => {
    const activeSessionId = sessionId || getOrCreateSessionId();
    if (!sessionId) {
      setSessionId(activeSessionId);
    }

    try {
      const cart = await fetchCart(
        activeSessionId,
        isAuthenticated ? authToken : undefined,
      );
      setCartId(cart.id);
      setItems(cart.items);
    } catch (error) {
      console.error("Failed to reload cart from API", error);
    }
  }, [authToken, isAuthenticated, sessionId]);

  useEffect(() => {
    const loadCart = async () => {
      const activeSessionId = getOrCreateSessionId();
      setSessionId(activeSessionId);

      try {
        const cart = await fetchCart(
          activeSessionId,
          isAuthenticated ? authToken : undefined,
        );
        setCartId(cart.id);
        setItems(cart.items);
      } catch (error) {
        console.error("Failed to load cart from API", error);
        showErrorToast({
          title: "No se pudo cargar el carrito",
          description: "Intenta nuevamente en unos segundos.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadCart();
  }, [isAuthenticated, authToken]);

  useEffect(() => {
    if (!isAuthenticated || !sessionId || mergedToken === token) {
      return;
    }

    const mergeAndReload = async () => {
      try {
        await mergeCartSession(sessionId);
        const cart = await fetchCart(sessionId, authToken);
        setCartId((current) => cart.id ?? current);
        setItems(cart.items);
        setMergedToken(token);
      } catch (error) {
        console.error("Failed to merge guest cart", error);
        showErrorToast({
          title: "No se pudo fusionar tu carrito",
          description: "Puedes seguir comprando y reintentar más tarde.",
        });
      }
    };

    void mergeAndReload();
  }, [isAuthenticated, mergedToken, sessionId, token, authToken]);

  const addToCart = async (
    item: Omit<CartItem, "quantity"> & { quantity?: number },
  ) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await addCartItem(
        sessionId,
        {
          id: item.id,
          quantity: item.quantity ?? 1,
          tallaId: item.tallaId ?? item.size,
          color: item.color,
          personalizacion: item.personalizacion,
        },
        isAuthenticated ? authToken : undefined,
      );

      setCartId((current) => cart.id ?? current);
      setItems(cart.items);
      setIsDrawerOpen(true);
      setAddedToCartNotification({
        title: "¡Agregado al carrito!",
        description: `${item.name}${item.quantity && item.quantity > 1 ? ` (${item.quantity})` : ""} ha sido añadido a tu carrito.`.trim(),
      });
    } catch (error) {
      console.error("Failed to add item to cart", error);
      showErrorToast({
        title: "No se pudo agregar al carrito",
        description: getApiErrorMessage(error),
      });
    }
  };

  const removeItem = async (
    id: string,
    tallaId?: string,
    personalizacion?: CartItem["personalizacion"],
  ) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await removeCartItem(
        sessionId,
        { id, tallaId, personalizacion },
        isAuthenticated ? authToken : undefined,
      );
      setCartId((current) => cart.id ?? current);
      setItems(cart.items);
    } catch (error) {
      console.error("Failed to remove cart item", error);
      showErrorToast({
        title: "No se pudo eliminar el producto",
        description: "Intenta nuevamente.",
      });
    }
  };

  const setItemQuantity = async (
    id: string,
    tallaId: string | undefined,
    quantity: number,
    personalizacion?: CartItem["personalizacion"],
  ) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await updateCartItem(
        sessionId,
        { id, tallaId, quantity, personalizacion },
        isAuthenticated ? authToken : undefined,
      );
      setCartId((current) => cart.id ?? current);
      setItems(cart.items);
    } catch (error) {
      console.error("Failed to update cart item quantity", error);
      const cartItem = items.find(
        (item) =>
          item.id === id &&
          (!tallaId || (item.tallaId ?? item.size) === tallaId),
      );
      showErrorToast({
        title: "No se pudo actualizar la cantidad",
        description: getCartQuantityUpdateErrorMessage(error, {
          productId: id,
          productName: cartItem?.name,
        }),
      });
    }
  };

  const clearAllItems = async () => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await clearCart(
        sessionId,
        isAuthenticated ? authToken : undefined,
      );
      setCartId((current) => cart.id ?? current);
      setItems(cart.items);
    } catch (error) {
      console.error("Failed to clear cart", error);
      showErrorToast({
        title: "No se pudo vaciar el carrito",
        description: "Intenta nuevamente.",
      });
    }
  };

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        state: { id: cartId, items },
        addToCart,
        removeItem,
        setItemQuantity,
        clearAllItems,
        reloadCart,
        isLoading,
        totalItems,
        subtotal,
        isDrawerOpen,
        setIsDrawerOpen,
        addedToCartNotification,
        dismissAddedToCartNotification: () => setAddedToCartNotification(null),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
