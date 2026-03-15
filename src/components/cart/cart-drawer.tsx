"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCartVariantKey } from "@/lib/api/cart";

export function CartDrawer() {
  const router = useRouter();
  const { state, totalItems, subtotal, removeItem, setItemQuantity, isDrawerOpen, setIsDrawerOpen } = useCart();

  const handleCheckout = () => {
    if (state.items.length === 0) {
      return;
    }

    setIsDrawerOpen(false);
    router.push("/checkout");
  };

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <div className="relative">
            <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-110" />
            {totalItems > 0 && (
              <Badge
                variant="default"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary p-0 text-[10px] font-bold text-primary-foreground shadow-xs"
              >
                {totalItems}
              </Badge>
            )}
          </div>
          <span className="sr-only">Carrito de compras</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col border-l-0 bg-background/95 backdrop-blur-xl sm:max-w-md">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-3 font-headline text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            Tu Carrito
            {totalItems > 0 && (
              <Badge variant="secondary" className="ml-auto rounded-lg px-2 py-0.5 text-xs font-bold">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {state.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center space-y-6 px-6 text-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/5 blur-2xl" />
                <ShoppingCart className="relative h-20 w-20 text-muted-foreground/30" />
              </div>
              <div className="space-y-2">
                <h3 className="font-headline text-xl font-bold">Carrito vacío</h3>
                <p className="text-sm text-muted-foreground">
                  Parece que aún no has elegido tu equipamiento. ¡Explora nuestras colecciones!
                </p>
              </div>
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-primary/20 font-bold hover:bg-primary/5"
                onClick={() => setIsDrawerOpen(false)}
                asChild
              >
                <Link href="/products">Ver catálogo</Link>
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 pr-4">
                <div className="flex flex-col gap-6 py-2">
                  {state.items.map((item) => {
                    const variantKey = getCartVariantKey(item);
                    return (
                      <div key={variantKey} className="group relative flex gap-4 transition-all">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-xs">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between py-1">
                          <div className="space-y-1">
                            <Link 
                              href={`/products/${item.id}`}
                              onClick={() => setIsDrawerOpen(false)}
                              className="line-clamp-1 font-headline text-sm font-bold hover:text-primary transition-colors"
                            >
                              {item.name}
                            </Link>
                            <div className="flex flex-wrap gap-2">
                              {(item.tallaId || item.size) && (
                                <span className="inline-flex items-center rounded-lg bg-secondary/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Talla: {item.tallaId || item.size}
                                </span>
                              )}
                              {item.color && (
                                <span className="inline-flex items-center rounded-lg bg-secondary/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  {item.color}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1 shadow-xs">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-muted"
                                onClick={() => setItemQuantity(item.id, item.tallaId || item.size, Math.max(1, item.quantity - 1))}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-muted"
                                onClick={() => setItemQuantity(item.id, item.tallaId || item.size, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="font-headline text-sm font-bold text-primary">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 rounded-lg"
                                onClick={() => removeItem(item.id, item.tallaId || item.size)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="space-y-4 pt-6">
                <Separator className="opacity-50" />
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Subtotal</span>
                    <span className="font-bold tracking-tight">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Envío estimado</span>
                    <span className="font-bold text-primary/60">$99.00</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="font-headline text-lg font-bold">Total</span>
                    <div className="text-right">
                      <span className="block font-headline text-2xl font-bold text-primary">
                        ${(subtotal + 99).toFixed(2)}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">IVA incluido</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="mt-auto flex-col gap-3 p-0 pt-8 sm:flex-col">
          <Button
            className="group h-14 w-full rounded-2xl font-headline text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            size="lg"
            disabled={state.items.length === 0}
            onClick={handleCheckout}
          >
            <span className="flex items-center justify-center gap-2">
              PROCESAR COMPRA
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="h-12 w-full rounded-2xl font-bold text-muted-foreground hover:text-primary hover:bg-primary/5"
            onClick={() => setIsDrawerOpen(false)}
          >
            <Link href="/cart">GESTIONAR CARRITO</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

