"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { Frown, Trash2 } from "lucide-react";
import { getCartVariantKey } from "@/lib/api/cart";

export default function CartPage() {
  const {
    state,
    totalItems,
    subtotal,
    removeItem,
    setItemQuantity,
    isLoading,
  } = useCart();

  const handleRemoveItem = (id: string, tallaId?: string) => {
    void removeItem(id, tallaId);
  };

  const handleUpdateQuantity = (
    id: string,
    tallaId: string | undefined,
    quantity: number,
  ) => {
    void setItemQuantity(id, tallaId, quantity);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8 text-center text-muted-foreground">
        Cargando carrito...
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
        <Frown className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-6 font-headline text-3xl font-bold">
          Tu carrito está vacío
        </h1>
        <p className="mt-2 text-muted-foreground">
          Parece que aún no has agregado productos.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Explorar productos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 font-headline text-4xl font-bold">Tu Carrito</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {state.items.map((item) => (
                  <li
                    key={getCartVariantKey(item)}
                    className="flex items-start gap-4 p-4"
                  >
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow">
                      <Link
                        href={`/products/${item.id}`}
                        className="font-headline font-semibold hover:underline"
                      >
                        {item.name}
                      </Link>
                      {(item.tallaId ?? item.size) && (
                        <p className="text-sm text-muted-foreground">
                          Talla: {item.tallaId ?? item.size}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <QuantitySelector
                          quantity={item.quantity}
                          onQuantityChange={(newQuantity) =>
                            handleUpdateQuantity(
                              item.id,
                              item.tallaId ?? item.size,
                              newQuantity,
                            )
                          }
                          maxQuantity={10} // Assuming a max quantity, should come from product stock
                        />
                        <p className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleRemoveItem(item.id, item.tallaId ?? item.size)
                      }
                    >
                      <Trash2 className="h-5 w-5 text-muted-foreground" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Resumen de Compra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>$99.00</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${(subtotal + 99).toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">Continuar Compra</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
