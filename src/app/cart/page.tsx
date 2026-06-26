"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { getCartVariantKey } from "@/lib/api/cart";
import { formatCurrency } from "@/lib/storefront";
import {
  buildCartOfferPricingItems,
  calcularPreciosOfertasPublicas,
  getCartItemOfferLine,
  type ProductOfferPricing,
} from "@/lib/ofertas-public";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  cartHasUnpurchasableItems,
  getCartStockBadgeLabel,
} from "@/lib/cart-stock";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { Breadcrumbs } from "@/components/storefront/shared/breadcrumbs";
import { CartRecommendations } from "@/components/storefront/recommendations/cart-recommendations";

export default function CartPage() {
  const { state, totalItems, removeItem, setItemQuantity, isLoading } = useCart();
  const { getPersonalization } = useStorefront();

  const [pricingOfertas, setPricingOfertas] = useState<
    Record<string, ProductOfferPricing>
  >({});

  const offerItemsKey = useMemo(() => {
    return state.items
      .map((item) => `${item.id}:${item.tallaId ?? item.size ?? ""}:${item.quantity}`)
      .join("|");
  }, [state.items]);

  useEffect(() => {
    let cancelled = false;

    async function cargarOfertasCarrito() {
      if (state.items.length === 0) {
        setPricingOfertas({});
        return;
      }

      const precios = await calcularPreciosOfertasPublicas(
        buildCartOfferPricingItems(state.items),
      );

      if (!cancelled) {
        setPricingOfertas(precios);
      }
    }

    cargarOfertasCarrito();

    return () => {
      cancelled = true;
    };
  }, [offerItemsKey, state.items]);

  const subtotalConOfertas = useMemo(() => {
    return state.items.reduce((total, item) => {
      const offerLine = getCartItemOfferLine(item, pricingOfertas);
      return total + offerLine.totalItem;
    }, 0);
  }, [state.items, pricingOfertas]);

  const hasUnpurchasableItems = useMemo(
    () => cartHasUnpurchasableItems(state.items),
    [state.items],
  );

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

            const offerLine = getCartItemOfferLine(item, pricingOfertas);
            const {
              tieneOferta,
              precioUnitario,
              subtotalOriginal,
              totalItem,
              offerLabel,
            } = offerLine;
            const stockBadgeLabel = getCartStockBadgeLabel(item.stockStatus);
            const itemIsPurchasable = item.purchasable !== false;

            return (
              <article
                key={variantKey}
                className={`rounded-[1.9rem] border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/20 md:p-5 ${itemIsPurchasable ? "" : "opacity-70"}`}
              >
                <div className="flex flex-col gap-4 md:flex-row">
                  <Link
                    href={`/products/${item.id}`}
                    className="group relative aspect-square w-full overflow-hidden rounded-[1.3rem] border border-border bg-muted/45 transition hover:border-primary/35 md:h-36 md:w-36"
                    aria-label={`Ver ${item.name}`}
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/products/${item.id}`}
                          className="font-headline text-3xl font-semibold uppercase leading-none tracking-[0.03em] text-foreground transition hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Talla: {item.tallaId ?? item.size ?? "Sin talla"}
                        </p>
                        {stockBadgeLabel ? (
                          <Badge
                            variant={
                              item.stockStatus === "temporarily_unavailable"
                                ? "secondary"
                                : "outline"
                            }
                            className="mt-2"
                          >
                            {stockBadgeLabel}
                          </Badge>
                        ) : null}
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
                        {tieneOferta ? (
                          <p className="mb-1 text-xs text-muted-foreground line-through">
                            {formatCurrency(subtotalOriginal)}
                          </p>
                        ) : null}

                        <p className="font-headline text-3xl font-semibold uppercase leading-none tracking-[0.02em] text-primary">
                          {formatCurrency(totalItem)}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatCurrency(precioUnitario)} por pieza
                        </p>

                        {tieneOferta ? (
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                            {offerLabel}
                          </p>
                        ) : null}
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
                <span>{formatCurrency(subtotalConOfertas)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Envio FedEx</span>
                <span>Cotizar en checkout</span>
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
                {formatCurrency(subtotalConOfertas)}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {hasUnpurchasableItems ? (
                <p className="text-sm font-medium text-destructive">
                  Hay productos agotados o no disponibles en tu carrito. Quítalos
                  o revisa más tarde.
                </p>
              ) : null}

              {hasUnpurchasableItems ? (
                <Button
                  disabled
                  className="h-12 w-full rounded-full"
                >
                  Continuar compra
                </Button>
              ) : (
                <Button asChild className="h-12 w-full rounded-full">
                  <Link href="/checkout">Continuar compra</Link>
                </Button>
              )}

              <Button asChild variant="outline" className="h-11 w-full rounded-full">
                <Link href="/products">Seguir comprando</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-12">
        <CartRecommendations productIds={state.items.map((item) => item.id)} />
      </div>
    </div>
  );
}

