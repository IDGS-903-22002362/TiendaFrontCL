"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AssistantHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  variant?: "default" | "product-premium";
};

export function AssistantHeader({
  title,
  description,
  actions,
  icon,
  className,
  variant = "default",
}: AssistantHeaderProps) {
  if (variant === "product-premium") {
    return (
      <header
        className={cn(
          "border-b border-muted bg-muted/30 px-6 py-6",
          className,
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {icon ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                {icon}
              </div>
            ) : null}
            <div className="space-y-0.5">
              <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {description}
              </p>
            </div>
          </div>
          {actions ? (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className={cn("border-b px-6 py-5 bg-card", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
