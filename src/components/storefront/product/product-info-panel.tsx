"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, Sparkles, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { rateProduct } from "@/lib/api/storefront";
import { getApiErrorMessage } from "@/lib/api/errors";
import { PriceTag } from "@/components/product/price-tag";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useStorefront } from "@/hooks/use-storefront";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/lib/app-toast";
import { getCartVariantKey } from "@/lib/api/cart";
import {
  getEditorialProductCopy,
  getProductStockState,
  isPersonalizableProduct,
} from "@/lib/storefront";
import { isTryOnEligibleProduct } from "@/lib/ai/try-on-eligibility";
import { cn } from "@/lib/utils";
import { PersonalizationPanel } from "./personalization-panel";
import { WishlistButton } from "@/components/storefront/shared/wishlist-button";
import { AddToCartBar } from "./add-to-cart-bar";

export function ProductInfoPanel({
  product,
  onRefreshDetail,
}: {
  product: Product;
  onRefreshDetail?: () => Promise<void>;
}) {
  const { addToCart } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { clearPersonalization, getPersonalization, setPersonalization } =
    useStorefront();
  const sizes = useMemo(
    () =>
      (product.sizes ?? []).filter(
        (size) => typeof size === "string" && size.trim(),
      ),
    [product.sizes],
  );
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    sizes[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedRating, setSelectedRating] = useState<
    1 | 2 | 3 | 4 | 5 | null
  >(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    const firstAvailableSize =
      sizes.find((size) => {
        const stockItem = product.inventarioPorTalla?.find(
          (item) => item.tallaId === size,
        );
        return (stockItem?.cantidad ?? product.stockTotal ?? product.stock) > 0;
      }) ?? sizes[0];

    setSelectedSize(firstAvailableSize);
  }, [product.inventarioPorTalla, product.stock, product.stockTotal, sizes]);

  useEffect(() => {
    const incomingScore = product.myRating?.score;
    setSelectedRating(
      incomingScore && incomingScore >= 1 && incomingScore <= 5
        ? (incomingScore as 1 | 2 | 3 | 4 | 5)
        : null,
    );
  }, [product.myRating?.score]);

  const variantKey = getCartVariantKey({
    id: product.id,
    tallaId: selectedSize,
    size: selectedSize,
  });
  const personalization = getPersonalization(variantKey);
  const handlePersonalizationChange = useCallback(
    (value: import("@/lib/storefront/types").ProductPersonalization | null) => {
      if (!value) {
        clearPersonalization(variantKey);
        return;
      }

      setPersonalization(variantKey, value);
    },
    [clearPersonalization, setPersonalization, variantKey],
  );

  const selectedStock = selectedSize
    ? (product.inventarioPorTalla?.find((item) => item.tallaId === selectedSize)
      ?.cantidad ??
      product.stockTotal ??
      product.stock)
    : (product.stockTotal ?? product.stock);
  const stockState = getProductStockState({
    ...product,
    stockTotal: selectedStock,
    stock: selectedStock,
  });
  const sizeRequired = sizes.length > 0;
  const canAddToCart =
    (!sizeRequired || Boolean(selectedSize)) && selectedStock > 0;
  const canPersonalize =
    isPersonalizableProduct(product) && Boolean(selectedSize);
  const canTryOn = isTryOnEligibleProduct({
    categoryId: product.categoryId,
    categoryName: product.category,
    lineId: product.lineId,
    lineName: product.lineName,
    description: product.description,
  });
  const addLabel =
    selectedStock <= 0
      ? "Agotado"
      : !canAddToCart
        ? "Selecciona una talla"
        : "Añadir al carrito";
  const ratingSummary = product.ratingSummary;
  const canRate = product.ratingEligibility?.canRate ?? false;
  const ratingReason = product.ratingEligibility?.reason;
  const shouldShowRatingBlock =
    Boolean(ratingSummary) || isAuthenticated || isAuthLoading;

  const ratingHint = !isAuthenticated
    ? "Inicia sesión para guardar favoritos y calificar este producto."
    : canRate
      ? product.myRating
        ? "Ya calificaste este producto. Puedes actualizar tu puntuación."
        : "Puedes calificar este producto porque ya fue entregado."
      : ratingReason === "not_delivered"
        ? "Podrás calificar cuando tu pedido se marque como entregado."
        : ratingReason === "purchase_required"
          ? "La calificación solo está disponible para compras entregadas."
          : "La calificación no está disponible por ahora.";

  const handleAddToCart = () => {
    void addToCart({
      id: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images[0],
      tallaId: selectedSize,
      size: selectedSize,
      quantity,
    });
  };

  const handleRateProduct = async (score: 1 | 2 | 3 | 4 | 5) => {
    if (!isAuthenticated) {
      showInfoToast({
        title: "Inicia sesión para calificar",
        description: "Necesitas una sesión activa y una compra entregada.",
      });
      return;
    }

    if (!canRate) {
      showInfoToast({
        title: "Calificación no disponible",
        description: ratingHint,
      });
      return;
    }

    const previousScore = selectedRating;
    setSelectedRating(score);
    setIsSubmittingRating(true);

    try {
      await rateProduct(product.id, score);
      await onRefreshDetail?.();
      showSuccessToast({
        title: previousScore
          ? "Calificación actualizada"
          : "Calificación registrada",
        description: `Guardaste ${score} de 5 estrellas.`,
      });
    } catch (error) {
      setSelectedRating(previousScore);
      showErrorToast({
        title: "No se pudo guardar la calificación",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleOpenTryOn = () => {
    window.dispatchEvent(
      new CustomEvent("product-assistant:open-tryon", {
        detail: { productId: product.id },
      }),
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-[1.7rem] border border-black/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,250,247,0.98))] p-5 shadow-[0_22px_42px_-36px_rgb(8_12_10_/_0.18)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="editorial-label text-primary/72">
                {product.lineName || product.category}
              </p>
              <h1 className="mt-3 max-w-full font-headline text-[2.1rem] font-semibold uppercase leading-[1.04] tracking-normal [overflow-wrap:normal] [word-break:normal] md:text-[2.55rem] xl:text-[2.8rem]">
                {product.name}
              </h1>
            </div>
            <WishlistButton productId={product.id} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PriceTag price={product.price} salePrice={product.salePrice} />
            <Badge
              variant={stockState.tone === "warning" ? "outline" : "default"}
            >
              {stockState.label}
            </Badge>
            {ratingSummary ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-black/12 bg-white px-3 py-1.5 text-sm text-foreground">
                <Star className="h-4 w-4 fill-current text-primary" />
                <span className="font-semibold">
                  {ratingSummary.average.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({ratingSummary.count} rese
                  {ratingSummary.count === 1 ? "ña" : "ñas"})
                </span>
              </div>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base">
            {getEditorialProductCopy(product)}
          </p>

          <div className="mt-7 grid gap-5">
            {sizes.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
                    Talla
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSize
                      ? `Seleccionada: ${selectedSize}`
                      : "Elige una talla"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sizes.map((size) => {
                    const sizeStock =
                      product.inventarioPorTalla?.find(
                        (item) => item.tallaId === size,
                      )?.cantidad ??
                      product.stockTotal ??
                      product.stock;
                    const disabled = sizeStock <= 0;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        disabled={disabled}
                        className={`rounded-[0.95rem] border px-4 py-3 text-sm font-medium transition-[border-color,background-color,color,transform] ${selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                          : disabled
                            ? "cursor-not-allowed border-black/10 bg-[rgb(244_244_240)] text-muted-foreground/50"
                            : "border-black/14 bg-white text-foreground hover:-translate-y-px hover:border-black"
                          }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {canPersonalize ? (
              <PersonalizationPanel
                value={personalization}
                onChange={handlePersonalizationChange}
                jerseyBackImage={product.images[product.images.length - 1]} // ← la última imagen como espalda
              />
            ) : null}

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <p className="mb-3 font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
                  Cantidad
                </p>
                <QuantitySelector
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  maxQuantity={Math.max(1, selectedStock)}
                />
              </div>
              <div className="grid gap-2 lg:min-w-[220px]">
                <Button
                  className="hidden h-[52px] lg:h-[56px] min-w-[44px] min-h-[44px] rounded-[1rem] px-6 lg:inline-flex"
                  disabled={!canAddToCart}
                  onClick={handleAddToCart}
                >
                  {addLabel}
                </Button>
                {canTryOn ? (
                  <Button
                    variant="outline"
                    className="hidden h-[52px] lg:h-[56px] min-w-[44px] min-h-[44px] rounded-[1rem] border-primary/30 text-primary hover:bg-primary/10 lg:inline-flex"
                    type="button"
                    onClick={handleOpenTryOn}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Pruebatelo
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-black/14 bg-white px-4 py-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {stockState.hint}
                  </p>
                </div>
              </div>
            </div>

            {shouldShowRatingBlock ? (
              <div className="rounded-[1.2rem] border border-black/14 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Calificación del producto
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {ratingHint}
                    </p>
                  </div>
                  {ratingSummary ? (
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {ratingSummary.average.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ratingSummary.count} total
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const numericScore = score as 1 | 2 | 3 | 4 | 5;
                    const isActive = (selectedRating ?? 0) >= numericScore;

                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => void handleRateProduct(numericScore)}
                        disabled={
                          !isAuthenticated || !canRate || isSubmittingRating
                        }
                        aria-label={`Calificar con ${score} estrellas`}
                        className={cn(
                          "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-[border-color,background-color,color,transform] disabled:pointer-events-none disabled:opacity-50",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-black/14 bg-[rgb(248_246_241)] text-muted-foreground",
                          canRate && isAuthenticated && !isSubmittingRating
                            ? "hover:-translate-y-px hover:border-black hover:text-primary"
                            : "",
                        )}
                      >
                        <Star
                          className={cn("h-5 w-5", isActive && "fill-current")}
                        />
                      </button>
                    );
                  })}
                </div>

                {product.myRating ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Tu calificación actual es de {product.myRating.score}{" "}
                    estrellas.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-[1.2rem] border border-black/14 bg-white px-4 py-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Compra segura y consistente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddToCartBar
        price={(product.salePrice || product.price) * quantity}
        disabled={!canAddToCart}
        quantity={quantity}
        label={addLabel}
        onAdd={handleAddToCart}
        onTryOn={handleOpenTryOn}
      />
    </>
  );
}
