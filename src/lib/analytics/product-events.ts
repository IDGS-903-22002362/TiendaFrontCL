import { trackRecommendationEvent } from "@/lib/api/recommendations";

type ProductEventSurface = "home" | "producto" | "carrito" | "cuenta" | "checkout";

export function trackProductView(productId: string, token?: string) {
  if (!productId) {
    return;
  }

  void trackRecommendationEvent({
    tipo: "vista_producto",
    productoId: productId,
    superficie: "producto",
    token,
  }).catch(() => undefined);
}

export function trackProductClick(
  productId: string,
  superficie: ProductEventSurface = "home",
  token?: string,
) {
  if (!productId) {
    return;
  }

  void trackRecommendationEvent({
    tipo: "clic_producto",
    productoId: productId,
    superficie,
    token,
  }).catch(() => undefined);
}
