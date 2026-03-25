"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, type ReactNode } from "react";
import type { Product } from "@/lib/types";
import { getProductStockState } from "@/lib/storefront";
import { ProductGallery } from "@/components/storefront/product/product-gallery";
import { ProductInfoPanel } from "@/components/storefront/product/product-info-panel";
import { AccordionSection } from "@/components/storefront/product/accordion-section";

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
  const stickyRailRef = useRef<HTMLDivElement>(null);
  const stickyPanelRef = useRef<HTMLDivElement>(null);
  const stockState = getProductStockState(product);
  const accordionItems = [
    {
      value: "descripcion",
      title: "Descripción",
      content: <p>{product.description}</p>,
    },
    {
      value: "detalle",
      title: "Detalles",
      content: (
        <ul className="space-y-2">
          <li>Clave: {product.clave ?? "Producto oficial"}</li>
          <li>Categoría: {product.category}</li>
          <li>Línea: {product.lineName ?? "Colección oficial"}</li>
          <li>Disponibilidad: {stockState.hint}</li>
        </ul>
      ),
    },
    {
      value: "fit",
      title: "Talla y ajuste",
      content: (
        <p>
          Usa la selección de talla disponible en el panel de compra. La UI refleja el inventario actual por talla para evitar pasos vacíos.
        </p>
      ),
    },
    {
      value: "cuidado",
      title: "Cuidados y envíos",
      content: (
        <p>
          Consulta la etiqueta del producto para materiales exactos. El flujo mantiene checkout actual, pagos protegidos y seguimiento de pedido desde la cuenta.
        </p>
      ),
    },
  ];

  useEffect(() => {
    const railElement = stickyRailRef.current;
    const panelElement = stickyPanelRef.current;
    if (!railElement || !panelElement || typeof window === "undefined") {
      return;
    }

    let frameId = 0;
    let lastMode: "static" | "fixed" | "bottom" | null = null;
    let lastFixedLeft = "";
    let lastFixedWidth = "";

    const applyStaticMode = () => {
      if (lastMode === "static") {
        return;
      }

      panelElement.style.position = "";
      panelElement.style.left = "";
      panelElement.style.right = "";
      panelElement.style.top = "";
      panelElement.style.bottom = "";
      panelElement.style.width = "";
      panelElement.style.transform = "";
      lastMode = "static";
      lastFixedLeft = "";
      lastFixedWidth = "";
    };

    const applyBottomMode = () => {
      if (lastMode === "bottom") {
        return;
      }

      panelElement.style.position = "absolute";
      panelElement.style.left = "0";
      panelElement.style.right = "0";
      panelElement.style.top = "auto";
      panelElement.style.bottom = "0";
      panelElement.style.width = "auto";
      panelElement.style.transform = "";
      lastMode = "bottom";
      lastFixedLeft = "";
      lastFixedWidth = "";
    };

    const applyFixedMode = (left: string, width: string) => {
      const modeChanged = lastMode !== "fixed";
      const geometryChanged = lastFixedLeft !== left || lastFixedWidth !== width;

      if (!modeChanged && !geometryChanged) {
        return;
      }

      panelElement.style.position = "fixed";
      panelElement.style.left = left;
      panelElement.style.right = "auto";
      panelElement.style.top = "auto";
      panelElement.style.bottom = "24px";
      panelElement.style.width = width;
      panelElement.style.transform = "";
      lastMode = "fixed";
      lastFixedLeft = left;
      lastFixedWidth = width;
    };

    const updateRailPosition = () => {
      frameId = 0;

      if (!window.matchMedia("(min-width: 1024px)").matches) {
        applyStaticMode();
        return;
      }

      const viewportBottomGap = 24;
      const viewportBottom = window.innerHeight - viewportBottomGap;
      const railRect = railElement.getBoundingClientRect();
      const panelHeight = panelElement.offsetHeight;
      const naturalPanelBottom = railRect.top + panelHeight;
      const reachedRailBottom = railRect.bottom <= panelHeight + viewportBottomGap;
      const shouldFixToBottom = naturalPanelBottom >= viewportBottom;

      if (reachedRailBottom) {
        applyBottomMode();
        return;
      }

      if (shouldFixToBottom) {
        applyFixedMode(`${Math.round(railRect.left)}px`, `${Math.round(railRect.width)}px`);
        return;
      }

      applyStaticMode();
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateRailPosition);
    };

    const resizeObserver = new ResizeObserver(() => {
      requestUpdate();
    });

    resizeObserver.observe(panelElement);
    resizeObserver.observe(railElement);
    updateRailPosition();
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("scroll", requestUpdate, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("scroll", requestUpdate);
      applyStaticMode();
    };
  }, []);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,440px)] lg:items-stretch xl:gap-10">
        <div className="min-w-0 space-y-8 lg:self-start xl:space-y-10">
          <ProductGallery product={product} />
          <AccordionSection items={accordionItems} />
          {children ? <div>{children}</div> : null}
        </div>
        <aside className="min-w-0 lg:self-stretch">
          <div ref={stickyRailRef} className="lg:relative lg:h-full lg:pr-1">
            <div ref={stickyPanelRef}>
              <ProductInfoPanel product={product} />
            </div>
          </div>
        </aside>
      </div>
      <ProductQnA product={product} />
    </>
  );
}
