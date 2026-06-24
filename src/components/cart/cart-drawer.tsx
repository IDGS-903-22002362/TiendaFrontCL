"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import {
  consultarDisponibilidadCodigosPromocionCarrito,
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
import {
  fetchCatalogPage,
  getOfertasPopularesCatalogQuery,
  getPopularesCatalogQuery,
} from "@/lib/api/storefront";
import type { CatalogProductCard } from "@/lib/types";
import {
  buildCartOfferPricingItems,
  buildOfferPricingFromCatalogItems,
  calcularPreciosOfertasPublicas,
  getCartItemOfferLine,
  type ProductOfferPricing,
} from "@/lib/ofertas-public";

const PROMO_CODE_STORAGE_KEY = "tiendafront_codigo_promocion";
const SUGGESTED_PRODUCTS_LIMIT = 6;
const OFFERS_FETCH_LIMIT = 12;
const POPULAR_PRODUCTS_FETCH_LIMIT = 12;

const suggestionsSessionCache = new Map<string, OfferSuggestionProduct[]>();

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

function catalogCardToSuggestion(
  card: CatalogProductCard,
  cartProductIds: Set<string>,
): OfferSuggestionProduct | null {
  if (!card.id || !card.nombre || card.precioOriginal <= 0) {
    return null;
  }

  if (cartProductIds.has(card.id)) {
    return null;
  }

  const image =
    card.imagenes?.[0] || card.imagenPrincipal || "/placeholder.svg";
  const originalPrice = card.precioOriginal;
  const hasOffer =
    card.tieneOferta &&
    card.precioFinal > 0 &&
    card.precioFinal < originalPrice;
  const finalPrice = hasOffer ? card.precioFinal : originalPrice;

  return {
    id: card.id,
    name: card.nombre,
    image,
    price: originalPrice,
    salePrice: finalPrice,
    ...(hasOffer && card.ofertaTitulo ? { offerLabel: card.ofertaTitulo } : {}),
  };
}

function applyOfferPricingToSuggestions(
  suggestions: OfferSuggestionProduct[],
  pricing: Record<string, ProductOfferPricing>,
): OfferSuggestionProduct[] {
  return suggestions.map((suggestion) => {
    const offerPricing = pricing[suggestion.id];

    if (!offerPricing) {
      return suggestion;
    }

    const originalPrice = Number(
      offerPricing.precioOriginal || suggestion.price || 0,
    );
    const finalPrice = Number(offerPricing.precioFinal || 0);
    const hasOffer =
      finalPrice > 0 &&
      finalPrice < originalPrice &&
      Boolean(
        offerPricing.ofertaAplicadaId || offerPricing.ofertaTitulo,
      );

    if (!hasOffer) {
      return suggestion;
    }

    const offerLabel =
      typeof offerPricing.ofertaTitulo === "string"
        ? offerPricing.ofertaTitulo
        : "";

    return {
      ...suggestion,
      price: originalPrice,
      salePrice: finalPrice,
      ...(offerLabel ? { offerLabel } : {}),
    };
  });
}

function buildSuggestionsFromCatalog(
  offerCards: CatalogProductCard[],
  popularCards: CatalogProductCard[],
  cartProductIds: Set<string>,
  pricing: Record<string, ProductOfferPricing> = {},
): OfferSuggestionProduct[] {
  const suggestions: OfferSuggestionProduct[] = [];
  const usedProductIds = new Set<string>();

  for (const card of offerCards) {
    if (suggestions.length >= SUGGESTED_PRODUCTS_LIMIT) {
      break;
    }

    const suggestion = catalogCardToSuggestion(card, cartProductIds);

    if (!suggestion || usedProductIds.has(suggestion.id)) {
      continue;
    }

    const [pricedSuggestion] = applyOfferPricingToSuggestions(
      [suggestion],
      pricing,
    );
    const hasOffer = pricedSuggestion.salePrice < pricedSuggestion.price;

    if (!hasOffer) {
      continue;
    }

    suggestions.push(pricedSuggestion);
    usedProductIds.add(pricedSuggestion.id);
  }

  if (suggestions.length < SUGGESTED_PRODUCTS_LIMIT) {
    for (const card of popularCards) {
      if (suggestions.length >= SUGGESTED_PRODUCTS_LIMIT) {
        break;
      }

      const suggestion = catalogCardToSuggestion(card, cartProductIds);

      if (!suggestion || usedProductIds.has(suggestion.id)) {
        continue;
      }

      const [pricedSuggestion] = applyOfferPricingToSuggestions(
        [suggestion],
        pricing,
      );

      suggestions.push(pricedSuggestion);
      usedProductIds.add(pricedSuggestion.id);
    }
  }

  return suggestions;
}

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

    const [ofertasCarritoCargadas, setOfertasCarritoCargadas] =
    useState(false);

  const [
    puedeMostrarCodigoPromocional,
    setPuedeMostrarCodigoPromocional,
  ] = useState(false);

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

  const offerItemsKey = useMemo(() => {
    return state.items
      .map((item) => `${item.id}:${item.tallaId ?? item.size ?? ""}:${item.quantity}`)
      .join("|");
  }, [state.items]);

  const cartProductIdsKey = useMemo(() => {
    return state.items.map((item) => item.id).join("|");
  }, [state.items]);

  useEffect(() => {
  let cancelled = false;

  async function cargarOfertasCarrito() {
    if (state.items.length === 0) {
      if (!cancelled) {
        setPricingOfertas({});
        setOfertasCarritoCargadas(true);
      }

      return;
    }

    if (!cancelled) {
      setOfertasCarritoCargadas(false);
      setPuedeMostrarCodigoPromocional(false);
    }

    try {
      const precios = await calcularPreciosOfertasPublicas(
        buildCartOfferPricingItems(state.items),
      );

      if (!cancelled) {
        setPricingOfertas(precios);
        setOfertasCarritoCargadas(true);
      }
    } catch (error) {
      console.error("Failed to load cart offer pricing", error);

      if (!cancelled) {
        setPricingOfertas({});
        setOfertasCarritoCargadas(false);
        setPuedeMostrarCodigoPromocional(false);
      }
    }
  }

  void cargarOfertasCarrito();

  return () => {
    cancelled = true;
  };
}, [offerItemsKey, state.items]);

  useEffect(() => {
    let cancelled = false;

    function commitSuggestions(next: OfferSuggestionProduct[]) {
      if (cancelled) {
        return;
      }

      const limited = next.slice(0, SUGGESTED_PRODUCTS_LIMIT);
      setSuggestedOfferProducts(limited);
      setIsLoadingSuggestedOffers(false);

      if (limited.length > 0) {
        suggestionsSessionCache.set(cartProductIdsKey, limited);
      }
    }

    async function cargarProductosSugeridosEnOferta() {
      if (!isDrawerOpen) {
        return;
      }

      const cachedSuggestions = suggestionsSessionCache.get(cartProductIdsKey);

      if (cachedSuggestions?.length) {
        setSuggestedOfferProducts(cachedSuggestions);
        setIsLoadingSuggestedOffers(false);
        return;
      }

      setIsLoadingSuggestedOffers(true);

      const cartProductIds = new Set(state.items.map((item) => item.id));
      let partialSuggestions: OfferSuggestionProduct[] = [];

      const offersPromise = fetchCatalogPage(
        getOfertasPopularesCatalogQuery(OFFERS_FETCH_LIMIT),
      );
      const popularPromise = fetchCatalogPage(
        getPopularesCatalogQuery(POPULAR_PRODUCTS_FETCH_LIMIT),
      );

      void offersPromise
        .then((offersPage) => {
          if (cancelled) {
            return;
          }

          partialSuggestions = buildSuggestionsFromCatalog(
            offersPage.items,
            [],
            cartProductIds,
          );

          if (partialSuggestions.length > 0) {
            commitSuggestions(partialSuggestions);
          }
        })
        .catch((error) => {
          console.error("Failed to load offer suggestions", error);
        });

      void popularPromise
        .then((popularPage) => {
          if (cancelled) {
            return;
          }

          const popularOnly = buildSuggestionsFromCatalog(
            [],
            popularPage.items,
            cartProductIds,
          );

          if (partialSuggestions.length === 0 && popularOnly.length > 0) {
            commitSuggestions(popularOnly);
          }
        })
        .catch((error) => {
          console.error("Failed to load popular suggested products", error);
        });

      try {
        const [offersResult, popularResult] = await Promise.allSettled([
          offersPromise,
          popularPromise,
        ]);

        const offerCards =
          offersResult.status === "fulfilled" ? offersResult.value.items : [];
        const popularCards =
          popularResult.status === "fulfilled" ? popularResult.value.items : [];

        if (offersResult.status === "rejected") {
          console.error(
            "Failed to load offer suggestions",
            offersResult.reason,
          );
        }

        if (popularResult.status === "rejected") {
          console.error(
            "Failed to load popular suggested products",
            popularResult.reason,
          );
        }

        const allCards = [...offerCards, ...popularCards];
        const snapshotPricing = buildOfferPricingFromCatalogItems(allCards);

        const pricingProductIds = new Set<string>();

        for (const card of offerCards) {
          if (!snapshotPricing[card.id]) {
            pricingProductIds.add(card.id);
          }
        }

        for (const card of popularCards) {
          if (!snapshotPricing[card.id]) {
            pricingProductIds.add(card.id);
          }
        }

        const needsPricing = [...pricingProductIds].map((productoId) => ({
          productoId,
          cantidad: 1,
        }));

        const fetchedPricing =
          needsPricing.length > 0
            ? await calcularPreciosOfertasPublicas(needsPricing)
            : {};

        const mergedPricing = {
          ...snapshotPricing,
          ...fetchedPricing,
        };

        const suggestions = buildSuggestionsFromCatalog(
          offerCards,
          popularCards,
          cartProductIds,
          mergedPricing,
        );

        if (!cancelled) {
          commitSuggestions(suggestions);
        }
      } catch (error) {
        console.error("Failed to load suggested offer products", error);

        if (!cancelled) {
          setSuggestedOfferProducts([]);
          setIsLoadingSuggestedOffers(false);
        }
      }
    }

    void cargarProductosSugeridosEnOferta();

    return () => {
      cancelled = true;
    };
  }, [isDrawerOpen, cartProductIdsKey, state.items]);

  const subtotalConOfertas = useMemo(() => {
    return state.items.reduce((total, item) => {
      const offerLine = getCartItemOfferLine(item, pricingOfertas);
      return total + offerLine.totalItem;
    }, 0);
  }, [state.items, pricingOfertas]);

  const carritoTieneOfertas = useMemo(() => {
  return state.items.some((item) => {
    const offerLine = getCartItemOfferLine(item, pricingOfertas);

    return offerLine.tieneOferta;
  });
}, [state.items, pricingOfertas]);


    const codigoItems = useMemo<ValidarCodigoPromocionCarritoItem[]>(() => {
    return state.items.reduce<ValidarCodigoPromocionCarritoItem[]>(
      (itemsElegibles, item) => {
        const offerLine = getCartItemOfferLine(item, pricingOfertas);

        // La oferta normal tiene prioridad.
        // Los productos con oferta activa no participan en códigos.
        if (offerLine.tieneOferta) {
          return itemsElegibles;
        }

        itemsElegibles.push({
          productoId: item.id,
          cantidad: item.quantity,
          precioUnitario: offerLine.precioUnitario,
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
        });

        return itemsElegibles;
      },
      [],
    );
  }, [state.items, pricingOfertas]);

  const subtotalElegibleParaCodigo = useMemo(() => {
    return codigoItems.reduce((total, item) => {
      return total + item.precioUnitario * item.cantidad;
    }, 0);
  }, [codigoItems]);

  useEffect(() => {
    let cancelled = false;

    async function verificarDisponibilidadCodigos() {
      if (
  !ofertasCarritoCargadas ||
  state.items.length === 0 ||
  codigoItems.length === 0 ||
  carritoTieneOfertas
) {
        if (!cancelled) {
          setPuedeMostrarCodigoPromocional(false);
          setCodigoInput("");
          setCodigoAplicado("");
          setResultadoCodigo(null);
          setCodigoError("");
          setShowCodigoForm(false);

          if (typeof window !== "undefined") {
            localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
          }
        }

        return;
      }

      try {
        const resultado =
          await consultarDisponibilidadCodigosPromocionCarrito({
            items: codigoItems,
          });

        if (cancelled) {
          return;
        }

        const disponible = resultado.disponible === true;

        setPuedeMostrarCodigoPromocional(disponible);

        if (!disponible) {
          setCodigoInput("");
          setCodigoAplicado("");
          setResultadoCodigo(null);
          setCodigoError("");
          setShowCodigoForm(false);

          if (typeof window !== "undefined") {
            localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error(
          "Failed to check promo code availability",
          error,
        );

        if (!cancelled) {
          setPuedeMostrarCodigoPromocional(false);
          setCodigoInput("");
          setCodigoAplicado("");
          setResultadoCodigo(null);
          setCodigoError("");
          setShowCodigoForm(false);

          if (typeof window !== "undefined") {
            localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
          }
        }
      }
    }

    void verificarDisponibilidadCodigos();

    return () => {
      cancelled = true;
    };
 }, [
  codigoItems,
  ofertasCarritoCargadas,
  carritoTieneOfertas,
  state.items.length,
]);

  const descuentoCodigo = Math.max(
    0,
    Number(resultadoCodigo?.descuentoTotal || 0),
  );

   const totalConCodigo = Math.max(
    subtotalConOfertas - descuentoCodigo,
    0,
  );

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

     if (
  carritoTieneOfertas ||
  !puedeMostrarCodigoPromocional ||
  codigoItems.length === 0
) {
  setCodigoError("");
  setShowCodigoForm(false);
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

      const codigoValido =
        resultado.valido !== false &&
        Number.isFinite(descuento) &&
        descuento > 0 &&
        descuento <= subtotalElegibleParaCodigo;

      if (!codigoValido) {
  const mensaje =
    resultado.mensaje || "El código no aplica para este carrito.";

  setCodigoError(
    codigoAplicado
      ? `${mensaje} El código ${codigoAplicado} continúa aplicado.`
      : mensaje,
  );

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

  setCodigoError(
    codigoAplicado
      ? `No se pudo validar el nuevo código. El código ${codigoAplicado} continúa aplicado.`
      : "No se pudo validar el código. Intenta nuevamente.",
  );
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

 if (typeof window !== "undefined") {
  if (
    !carritoTieneOfertas &&
    puedeMostrarCodigoPromocional &&
    codigoAplicado &&
    resultadoCodigo
  ) {
    localStorage.setItem(
      PROMO_CODE_STORAGE_KEY,
      codigoAplicado,
    );
  } else {
    localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
  }
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

      <SheetContent className="flex w-full border-l border-black/14 bg-white px-0 sm:max-w-[420px] lg:max-w-[560px] xl:max-w-[620px]">
        <div className="flex h-full min-h-0 w-full">
          {isLoadingSuggestedOffers || suggestedOfferProducts.length > 0 ? (
            <aside className="hidden w-[180px] shrink-0 border-r border-black/12 bg-[rgb(249_249_246)] px-4 py-5 lg:flex lg:flex-col">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-foreground">
                Podría interesarte
              </p>

              <ScrollArea className="min-h-0 flex-1 pr-2">
                <div className="space-y-5 pb-5">
                  {isLoadingSuggestedOffers ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Buscando sugerencias...
                    </p>
                  ) : suggestedOfferProducts.length === 0 ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      No hay sugerencias por ahora.
                    </p>
                  ) : (
                    suggestedOfferProducts.map((product) => {
                      const hasOffer = product.salePrice < product.price;

                      return (
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
                            {hasOffer ? (
                              <>
                                <span className="text-xs font-semibold text-red-600">
                                  {formatCurrency(product.salePrice)}
                                </span>
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatCurrency(product.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-foreground">
                                {formatCurrency(product.price)}
                              </span>
                            )}
                          </div>

                          {product.offerLabel ? (
                            <p className="mt-1 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                              {product.offerLabel}
                            </p>
                          ) : null}
                        </Link>
                      );
                    })
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
                        const offerLine = getCartItemOfferLine(item, pricingOfertas);
                        const {
                          tieneOferta,
                          precioUnitario,
                          totalItem,
                          offerLabel,
                        } = offerLine;
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
                            ? offerLine.subtotalOriginal
                            : 0;

                        return (
                          <article
                            key={variantKey}
                            className="rounded-[1.15rem] border border-black/14 bg-white p-3 shadow-none transition-colors hover:border-primary/25 hover:bg-[rgb(252_252_250)]"
                          >
                            <div className="flex gap-3">
                              <Link
                                href={`/products/${item.id}`}
                                className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-[0.95rem] border border-black/12 bg-white transition hover:border-primary/35"
                                onClick={() => setIsDrawerOpen(false)}
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
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <Link
                                      href={`/products/${item.id}`}
                                      className="line-clamp-2 font-headline text-xl font-semibold uppercase leading-none tracking-[0.03em] text-foreground transition hover:text-primary"
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
                               {state.items.length > 0 &&
puedeMostrarCodigoPromocional &&
!carritoTieneOfertas ? (
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

                      {codigoAplicado && resultadoCodigo && !codigoError ? (
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
                  Ir a detalle de compra
                </Button>
              </div>
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}