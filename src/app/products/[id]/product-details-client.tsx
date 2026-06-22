"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductExtraDetail } from "@/lib/types";
import {
  fetchProductDetail,
  fetchProductExtraDetails,
} from "@/lib/api/storefront";
import {
  enrichProductWithOfferPricing,
  hasValidSalePrice,
  mergeProductPricing,
} from "@/lib/ofertas-public";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getProductStockState } from "@/lib/storefront";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ProductGallery } from "@/components/storefront/product/product-gallery";
import { ProductInfoPanel } from "@/components/storefront/product/product-info-panel";
import { AccordionSection } from "@/components/storefront/product/accordion-section";
import { StickySidebar } from "@/components/storefront/product/sticky-sidebar";
import { PaymentMethodStrip } from "@/components/storefront/shared/payment-method-strip";
import { trackProductView } from "@/lib/analytics/product-events";

const ProductQnA = dynamic(
  () => import("./product-qna").then((module) => module.ProductQnA),
  { ssr: false },
);

export function ProductDetailsClient({
  product,
  children,
}: {
  product: Product;
  children?: ReactNode;
}) {
  const { isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const { toast } = useToast();
  const [currentProduct, setCurrentProduct] = useState(product);
  const [extraDetails, setExtraDetails] = useState<ProductExtraDetail[]>([]);

  const refreshProductDetail = useCallback(async () => {
    const nextProduct = await fetchProductDetail(
      product.id,
      token && token !== "cookie-session" ? token : undefined,
    );

    if (nextProduct) {
      setCurrentProduct((previous) => mergeProductPricing(previous, nextProduct));
    }
  }, [product.id, token]);

  useEffect(() => {
    setCurrentProduct((previous) => mergeProductPricing(previous, product));
  }, [product]);

  useEffect(() => {
    let cancelled = false;

    if (hasValidSalePrice(product)) {
      return;
    }

    void enrichProductWithOfferPricing(product).then((enriched) => {
      if (cancelled) {
        return;
      }

      if (hasValidSalePrice(enriched)) {
        setCurrentProduct((previous) => mergeProductPricing(previous, enriched));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [product]);

  useEffect(() => {
    trackProductView(product.id, token && token !== "cookie-session" ? token : undefined);
  }, [product.id, token]);

  useEffect(() => {
    let cancelled = false;

    void fetchProductExtraDetails(product.id)
      .then((details) => {
        if (cancelled) {
          return;
        }

        setExtraDetails(details);
      })
      .catch((error) => {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "No se pudieron cargar los detalles del producto",
            description: getApiErrorMessage(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product.id, toast]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    void refreshProductDetail().catch((error) => {
      if (!cancelled) {
        toast({
          variant: "destructive",
          title: "No se pudo refrescar el detalle del producto",
          description: getApiErrorMessage(error),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading, product, refreshProductDetail, toast]);

  const stockState = getProductStockState(currentProduct);
  const visibleExtraDetails = useMemo(
    () =>
      extraDetails
        .map((detail) => ({
          ...detail,
          descripcion: detail.descripcion.trim(),
        }))
        .filter((detail) => Boolean(detail.descripcion)),
    [extraDetails],
  );

  const detailContent = useMemo(() => {
    if (visibleExtraDetails.length > 0) {
      return (
        <ul className="space-y-2">
          {visibleExtraDetails.map((detail) => (
            <li key={detail.id}>{detail.descripcion}</li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="space-y-2">
        <li>Clave: {currentProduct.clave ?? "Producto oficial"}</li>
        <li>Categoría: {currentProduct.category}</li>
        <li>Línea: {currentProduct.lineName ?? "Colección oficial"}</li>
        <li>Disponibilidad: {stockState.hint}</li>
      </ul>
    );
  }, [
    currentProduct.category,
    currentProduct.clave,
    currentProduct.lineName,
    stockState.hint,
    visibleExtraDetails,
  ]);

  const accordionItems = [
    {
      value: "descripcion",
      title: "Descripción",
      content: <p>{currentProduct.description}</p>,
    },
    {
      value: "detalle",
      title: "Detalles",
      content: detailContent,
    },
    {
      value: "fit",
      title: "Talla y ajuste",
      content: (
        <p>
          Usa la selección de talla disponible en el panel de compra. La UI
          refleja el inventario actual por talla para evitar pasos vacíos.
        </p>
      ),
    },
    {
      value: "cuidado",
      title: "Cuidados y envíos",
      content: (
        <p>
          Consulta la etiqueta del producto para materiales exactos. Mantente al tanto de nuestras políticas de envío.
        </p>
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[58%_42%] lg:items-stretch xl:gap-10">
        <div className="min-w-0 space-y-8 xl:space-y-10 lg:max-w-[760px]">
          <ProductGallery product={currentProduct} />
          <PaymentMethodStrip
            compact
            title="Métodos de pago"
            description="Disponible con tarjeta, SPEI y billeteras digitales para cerrar la compra sin fricción."
          />
          <AccordionSection items={accordionItems} />
          {children ? <div>{children}</div> : null}
        </div>
        <StickySidebar topOffset={96} bottomOffset={24}>
          <ProductInfoPanel
            product={currentProduct}
            onRefreshDetail={refreshProductDetail}
          />
        </StickySidebar>
      </div>
      <ProductQnA product={currentProduct} />
    </>
  );
}
