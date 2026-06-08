"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import {
  getCartVariantKey,
  validarCodigoPromocionCarrito,
  type ResultadoCodigoPromocionCarrito,
  type ValidarCodigoPromocionCarritoItem,
} from "@/lib/api/cart";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
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
import { fetchProducts } from "@/lib/api/storefront";
import {
  calcularPreciosOfertasPublicas,
  type ProductOfferPricing,
} from "@/lib/ofertas-public";

const PROMO_CODE_STORAGE_KEY = "tiendafront_codigo_promocion";

function getStringArrayFromCartItem(item: unknown, keys: string[]): string[] {
  const record =
    item && typeof item === "object" ? (item as Record<string, unknown>) : {};

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.map((entry) => String(entry)).filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
  }

  return [];
}

type OfferSuggestionProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  salePrice: number;
  offerLabel?: string;
};

function getRecordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function getProductString(record: Record<string, unknown>, keys: string[]) {
  const value = getRecordValue(record, keys);

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "";
}

function getProductNumber(record: Record<string, unknown>, keys: string[]) {
  const value = getRecordValue(record, keys);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function getProductImage(record: Record<string, unknown>) {
  const directImage = getProductString(record, [
    "image",
    "imagen",
    "imageUrl",
    "imagenUrl",
    "thumbnail",
  ]);

  if (directImage) {
    return directImage;
  }

  const images = getRecordValue(record, ["images", "imagenes"]);

  if (Array.isArray(images)) {
    const firstStringImage = images.find(
      (entry) => typeof entry === "string" && entry.trim(),
    );

    if (typeof firstStringImage === "string") {
      return firstStringImage;
    }

    const firstObjectImage = images.find(
      (entry) => entry && typeof entry === "object",
    );

    if (firstObjectImage && typeof firstObjectImage === "object") {
      const imageRecord = firstObjectImage as Record<string, unknown>;
      const objectImage = getProductString(imageRecord, ["url", "src", "image"]);

      if (objectImage) {
        return objectImage;
      }
    }
  }

  return "/placeholder.svg";
}

function getCodigoResultadoItems(
  resultado: ResultadoCodigoPromocionCarrito | null,
): Record<string, unknown>[] {
  if (!resultado || typeof resultado !== "object") {
    return [];
  }

  const record = resultado as unknown as Record<string, unknown>;
  const possibleItems = getRecordValue(record, [
    "items",
    "productos",
    "precios",
    "lineas",
    "detalles",
  ]);

  if (!Array.isArray(possibleItems)) {
    return [];
  }

  return possibleItems.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

export function CartDrawer() {
  const router = useRouter();
  const {
    state,
    totalItems,
    removeItem,
    setItemQuantity,
    isDrawerOpen,
    setIsDrawerOpen,
  } = useCart();
  const { getPersonalization } = useStorefront();

  const [pricingOfertas, setPricingOfertas] = useState<
    Record<string, ProductOfferPricing>
  >({});

  const [codigoInput, setCodigoInput] = useState("");
  const [codigoAplicado, setCodigoAplicado] = useState("");
  const [resultadoCodigo, setResultadoCodigo] =
    useState<ResultadoCodigoPromocionCarrito | null>(null);
  const [codigoError, setCodigoError] = useState("");
  const [isApplyingCodigo, setIsApplyingCodigo] = useState(false);
  const [showCodigoForm, setShowCodigoForm] = useState(false);

  const [suggestedOfferProducts, setSuggestedOfferProducts] = useState<
    OfferSuggestionProduct[]
  >([]);
  const [isLoadingSuggestedOffers, setIsLoadingSuggestedOffers] =
    useState(false);

  const offerItems = useMemo(() => {
    return state.items.map((item) => ({
      productoId: item.id,
      cantidad: item.quantity,
    }));
  }, [state.items]);

  const cartProductIdsKey = useMemo(() => {
    return state.items.map((item) => item.id).join("|");
  }, [state.items]);

  useEffect(() => {
    let cancelled = false;

    async function cargarOfertasCarrito() {
      if (offerItems.length === 0) {
        setPricingOfertas({});
        return;
      }

      const precios = await calcularPreciosOfertasPublicas(offerItems);

      if (!cancelled) {
        setPricingOfertas(precios);
      }
    }

    cargarOfertasCarrito();

    return () => {
      cancelled = true;
    };
  }, [offerItems]);

  useEffect(() => {
    let cancelled = false;

    async function cargarProductosSugeridosEnOferta() {
      if (!isDrawerOpen) {
        return;
      }

      try {
        setIsLoadingSuggestedOffers(true);

        const response: unknown = await fetchProducts();

        const products = Array.isArray(response)
          ? response
          : Array.isArray((response as { products?: unknown[] })?.products)
            ? (response as { products: unknown[] }).products
            : Array.isArray((response as { items?: unknown[] })?.items)
              ? (response as { items: unknown[] }).items
              : [];

        const cartProductIds = new Set(state.items.map((item) => item.id));

        const catalogProducts = products
          .map((product) => {
            const record =
              product && typeof product === "object"
                ? (product as Record<string, unknown>)
                : {};

            const id = getProductString(record, ["id", "_id", "productoId"]);
            const name = getProductString(record, [
              "name",
              "nombre",
              "descripcion",
              "title",
            ]);
            const image = getProductImage(record);
            const price = getProductNumber(record, [
              "price",
              "precio",
              "precioPublico",
              "precioUnitario",
            ]);

            return {
              id,
              name,
              image,
              price,
            };
          })
          .filter((product) => {
            return product.id && product.name && product.price > 0;
          })
          .filter((product) => !cartProductIds.has(product.id));

        if (catalogProducts.length === 0) {
          if (!cancelled) {
            setSuggestedOfferProducts([]);
          }
          return;
        }

        const pricing = await calcularPreciosOfertasPublicas(
          catalogProducts.map((product) => ({
            productoId: product.id,
            cantidad: 1,
          })),
        );

        const offerProducts = catalogProducts.reduce<OfferSuggestionProduct[]>(
          (acc, product) => {
            const offerPricing = pricing[product.id];

            const originalPrice = Number(
              offerPricing?.precioOriginal || product.price || 0,
            );
            const finalPrice = Number(offerPricing?.precioFinal || 0);

            const hasOffer =
              finalPrice > 0 &&
              finalPrice < originalPrice &&
              Boolean(
                offerPricing?.ofertaAplicadaId || offerPricing?.ofertaTitulo,
              );

            if (!hasOffer) {
              return acc;
            }

            const offerLabel =
              typeof offerPricing?.ofertaTitulo === "string"
                ? offerPricing.ofertaTitulo
                : "";

            acc.push({
              id: product.id,
              name: product.name,
              image: product.image || "/placeholder.svg",
              price: originalPrice,
              salePrice: finalPrice,
              ...(offerLabel ? { offerLabel } : {}),
            });

            return acc;
          },
          [],
        );

        if (!cancelled) {
          setSuggestedOfferProducts(offerProducts.slice(0, 6));
        }
      } catch (error) {
        console.error("Failed to load suggested offer products", error);

        if (!cancelled) {
          setSuggestedOfferProducts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSuggestedOffers(false);
        }
      }
    }

    void cargarProductosSugeridosEnOferta();

    return () => {
      cancelled = true;
    };
  }, [isDrawerOpen, cartProductIdsKey]);

  const subtotalConOfertas = useMemo(() => {
    return state.items.reduce((total, item) => {
      const pricingOferta = pricingOfertas[item.id];

      const precioOriginal = Number(
        pricingOferta?.precioOriginal || item.price || 0,
      );
      const precioFinal = Number(pricingOferta?.precioFinal || 0);

      const tieneOferta =
        Boolean(pricingOferta?.ofertaAplicadaId || pricingOferta?.ofertaTitulo) &&
        precioFinal > 0 &&
        precioFinal < precioOriginal;

      const precioUnitario = tieneOferta ? precioFinal : item.price;

      return total + precioUnitario * item.quantity;
    }, 0);
  }, [state.items, pricingOfertas]);

  const codigoItems = useMemo<ValidarCodigoPromocionCarritoItem[]>(() => {
    return state.items.map((item) => {
      const pricingOferta = pricingOfertas[item.id];

      const precioOriginal = Number(
        pricingOferta?.precioOriginal || item.price || 0,
      );
      const precioFinal = Number(pricingOferta?.precioFinal || 0);

      const tieneOferta =
        Boolean(pricingOferta?.ofertaAplicadaId || pricingOferta?.ofertaTitulo) &&
        precioFinal > 0 &&
        precioFinal < precioOriginal;

      const precioUnitario = tieneOferta ? precioFinal : item.price;

      return {
        productoId: item.id,
        cantidad: item.quantity,
        precioUnitario,
        tallaId: item.tallaId ?? item.size ?? null,
        categoriaIds: getStringArrayFromCartItem(item, [
          "categoriaIds",
          "categoriasIds",
          "categoryIds",
        ]),
        lineaIds: getStringArrayFromCartItem(item, [
          "lineaIds",
          "lineasIds",
          "lineIds",
        ]),
      };
    });
  }, [state.items, pricingOfertas]);

  const descuentoCodigo = Math.max(
    0,
    Number(resultadoCodigo?.descuentoTotal || 0),
  );

  const subtotalFinalCodigo = Number(resultadoCodigo?.subtotalFinal);

  const totalConCodigo =
    resultadoCodigo && descuentoCodigo > 0 && Number.isFinite(subtotalFinalCodigo)
      ? subtotalFinalCodigo
      : Math.max(subtotalConOfertas - descuentoCodigo, 0);

  const codigoResultadoItems = useMemo(() => {
    return getCodigoResultadoItems(resultadoCodigo);
  }, [resultadoCodigo]);

  const getCodigoResultadoForItem = (
    itemId: string,
    talla?: string | null,
    index?: number,
  ) => {
    if (!codigoAplicado || codigoResultadoItems.length === 0) {
      return undefined;
    }

    const normalizedTalla = String(talla ?? "").trim();

    const exactMatch = codigoResultadoItems.find((codigoItem) => {
      const codigoProductoId = getProductString(codigoItem, [
        "productoId",
        "productId",
        "id",
      ]);
      const codigoTalla = getProductString(codigoItem, [
        "tallaId",
        "size",
        "talla",
      ]);

      return (
        codigoProductoId === itemId &&
        (!codigoTalla || !normalizedTalla || codigoTalla === normalizedTalla)
      );
    });

    if (exactMatch) {
      return exactMatch;
    }

    const productMatch = codigoResultadoItems.find((codigoItem) => {
      const codigoProductoId = getProductString(codigoItem, [
        "productoId",
        "productId",
        "id",
      ]);

      return codigoProductoId === itemId;
    });

    if (productMatch) {
      return productMatch;
    }

    if (typeof index === "number" && codigoResultadoItems.length === state.items.length) {
      const indexedItem = codigoResultadoItems[index];
      const indexedProductoId = indexedItem
        ? getProductString(indexedItem, ["productoId", "productId", "id"])
        : "";

      if (indexedItem && !indexedProductoId) {
        return indexedItem;
      }
    }

    return undefined;
  };

  const resetCodigoPromocion = () => {
    setCodigoAplicado("");
    setResultadoCodigo(null);
    setCodigoError("");

    if (typeof window !== "undefined") {
      localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
    }
  };

  const handleApplyCodigo = async () => {
    const codigo = codigoInput.trim().toUpperCase();

    if (!codigo) {
      setCodigoError("Escribe un código promocional.");
      return;
    }

    if (state.items.length === 0) {
      setCodigoError("Agrega productos al carrito antes de aplicar un código.");
      return;
    }

    try {
      setIsApplyingCodigo(true);
      setCodigoError("");

      const resultado = await validarCodigoPromocionCarrito({
        codigo,
        items: codigoItems,
      });

      const descuento = Number(resultado.descuentoTotal || 0);
      const subtotalFinal = Number(resultado.subtotalFinal || 0);

      const codigoValido =
        resultado.valido !== false &&
        descuento > 0 &&
        subtotalFinal > 0 &&
        subtotalFinal < subtotalConOfertas;

      if (!codigoValido) {
        setCodigoAplicado("");
        setResultadoCodigo(null);
        setCodigoError(
          resultado.mensaje || "El código no aplica para este carrito.",
        );

        if (typeof window !== "undefined") {
          localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
        }

        return;
      }

      setCodigoAplicado(codigo);
      setCodigoInput(codigo);
      setResultadoCodigo(resultado);
      setShowCodigoForm(true);

      if (typeof window !== "undefined") {
        localStorage.setItem(PROMO_CODE_STORAGE_KEY, codigo);
      }
    } catch (error) {
      console.error("Failed to validate promo code", error);
      setCodigoAplicado("");
      setResultadoCodigo(null);
      setCodigoError("No se pudo validar el código. Intenta nuevamente.");

      if (typeof window !== "undefined") {
        localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
      }
    } finally {
      setIsApplyingCodigo(false);
    }
  };

  const handleRemoveCodigo = () => {
    setCodigoInput("");
    setShowCodigoForm(false);
    resetCodigoPromocion();
  };

  const handleCheckout = () => {
    if (state.items.length === 0) {
      return;
    }

    if (codigoAplicado && typeof window !== "undefined") {
      localStorage.setItem(PROMO_CODE_STORAGE_KEY, codigoAplicado);
    }

    setIsDrawerOpen(false);
    router.push("/checkout");
  };

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-11 w-11 rounded-full border-black/14 bg-white"
        >
          <ShoppingBag className="h-4.5 w-4.5" />
          {totalItems > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-[var(--shadow-card)]">
              {Math.min(totalItems, 99)}
            </span>
          ) : null}
          <span className="sr-only">Abrir carrito</span>
        </Button>
      </SheetTrigger>

      <SheetContent className="flex h-dvh w-full flex-col overflow-hidden border-l border-black/14 bg-white px-0 sm:max-w-[520px] lg:max-w-[660px]">
        <div className="flex min-h-0 flex-1">
          {state.items.length > 0 ? (
            <aside className="hidden h-full w-[180px] shrink-0 flex-col border-r border-black/12 bg-white px-3 py-5 lg:flex">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground">
                  Podría interesarte
                </p>
              </div>

              <ScrollArea className="min-h-0 flex-1 pr-2">
                <div className="space-y-5 pb-5">
                  {isLoadingSuggestedOffers ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Buscando productos en oferta...
                    </p>
                  ) : suggestedOfferProducts.length === 0 ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      No hay sugerencias en oferta por ahora.
                    </p>
                  ) : (
                    suggestedOfferProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="block group"
                        onClick={() => setIsDrawerOpen(false)}
                      >
                        <div className="aspect-square overflow-hidden bg-[rgb(247_247_244)]">
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-5 text-foreground">
                          {product.name}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-red-600">
                            {formatCurrency(product.salePrice)}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.price)}
                          </span>
                        </div>

                        {product.offerLabel ? (
                          <p className="mt-1 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                            {product.offerLabel}
                          </p>
                        ) : null}
                      </Link>
                    ))
                  )}
                </div>
              </ScrollArea>
            </aside>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col">
            <SheetHeader className="shrink-0 border-b border-black/12 px-5 pb-4">
              <SheetTitle>Tu carrito</SheetTitle>
            </SheetHeader>

            {state.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-black/14 bg-white text-primary shadow-[0_18px_34px_-28px_rgb(8_12_10_/_0.14)]">
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
                <div className="min-h-0 flex-1">
                  <ScrollArea className="h-full px-5">
                    <div className="space-y-3 py-4">
                      {state.items.map((item, itemIndex) => {
                        const variantKey = getCartVariantKey(item);
                        const personalization = getPersonalization(variantKey);
                        const pricingOferta = pricingOfertas[item.id];

                        const precioOriginal = Number(
                          pricingOferta?.precioOriginal || item.price || 0,
                        );
                        const precioFinal = Number(
                          pricingOferta?.precioFinal || 0,
                        );

                        const tieneOferta =
                          Boolean(
                            pricingOferta?.ofertaAplicadaId ||
                              pricingOferta?.ofertaTitulo,
                          ) &&
                          precioFinal > 0 &&
                          precioFinal < precioOriginal;

                        const precioUnitario = tieneOferta
                          ? precioFinal
                          : item.price;
                        const totalItem = precioUnitario * item.quantity;
                        const codigoResultadoItem = getCodigoResultadoForItem(
                          item.id,
                          item.tallaId ?? item.size,
                          itemIndex,
                        );
                        const codigoSubtotalFinal = codigoResultadoItem
                          ? getProductNumber(codigoResultadoItem, [
                              "subtotalFinal",
                              "subtotalConDescuento",
                              "subtotalFinalCodigo",
                              "totalFinal",
                              "total",
                            ])
                          : 0;
                        const codigoPrecioFinal = codigoResultadoItem
                          ? getProductNumber(codigoResultadoItem, [
                              "precioFinal",
                              "precioUnitarioFinal",
                              "unitPriceFinal",
                              "precioUnitario",
                            ])
                          : 0;
                        const codigoDescuentoItem = codigoResultadoItem
                          ? getProductNumber(codigoResultadoItem, [
                              "descuentoTotal",
                              "descuento",
                              "discountTotal",
                              "discount",
                            ])
                          : 0;
                        const totalItemConCodigo =
                          codigoSubtotalFinal > 0
                            ? codigoSubtotalFinal
                            : codigoPrecioFinal > 0
                              ? codigoPrecioFinal * item.quantity
                              : codigoDescuentoItem > 0
                                ? Math.max(totalItem - codigoDescuentoItem, 0)
                                : totalItem;
                        const tieneCodigoEnItem =
                          Boolean(codigoAplicado && resultadoCodigo && codigoResultadoItem) &&
                          totalItemConCodigo > 0 &&
                          totalItemConCodigo < totalItem;
                        const totalItemVisible = tieneCodigoEnItem
                          ? totalItemConCodigo
                          : totalItem;
                        const precioUnitarioVisible =
                          totalItemVisible / Math.max(item.quantity, 1);
                        const totalOriginalTachado = tieneCodigoEnItem
                          ? totalItem
                          : tieneOferta
                            ? precioOriginal * item.quantity
                            : 0;

                        return (
                          <article
                            key={variantKey}
                            className="rounded-[1.15rem] border border-black/14 bg-white p-3 shadow-none"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[0.95rem] border border-black/12 bg-white">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                />
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
                                    onClick={() => {
                                      resetCodigoPromocion();
                                      removeItem(
                                        item.id,
                                        item.tallaId ?? item.size,
                                      );
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                {personalization ? (
                                  <div className="mt-3 rounded-[1rem] border border-black/12 bg-white px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">
                                      Personalización
                                    </p>
                                    <p className="mt-1 text-sm text-foreground">
                                      {personalization.name} ·{" "}
                                      {personalization.number}
                                    </p>
                                  </div>
                                ) : null}

                                <div className="mt-4 flex items-end justify-between gap-3">
                                  <div>
                                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                      Cantidad
                                    </p>
                                    <div className="flex h-9 items-center border border-black/14 bg-white">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-none"
                                        onClick={() => {
                                          resetCodigoPromocion();
                                          setItemQuantity(
                                            item.id,
                                            item.tallaId ?? item.size,
                                            Math.max(1, item.quantity - 1),
                                          );
                                        }}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                      <span className="w-9 text-center text-sm font-medium">
                                        {item.quantity}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-none"
                                        onClick={() => {
                                          resetCodigoPromocion();
                                          setItemQuantity(
                                            item.id,
                                            item.tallaId ?? item.size,
                                            item.quantity + 1,
                                          );
                                        }}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    {totalOriginalTachado > 0 ? (
                                      <p className="mb-1 text-xs text-muted-foreground line-through">
                                        {formatCurrency(totalOriginalTachado)}
                                      </p>
                                    ) : null}

                                    <p className="font-headline text-2xl font-semibold uppercase leading-none tracking-[0.02em] text-primary">
                                      {formatCurrency(totalItemVisible)}
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {formatCurrency(precioUnitarioVisible)} c/u
                                    </p>

                                    {tieneCodigoEnItem ? (
                                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                        Código {codigoAplicado}
                                      </p>
                                    ) : tieneOferta ? (
                                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                        {pricingOferta?.ofertaTitulo ||
                                          "Oferta aplicada"}
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
                  </ScrollArea>
                </div>

                <div className="shrink-0 border-t border-black/12 px-6 py-2.5">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-[0.16em] text-muted-foreground">
                        Subtotal
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(subtotalConOfertas)}
                      </span>
                    </div>

                    {descuentoCodigo > 0 ? (
                      <div className="flex items-center justify-between text-primary">
                        <span className="uppercase tracking-[0.16em]">
                          Código {codigoAplicado}
                        </span>
                        <span className="font-semibold">
                          -{formatCurrency(descuentoCodigo)}
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-1.5 flex items-center justify-between border-t border-black/12 pt-2">
                      <span className="font-semibold uppercase tracking-[0.16em] text-foreground">
                        Total
                      </span>
                      <span className="font-headline text-xl font-semibold uppercase tracking-[0.04em] text-foreground">
                        {formatCurrency(totalConCodigo)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <SheetFooter className="shrink-0 border-t border-black/12 px-6 py-3 sm:flex-col sm:space-x-0">
              <div className="w-full space-y-2.5">
                {state.items.length > 0 ? (
                  showCodigoForm || codigoAplicado ? (
                    <form
                      className="border border-black/18 bg-white p-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleApplyCodigo();
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/75">
                          Código promocional
                        </label>

                        {codigoAplicado && resultadoCodigo ? (
                          <button
                            type="button"
                            onClick={handleRemoveCodigo}
                            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition hover:text-primary"
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <input
                          value={codigoInput}
                          onChange={(event) => {
                            setCodigoInput(event.target.value.toUpperCase());
                            setCodigoError("");
                          }}
                          placeholder="Ej. LEON20"
                          disabled={isApplyingCodigo}
                          className="h-11 min-w-0 flex-1 border border-black/18 bg-white px-3 text-sm font-medium uppercase outline-none transition focus:border-primary"
                        />

                        <Button
                          type="submit"
                          className="h-11 rounded-none px-5 text-xs uppercase tracking-[0.14em]"
                          disabled={isApplyingCodigo || state.items.length === 0}
                        >
                          {isApplyingCodigo ? "Validando" : "Aplicar"}
                        </Button>
                      </div>

                      {codigoError ? (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {codigoError}
                        </p>
                      ) : null}

                      {codigoAplicado && resultadoCodigo ? (
                        <p className="mt-2 text-xs font-medium text-primary">
                          Código {codigoAplicado} aplicado correctamente.
                        </p>
                      ) : null}
                    </form>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full rounded-none border-black/18 bg-white text-sm font-semibold uppercase tracking-[0.18em] text-foreground hover:bg-[rgb(249_249_246)]"
                      onClick={() => setShowCodigoForm(true)}
                    >
                      Código promocional
                    </Button>
                  )
                ) : null}

                <Button
                  className="h-11 w-full rounded-none text-sm font-semibold uppercase tracking-[0.18em]"
                  disabled={state.items.length === 0}
                  onClick={handleCheckout}
                >
                  Ir a checkout
                </Button>
              </div>
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}