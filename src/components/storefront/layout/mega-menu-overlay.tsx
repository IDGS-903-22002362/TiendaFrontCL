"use client";

import { cn } from "@/lib/utils";

type MegaMenuOverlayProps = {
  isVisible: boolean;
  onClick: () => void;
  topOffset: number;
};

export function MegaMenuOverlay({
  isVisible,
  onClick,
  topOffset,
}: MegaMenuOverlayProps) {
  return (
    <button
      type="button"
      aria-label="Cerrar menú de navegación"
      tabIndex={isVisible ? 0 : -1}
      onClick={onClick}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 bg-black/30 transition-opacity duration-200 motion-reduce:transition-none",
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      style={{ top: topOffset }}
    />
  );
}
