"use client";

import { useState } from "react";
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
import { CheckCircle, ShoppingCart, Sparkles } from "lucide-react";
import { ProductQnA } from "./product-qna";
import { cn } from "@/lib/utils";

export function ProductDetailsClient({ product }: { product: Product }) {
  const productTallaIds = product.tallaIds ?? [];
  const inventoryBySize = product.inventarioPorTalla ?? [];
  const stockTotal = product.stockTotal ?? product.stock;

  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes ? product.sizes[0] : undefined,
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors ? product.colors[0] : undefined,
  );

  const { addToCart } = useCart();

  const hasSizeInventory =
    Boolean(product.hasSizeInventory) && productTallaIds.length > 0;

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
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
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
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                      <Image
                        src={img}
                        alt={`${product.name} - image ${index + 1}`}
                        fill
                        className="object-cover"
                        data-ai-hint={placeholder?.imageHint}
                      />
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

        <div className="flex flex-col gap-6 md:pb-32">
          <div>
            <p className="text-sm font-medium text-primary">{product.category}</p>
            <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">
              {product.name}
            </h1>
          </div>

          <PriceTag price={product.price} salePrice={product.salePrice} />

          {canAddToCart ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-600">
                {hasSizeInventory
                  ? `Stock talla ${selectedSize ?? "-"}: ${selectedSizeStock}`
                  : "En Stock"}
              </span>
            </div>
          ) : (
            <Badge variant="destructive">Agotado</Badge>
          )}

          <p className="text-muted-foreground">{product.description}</p>

          <Separator />

          {product.sizes && (
            <div className="space-y-3">
              <h3 className="font-headline text-lg font-semibold">Talla</h3>
              <RadioGroup
                value={selectedSize}
                onValueChange={setSelectedSize}
                className="flex flex-wrap gap-2"
              >
                {product.sizes.map((size) => {
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
                        className={`flex h-10 w-16 cursor-pointer items-center justify-center rounded-md border text-sm transition-colors ${
                          isSoldOut
                            ? "cursor-not-allowed opacity-40"
                            : "hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
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
                className="flex flex-wrap gap-2"
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
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 peer-data-[state=checked]:border-primary"
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
      <div className="fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={cn(
          "flex items-center justify-between gap-4 rounded-[28px] border p-2 shadow-2xl backdrop-blur-xl transition-all",
          "bg-white/80 border-primary/10 dark:bg-black/80 dark:border-white/10"
        )}>
          <div className="hidden pl-6 md:flex flex-col">
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Precio final</span>
             <span className="font-headline text-xl font-bold text-primary">
               ${(product.salePrice || product.price).toFixed(2)}
             </span>
          </div>
          <Button
            className={cn(
              "group h-14 flex-1 rounded-[22px] px-8 text-base font-bold transition-all hover:scale-[1.02] active:scale-95",
              canAddToCart ? "shadow-lg shadow-primary/20" : "opacity-50"
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
              <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
