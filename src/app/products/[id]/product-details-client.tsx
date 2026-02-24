'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { PriceTag } from '@/components/product/price-tag';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, ShoppingCart } from 'lucide-react';
import { ProductQnA } from './product-qna';

export function ProductDetailsClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes ? product.sizes[0] : undefined
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors ? product.colors[0] : undefined
  );
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images[0],
      size: selectedSize,
      color: selectedColor,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        {/* Image Gallery */}
        <div className="md:sticky md:top-24 md:h-[calc(100vh-8rem)]">
          <Carousel className="w-full">
            <CarouselContent>
              {product.images.map((img, index) => {
                const imageId = img.split('/').slice(-3, -2)[0];
                const placeholder = PlaceHolderImages.find(p => p.imageUrl.includes(imageId));
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

        {/* Product Info */}
        <div className="flex flex-col gap-6 md:pb-32">
          <div>
            <p className="text-sm font-medium text-primary">{product.category}</p>
            <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">
              {product.name}
            </h1>
          </div>

          <PriceTag price={product.price} salePrice={product.salePrice} />

          {product.stock > 0 ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-600">En Stock</span>
            </div>
          ) : (
            <Badge variant="destructive">Agotado</Badge>
          )}

          <p className="text-muted-foreground">{product.description}</p>

          <Separator />

          {/* Size Selector */}
          {product.sizes && (
            <div className="space-y-3">
              <h3 className="font-headline text-lg font-semibold">Talla</h3>
              <RadioGroup
                value={selectedSize}
                onValueChange={setSelectedSize}
                className="flex flex-wrap gap-2"
              >
                {product.sizes.map(size => (
                  <div key={size}>
                    <RadioGroupItem
                      value={size}
                      id={`size-${size}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`size-${size}`}
                      className="flex h-10 w-16 cursor-pointer items-center justify-center rounded-md border text-sm transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                    >
                      {size}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Color Selector */}
          {product.colors && product.colors.length > 1 && (
             <div className="space-y-3">
              <h3 className="font-headline text-lg font-semibold">Color: <span className="font-body font-normal text-muted-foreground">{selectedColor}</span></h3>
              <RadioGroup
                value={selectedColor}
                onValueChange={setSelectedColor}
                className="flex flex-wrap gap-2"
              >
                {product.colors.map(color => (
                  <div key={color}>
                    <RadioGroupItem
                      value={color}
                      id={`color-${color}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`color-${color}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 peer-data-[state=checked]:border-primary"
                      style={{ backgroundColor: color.toLowerCase() === 'verde' ? '#007A53' : color.toLowerCase() }}
                    >
                      {selectedColor === color && <CheckCircle className="h-5 w-5 text-white" />}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <ProductQnA product={product} />
        </div>
      </div>
      
      {/* Sticky Add to Cart for Mobile */}
      <div className="fixed bottom-0 left-0 z-30 w-full border-t bg-background/90 p-4 backdrop-blur-sm md:hidden">
          <Button
            className="w-full"
            size="lg"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
          </Button>
      </div>
      
      {/* Add to Cart for Desktop */}
       <div className="hidden md:block md:fixed md:bottom-8 md:right-8 md:z-30">
          <Button
            className="w-full shadow-lg"
            size="lg"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {product.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
          </Button>
      </div>
    </>
  );
}
