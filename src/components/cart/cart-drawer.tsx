"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { getCartVariantKey } from "@/lib/api/cart";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/storefront";

export function CartDrawer() {
  const router = useRouter();
  const {
    state,
    subtotal,
    totalItems,
    removeItem,
    setItemQuantity,
    isDrawerOpen,
    setIsDrawerOpen,
  } = useCart();
  const { getPersonalization } = useStorefront();

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
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-transparent hover:border-border"
        >
          <ShoppingBag className="h-4.5 w-4.5" />
          {totalItems > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {Math.min(totalItems, 99)}
            </span>
          ) : null}
          <span className="sr-only">Abrir carrito</span>
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col border-l border-border bg-card px-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-5 pb-5">
          <SheetTitle>Tu carrito</SheetTitle>
        </SheetHeader>

        {state.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/55 text-primary">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="mt-6 font-headline text-3xl font-semibold uppercase leading-none">
              Vacío por ahora
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Explora el catálogo premium y añade tu próxima pieza oficial.
            </p>
            <Button asChild className="mt-6 h-11 rounded-full px-5">
              <Link href="/products">Ver catálogo</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-5">
              <div className="space-y-4 py-5">
                {state.items.map((item) => {
                  const variantKey = getCartVariantKey(item);
                  const personalization = getPersonalization(variantKey);

                  return (
                    <article
                      key={variantKey}
                      className="rounded-[1.5rem] border border-border bg-muted/35 p-3"
                    >
                      <div className="flex gap-3">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.1rem] border border-border bg-card">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                href={`/products/${item.id}`}
                                className="line-clamp-2 font-headline text-xl font-semibold uppercase leading-none tracking-[0.03em] text-foreground"
                                onClick={() => setIsDrawerOpen(false)}
                              >
                                {item.name}
                              </Link>
                              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                {item.tallaId || item.size || "Sin talla"}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-muted-foreground"
                              onClick={() => removeItem(item.id, item.tallaId ?? item.size)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {personalization ? (
                            <div className="mt-3 rounded-[1rem] border border-border bg-card px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">
                                Personalización
                              </p>
                              <p className="mt-1 text-sm text-foreground">
                                {personalization.name} · {personalization.number}
                              </p>
                            </div>
                          ) : null}

                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div className="flex items-center rounded-full border border-border bg-card p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() =>
                                  setItemQuantity(
                                    item.id,
                                    item.tallaId ?? item.size,
                                    Math.max(1, item.quantity - 1),
                                  )
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() =>
                                  setItemQuantity(
                                    item.id,
                                    item.tallaId ?? item.size,
                                    item.quantity + 1,
                                  )
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <p className="font-headline text-2xl font-semibold uppercase leading-none tracking-[0.02em]">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatCurrency(item.price)} c/u
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-border px-5 py-5">
              <div className="flex items-center justify-between rounded-[1.4rem] border border-border bg-muted/45 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/75">
                    Subtotal
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {totalItems} {totalItems === 1 ? "artículo" : "artículos"}
                  </p>
                </div>
                <p className="font-headline text-3xl font-semibold uppercase leading-none tracking-[0.02em] text-foreground">
                  {formatCurrency(subtotal)}
                </p>
              </div>
            </div>
          </>
        )}

        <SheetFooter className="border-t border-border px-5 py-5 sm:flex-col sm:space-x-0">
          <Button
            className="h-12 w-full rounded-full"
            disabled={state.items.length === 0}
            onClick={handleCheckout}
          >
            Ir a checkout
          </Button>
          <Button
            asChild
            variant="outline"
            className="mt-3 h-11 w-full rounded-full"
            onClick={() => setIsDrawerOpen(false)}
          >
            <Link href="/cart">Gestionar carrito</Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
