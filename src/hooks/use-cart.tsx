"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  addCartItem,
  clearCart,
  fetchCart,
  getOrCreateSessionId,
  mergeCartSession,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart";
import { useAuth } from "@/hooks/use-auth";

type CartContextType = {
  state: { items: CartItem[] };
  addToCart: (item: Omit<CartItem, "quantity">) => Promise<void>;
  removeItem: (id: string, size?: string) => Promise<void>;
  setItemQuantity: (
    id: string,
    size: string | undefined,
    quantity: number,
  ) => Promise<void>;
  clearAllItems: () => Promise<void>;
  isLoading: boolean;
  totalItems: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [mergedToken, setMergedToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    const loadCart = async () => {
      const activeSessionId = getOrCreateSessionId();
      setSessionId(activeSessionId);

      try {
        const cart = await fetchCart(
          activeSessionId,
          isAuthenticated ? token : undefined,
        );
        setItems(cart.items);
      } catch (error) {
        console.error("Failed to load cart from API", error);
        toast({
          variant: "destructive",
          title: "No se pudo cargar el carrito",
          description: "Intenta nuevamente en unos segundos.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadCart();
  }, [toast, isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token || !sessionId || mergedToken === token) {
      return;
    }

    const mergeAndReload = async () => {
      try {
        await mergeCartSession(sessionId);
        const cart = await fetchCart(sessionId, token);
        setItems(cart.items);
        setMergedToken(token);
      } catch (error) {
        console.error("Failed to merge guest cart", error);
        toast({
          variant: "destructive",
          title: "No se pudo fusionar tu carrito",
          description: "Puedes seguir comprando y reintentar más tarde.",
        });
      }
    };

    void mergeAndReload();
  }, [isAuthenticated, mergedToken, sessionId, toast, token]);

  const addToCart = async (item: Omit<CartItem, "quantity">) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await addCartItem(
        sessionId,
        {
          id: item.id,
          quantity: 1,
          size: item.size,
          color: item.color,
        },
        isAuthenticated ? token : undefined,
      );

      setItems(cart.items);
      toast({
        title: "¡Agregado al carrito!",
        description: `${item.name} ha sido añadido a tu carrito.`,
      });
    } catch (error) {
      console.error("Failed to add item to cart", error);
      toast({
        variant: "destructive",
        title: "No se pudo agregar al carrito",
        description: "Revisa tu conexión e inténtalo nuevamente.",
      });
    }
  };

  const removeItem = async (id: string, size?: string) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await removeCartItem(
        sessionId,
        { id, size },
        isAuthenticated ? token : undefined,
      );
      setItems(cart.items);
    } catch (error) {
      console.error("Failed to remove cart item", error);
      toast({
        variant: "destructive",
        title: "No se pudo eliminar el producto",
        description: "Intenta nuevamente.",
      });
    }
  };

  const setItemQuantity = async (
    id: string,
    size: string | undefined,
    quantity: number,
  ) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await updateCartItem(
        sessionId,
        { id, size, quantity },
        isAuthenticated ? token : undefined,
      );
      setItems(cart.items);
    } catch (error) {
      console.error("Failed to update cart item quantity", error);
      toast({
        variant: "destructive",
        title: "No se pudo actualizar la cantidad",
        description: "Intenta nuevamente.",
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
        isAuthenticated ? token : undefined,
      );
      setItems(cart.items);
    } catch (error) {
      console.error("Failed to clear cart", error);
      toast({
        variant: "destructive",
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
        state: { items },
        addToCart,
        removeItem,
        setItemQuantity,
        clearAllItems,
        isLoading,
        totalItems,
        subtotal,
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
