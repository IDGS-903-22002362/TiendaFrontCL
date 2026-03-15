"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProductAssistantPanelProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "product-premium";
};

const panelVariants = {
  default:
    "flex flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-xl",
  "product-premium":
    "flex flex-col overflow-hidden rounded-[24px] border border-primary/15 bg-card/95 backdrop-blur-xl text-foreground shadow-[var(--shadow-elevated)]",
} as const;

export function ProductAssistantPanel({
  children,
  className,
  variant = "default",
}: ProductAssistantPanelProps) {
  return (
    <section className={cn(panelVariants[variant], "max-h-[600px] w-full max-w-[450px]", className)}>
      {children}
    </section>
  );
}
