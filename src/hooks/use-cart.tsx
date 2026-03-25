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
import { getApiErrorMessage } from "@/lib/api/errors";

type CartContextType = {
  state: { items: CartItem[] };
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => Promise<void>;
  removeItem: (id: string, tallaId?: string) => Promise<void>;
  setItemQuantity: (
    id: string,
    tallaId: string | undefined,
    quantity: number,
  ) => Promise<void>;
  clearAllItems: () => Promise<void>;
  isLoading: boolean;
  totalItems: number;
  subtotal: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [mergedToken, setMergedToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { toast } = useToast();
  const { token, isAuthenticated } = useAuth();
  const authToken = token && token !== "cookie-session" ? token : undefined;

  useEffect(() => {
    const loadCart = async () => {
      const activeSessionId = getOrCreateSessionId();
      setSessionId(activeSessionId);

      try {
        const cart = await fetchCart(
          activeSessionId,
          isAuthenticated ? authToken : undefined,
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
  }, [toast, isAuthenticated, authToken]);

  useEffect(() => {
    if (!isAuthenticated || !sessionId || mergedToken === token) {
      return;
    }

    const mergeAndReload = async () => {
      try {
        await mergeCartSession(sessionId);
        const cart = await fetchCart(sessionId, authToken);
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
  }, [isAuthenticated, mergedToken, sessionId, toast, token, authToken]);

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
        },
        isAuthenticated ? authToken : undefined,
      );

      setItems(cart.items);
      setIsDrawerOpen(true); // Abrir el carrito dinámicamente al añadir
      
      toast({
        title: "¡Agregado al carrito!",
        description: `${item.name} ${item.quantity && item.quantity > 1 ? `(${item.quantity})` : ""} ha sido añadido a tu carrito.`.trim(),
      });
    } catch (error) {
      console.error("Failed to add item to cart", error);
      toast({
        variant: "destructive",
        title: "No se pudo agregar al carrito",
        description: getApiErrorMessage(error),
      });
    }
  };

  const removeItem = async (id: string, tallaId?: string) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await removeCartItem(
        sessionId,
        { id, tallaId },
        isAuthenticated ? authToken : undefined,
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
    tallaId: string | undefined,
    quantity: number,
  ) => {
    if (!sessionId) {
      return;
    }

    try {
      const cart = await updateCartItem(
        sessionId,
        { id, tallaId, quantity },
        isAuthenticated ? authToken : undefined,
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
        isAuthenticated ? authToken : undefined,
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
        isDrawerOpen,
        setIsDrawerOpen,
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
