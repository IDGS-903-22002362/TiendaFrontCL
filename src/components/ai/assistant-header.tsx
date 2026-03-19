"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type AssistantHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  variant?: "default" | "product-premium";
  onClose?: () => void;
};

export function AssistantHeader({
  title,
  description,
  actions,
  icon,
  className,
  onClose,
}: AssistantHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border bg-background-deep/65 px-4 py-3.5 backdrop-blur-sm sm:px-5 sm:py-4",
        "flex items-center justify-between gap-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-[var(--shadow-card)]">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-headline text-lg font-bold tracking-tight text-foreground truncate">
            {title}
          </h2>
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {description}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onClose}
          >
            <X className="h-4.5 w-4.5" />
          </Button>
        )}
      </div>
    </header>
  );
}
