"use client";

import { CartAddedNotification } from "@/components/cart/cart-added-notification";
import { useCart } from "@/hooks/use-cart";

export function CartAddedNotificationHost() {
  const { addedToCartNotification, dismissAddedToCartNotification } = useCart();

  if (!addedToCartNotification) {
    return null;
  }

  return (
    <CartAddedNotification
      title={addedToCartNotification.title}
      description={addedToCartNotification.description}
      onDismiss={dismissAddedToCartNotification}
    />
  );
}
