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
    "flex min-h-[500px] flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm",
  "product-premium":
    "flex min-h-[580px] flex-col overflow-hidden rounded-[32px] border border-primary/10 bg-white text-foreground shadow-xl shadow-primary/5",
} as const;

export function ProductAssistantPanel({
  children,
  className,
  variant = "default",
}: ProductAssistantPanelProps) {
  return (
    <section className={cn(panelVariants[variant], className)}>{children}</section>
  );
}
