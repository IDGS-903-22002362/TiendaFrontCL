"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { getCartVariantKey } from "@/lib/api/cart";
import { formatCurrency } from "@/lib/storefront";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";

export default function CartPage() {
  const { state, totalItems, subtotal, removeItem, setItemQuantity, isLoading } = useCart();
  const { getPersonalization } = useStorefront();

  if (isLoading) {
    return (
      <div className="container py-14 text-center text-muted-foreground">
        Cargando carrito...
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Carrito vacío"
          description="Aún no agregas piezas a tu compra. Explora el catálogo y vuelve cuando estés listo."
          ctaLabel="Explorar productos"
        />
      </div>
    );
  }

  return (
    <div className="container py-5 md:py-8">
      <div className="mb-6 space-y-3">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Carrito" },
          ]}
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/74">
            Compra
          </p>
          <h1 className="mt-2 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-6xl">
            Tu carrito
          </h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-4">
          {state.items.map((item) => {
            const variantKey = getCartVariantKey(item);
            const personalization = getPersonalization(variantKey);

            return (
              <article
                key={variantKey}
                className="rounded-[1.9rem] border border-border bg-card p-4 shadow-[var(--shadow-card)] md:p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative aspect-square w-full overflow-hidden rounded-[1.3rem] border border-border bg-muted/45 md:h-36 md:w-36">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/products/${item.id}`}
                          className="font-headline text-3xl font-semibold uppercase leading-none tracking-[0.03em] text-foreground"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Talla: {item.tallaId ?? item.size ?? "Sin talla"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => removeItem(item.id, item.tallaId ?? item.size)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {personalization ? (
                      <div className="mt-4 rounded-[1.2rem] border border-border bg-muted/45 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                          Personalización
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {personalization.name} · {personalization.number}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {personalization.note}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <QuantitySelector
                        quantity={item.quantity}
                        onQuantityChange={(nextQuantity) =>
                          setItemQuantity(item.id, item.tallaId ?? item.size, nextQuantity)
                        }
                        maxQuantity={10}
                      />
                      <div className="text-left md:text-right">
                        <p className="font-headline text-3xl font-semibold uppercase leading-none tracking-[0.02em] text-foreground">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatCurrency(item.price)} por pieza
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[calc(var(--storefront-header-current-height,var(--storefront-header-desktop-height))+1.5rem)]">
          <div className="rounded-[1.9rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/74">
              Resumen
            </p>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Envío estimado</span>
                <span>{formatCurrency(99)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Artículos</span>
                <span>{totalItems}</span>
              </div>
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-border bg-muted/45 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/74">
                Total
              </p>
              <p className="mt-2 font-headline text-4xl font-semibold uppercase leading-none tracking-[0.03em] text-foreground">
                {formatCurrency(subtotal + 99)}
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <Button asChild className="h-12 w-full rounded-full">
                <Link href="/checkout">Continuar compra</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full rounded-full">
                <Link href="/products">Seguir comprando</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
