"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface StickySidebarProps {
  children: ReactNode;
  topOffset?: number;
  bottomOffset?: number;
  minWidth?: number;
  className?: string;
}

export function StickySidebar({
  children,
  topOffset = 96,
  bottomOffset = 24,
  minWidth = 1024,
  className = "",
}: StickySidebarProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const updateTop = () => {
      if (window.innerWidth < minWidth) {
        panel.style.top = '';
        return;
      }

      const viewportHeight = window.innerHeight;
      const panelHeight = panel.offsetHeight;

      // El panel se asegura de ser native "sticky"
      // Si el panel cabe en la pantalla, el top es 96px (topOffset).
      // Si es MUY grande, se usa un valor negativo de top para "esconder" el inicio del bloque 
      // mientras se scrollea naturalmente, y logre fijarse solo en la medida cuando su propio botón
      // inferior aparezca. Math.min garantiza que si cabe, no vuele muy abajo ni muy arriba.
      const calculatedTop = viewportHeight - bottomOffset - panelHeight;
      const finalTop = Math.min(topOffset, calculatedTop);

      panel.style.top = `${finalTop}px`;
    };

    const observer = new ResizeObserver(() => {
      // requestAnimationFrame evita el clásico error ResizeObserver loop limit
      requestAnimationFrame(updateTop);
    });

    observer.observe(panel);
    window.addEventListener("resize", updateTop, { passive: true });

    updateTop();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTop);
    };
  }, [topOffset, bottomOffset, minWidth]);

  return (
    <aside
      ref={panelRef}
      className={`relative z-10 min-w-0 lg:sticky lg:self-start transition-[top] duration-150 ease-out ${className}`}
    >
      {children}
    </aside>
  );
}
