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
    "flex min-h-[560px] flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground",
  "product-premium":
    "flex min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-[#E6ECE6] bg-white text-[#1C241F]",
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
