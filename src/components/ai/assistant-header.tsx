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
  variant = "default",
  onClose,
}: AssistantHeaderProps) {
  return (
    <header
      className={cn(
        "border-b px-5 py-4 bg-muted/30 flex items-center justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-headline text-lg font-bold tracking-tight text-foreground truncate">
            {title}
          </h2>
          <p className="text-[11px] text-muted-foreground truncate uppercase tracking-wider font-semibold opacity-70">
            {description}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {actions}
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
