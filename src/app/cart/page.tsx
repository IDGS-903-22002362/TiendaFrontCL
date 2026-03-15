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
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted/55">
          <Frown className="h-10 w-10 text-text-muted" />
        </div>
        <h1 className="mt-6 font-headline text-3xl font-bold">
          Tu carrito está vacío
        </h1>
        <p className="mt-2 text-text-secondary">
          Parece que aún no has agregado productos.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Explorar productos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-5 md:py-8">
      <div className="mb-6 rounded-[26px] border border-border bg-card/90 p-5 shadow-[var(--shadow-card)] md:mb-8 md:rounded-[30px] md:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
          Compra
        </p>
        <h1 className="mt-2 font-headline text-3xl font-bold md:text-4xl">Tu Carrito</h1>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {state.items.map((item) => (
                  <li
                    key={getCartVariantKey(item)}
                    className="flex items-start gap-3 p-4 md:gap-4"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/40 md:h-24 md:w-24">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <Link
                        href={`/products/${item.id}`}
                        className="line-clamp-2 font-headline text-sm font-semibold hover:underline md:text-base"
                      >
                        {item.name}
                      </Link>
                      {(item.tallaId ?? item.size) && (
                        <p className="mt-1 text-xs text-text-secondary md:text-sm">
                          Talla: {item.tallaId ?? item.size}
                        </p>
                      )}
                      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                        <p className="font-headline text-base font-semibold text-secondary md:text-lg">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-xl"
                      onClick={() =>
                        handleRemoveItem(item.id, item.tallaId ?? item.size)
                      }
                    >
                      <Trash2 className="h-5 w-5 text-text-muted" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <div className="hidden lg:col-span-1 lg:block">
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
              <div className="flex justify-between font-headline text-lg font-bold">
                <span>Total</span>
                <span className="text-secondary">${(subtotal + 99).toFixed(2)}</span>
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

      <div className="fixed inset-x-4 z-30 rounded-[24px] border border-border bg-card/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:hidden mobile-bottom-offset">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Total
            </p>
            <p className="font-headline text-xl font-bold text-secondary">
              ${(subtotal + 99).toFixed(2)}
            </p>
          </div>
          <p className="text-xs text-text-secondary">
            {totalItems} {totalItems === 1 ? "artículo" : "artículos"}
          </p>
        </div>
        <Button asChild className="h-12 w-full" size="lg">
          <Link href="/checkout">Continuar Compra</Link>
        </Button>
      </div>
    </div>
  );
}
