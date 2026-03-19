"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { PriceTag } from "@/components/product/price-tag";
import { Separator } from "@/components/ui/separator";
import { Lens } from "@/components/ui/lens";
import { CheckCircle, ShoppingCart, Sparkles } from "lucide-react";
import { ProductQnA } from "./product-qna";
import { cn } from "@/lib/utils";

export function ProductDetailsClient({ product }: { product: Product }) {
  const productTallaIds = product.tallaIds ?? [];
  const inventoryBySize = product.inventarioPorTalla ?? [];
  const stockTotal = product.stockTotal ?? product.stock;
  const renderableSizes = useMemo(
    () =>
      (product.sizes ?? []).filter(
        (size) => typeof size === "string" && size.trim().length > 0,
      ),
    [product.sizes],
  );

  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    renderableSizes[0],
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors ? product.colors[0] : undefined,
  );
  const [isDesktopLensEnabled, setIsDesktopLensEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 768px) and (hover: hover) and (pointer: fine)",
    );

    const handleChange = () => {
      setIsDesktopLensEnabled(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    setSelectedSize((currentSize) => {
      if (currentSize && renderableSizes.includes(currentSize)) {
        return currentSize;
      }

      return renderableSizes[0];
    });
  }, [renderableSizes]);

  const { addToCart } = useCart();

  const hasSizeInventory =
    Boolean(product.hasSizeInventory) &&
    productTallaIds.length > 0 &&
    renderableSizes.length > 0;

  const getSizeStock = (size: string) => {
    if (!hasSizeInventory) {
      return stockTotal;
    }

    return (
      inventoryBySize.find((entry) => entry.tallaId === size)?.cantidad ?? 0
    );
  };

  const selectedSizeStock =
    hasSizeInventory && selectedSize ? getSizeStock(selectedSize) : stockTotal;

  const canAddToCart = hasSizeInventory
    ? Boolean(selectedSize) && selectedSizeStock > 0
    : stockTotal > 0;

  const handleAddToCart = () => {
    void addToCart({
      id: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images[0],
      tallaId: selectedSize,
      size: selectedSize,
      color: selectedColor,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
        <div className="md:sticky md:top-24 md:h-[calc(100vh-8rem)]">
          <Carousel className="w-full">
            <CarouselContent>
              {product.images.map((img, index) => {
                const imageId = img.split("/").slice(-3, -2)[0];
                const placeholder = PlaceHolderImages.find((p) =>
                  p.imageUrl.includes(imageId),
                );
                return (
                  <CarouselItem key={index}>
                    <div className="relative aspect-square w-full overflow-hidden rounded-[24px] border border-border bg-card shadow-[var(--shadow-card)] md:rounded-[30px]">
                      {isDesktopLensEnabled ? (
                        <Lens lensSize={190} zoomFactor={1.8}>
                          <Image
                            src={img}
                            alt={`${product.name} - image ${index + 1}`}
                            fill
                            className="object-cover"
                            data-ai-hint={placeholder?.imageHint}
                          />
                        </Lens>
                      ) : (
                        <Image
                          src={img}
                          alt={`${product.name} - image ${index + 1}`}
                          fill
                          className="object-cover"
                          data-ai-hint={placeholder?.imageHint}
                        />
                      )}
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {product.images.length > 1 && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
        </div>

        <div className="flex flex-col gap-5 md:pb-32">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
              {product.category}
            </p>
            <h1 className="font-headline text-2xl font-bold tracking-tight md:text-4xl">
              {product.name}
            </h1>
          </div>

          <PriceTag price={product.price} salePrice={product.salePrice} />

          {canAddToCart ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-medium text-success">
                {hasSizeInventory
                  ? `Stock talla ${selectedSize ?? "-"}: ${selectedSizeStock}`
                  : "En Stock"}
              </span>
            </div>
          ) : (
            <Badge variant="destructive">Agotado</Badge>
          )}

          <p className="text-sm leading-6 text-text-secondary md:text-base">
            {product.description}
          </p>

          <Separator />

          {renderableSizes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-headline text-lg font-semibold">Talla</h3>
              <RadioGroup
                value={selectedSize}
                onValueChange={setSelectedSize}
                className="flex flex-wrap gap-2.5"
              >
                {renderableSizes.map((size) => {
                  const isSoldOut = getSizeStock(size) <= 0;
                  return (
                    <div key={size}>
                      <RadioGroupItem
                        value={size}
                        id={`size-${size}`}
                        className="peer sr-only"
                        disabled={isSoldOut}
                      />
                      <Label
                        htmlFor={`size-${size}`}
                        className={`flex h-11 min-w-16 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors ${
                          isSoldOut
                            ? "cursor-not-allowed opacity-40"
                            : "border-border bg-muted/55 text-text-secondary hover:bg-muted hover:text-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                        }`}
                      >
                        {size}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {product.colors && product.colors.length > 1 && (
            <div className="space-y-3">
              <h3 className="font-headline text-lg font-semibold">
                Color:{" "}
                <span className="font-body font-normal text-muted-foreground">
                  {selectedColor}
                </span>
              </h3>
              <RadioGroup
                value={selectedColor}
                onValueChange={setSelectedColor}
                className="flex flex-wrap gap-3"
              >
                {product.colors.map((color) => (
                  <div key={color}>
                    <RadioGroupItem
                      value={color}
                      id={`color-${color}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`color-${color}`}
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 peer-data-[state=checked]:border-primary"
                      style={{
                        backgroundColor:
                          color.toLowerCase() === "verde"
                            ? "#007A53"
                            : color.toLowerCase(),
                      }}
                    >
                      {selectedColor === color && (
                        <CheckCircle className="h-5 w-5 text-white" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <ProductQnA product={product} />
        </div>
      </div>

      {/* Floating Action Bar - El botón que te "persigue" */}
      <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 md:bottom-6 md:left-1/2 md:w-[calc(100%-2rem)] md:max-w-lg md:-translate-x-1/2">
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-[24px] border border-border bg-card/95 p-2 shadow-[var(--shadow-elevated)] backdrop-blur-xl transition-all md:rounded-[28px]",
          )}
        >
          <div className="hidden pl-6 md:flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
              Precio final
            </span>
            <span className="font-headline text-xl font-bold text-secondary">
              ${(product.salePrice || product.price).toFixed(2)}
            </span>
          </div>
          <Button
            className={cn(
              "group h-14 flex-1 rounded-[20px] px-5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 md:rounded-[22px] md:px-8 md:text-base",
              canAddToCart ? "shadow-lg shadow-primary/20" : "opacity-50",
            )}
            size="lg"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
          >
            {canAddToCart ? (
              <>
                <ShoppingCart className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                Agregar al Carrito
              </>
            ) : (
              "Producto Agotado"
            )}
          </Button>
          {canAddToCart && (
            <div className="hidden lg:flex pr-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/8 text-primary">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
