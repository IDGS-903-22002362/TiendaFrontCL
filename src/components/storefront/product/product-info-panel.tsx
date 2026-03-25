"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { Product } from "@/lib/types";
import { PriceTag } from "@/components/product/price-tag";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { getCartVariantKey } from "@/lib/api/cart";
import {
  getEditorialProductCopy,
  getProductStockState,
  isPersonalizableProduct,
} from "@/lib/storefront";
import { PersonalizationPanel } from "./personalization-panel";
import { WishlistButton } from "@/components/storefront/shared/wishlist-button";
import { AddToCartBar } from "./add-to-cart-bar";

export function ProductInfoPanel({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { clearPersonalization, getPersonalization, setPersonalization } = useStorefront();
  const sizes = useMemo(
    () => (product.sizes ?? []).filter((size) => typeof size === "string" && size.trim()),
    [product.sizes],
  );
  const [selectedSize, setSelectedSize] = useState<string | undefined>(sizes[0]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const firstAvailableSize =
      sizes.find((size) => {
        const stockItem = product.inventarioPorTalla?.find((item) => item.tallaId === size);
        return (stockItem?.cantidad ?? product.stockTotal ?? product.stock) > 0;
      }) ?? sizes[0];

    setSelectedSize(firstAvailableSize);
  }, [product.inventarioPorTalla, product.stock, product.stockTotal, sizes]);

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
    ? product.inventarioPorTalla?.find((item) => item.tallaId === selectedSize)?.cantidad ??
      product.stockTotal ??
      product.stock
    : product.stockTotal ?? product.stock;
  const stockState = getProductStockState({
    ...product,
    stockTotal: selectedStock,
    stock: selectedStock,
  });
  const sizeRequired = sizes.length > 0;
  const canAddToCart = (!sizeRequired || Boolean(selectedSize)) && selectedStock > 0;
  const canPersonalize = isPersonalizableProduct(product) && Boolean(selectedSize);
  const addLabel = selectedStock <= 0 ? "Agotado" : !canAddToCart ? "Selecciona una talla" : "Añadir al carrito";

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

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/72">
                {product.lineName || product.category}
              </p>
              <h1 className="mt-2 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-6xl">
                {product.name}
              </h1>
            </div>
            <WishlistButton productId={product.id} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PriceTag price={product.price} salePrice={product.salePrice} />
            <Badge variant={stockState.tone === "warning" ? "outline" : "default"}>
              {stockState.label}
            </Badge>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base">
            {getEditorialProductCopy(product)}
          </p>

          <div className="mt-6 grid gap-5">
            {sizes.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-headline text-2xl font-semibold uppercase leading-none tracking-[0.03em]">
                    Talla
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSize ? `Seleccionada: ${selectedSize}` : "Elige una talla"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sizes.map((size) => {
                    const sizeStock =
                      product.inventarioPorTalla?.find((item) => item.tallaId === size)?.cantidad ??
                      product.stockTotal ??
                      product.stock;
                    const disabled = sizeStock <= 0;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        disabled={disabled}
                        className={`rounded-[1rem] border px-4 py-3 text-sm font-medium transition-colors ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground"
                            : disabled
                              ? "cursor-not-allowed border-border bg-muted/45 text-muted-foreground/50"
                              : "border-border bg-card text-foreground hover:border-primary/35"
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
              <Button
                className="hidden h-12 rounded-full px-6 lg:inline-flex"
                disabled={!canAddToCart}
                onClick={handleAddToCart}
              >
                {addLabel}
              </Button>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-muted/45 px-4 py-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{stockState.hint}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Personalización visible en UI, carrito y checkout visual, manteniendo payloads backend actuales.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-muted/45 px-4 py-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Compra segura y consistente</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    El carrito, login y checkout siguen consumiendo la misma API actual.
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
      />
    </>
  );
}
