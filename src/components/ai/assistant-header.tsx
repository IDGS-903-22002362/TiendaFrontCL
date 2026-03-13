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
          "border-b border-[#E6ECE6] bg-[#FBFCFB] px-5 py-5 sm:px-6 sm:py-6",
          className,
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {icon ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E6ECE6] bg-white text-[#0B7A43]">
                  {icon}
                </span>
              ) : null}
              <div>
                <h2 className="font-headline text-[1.7rem] font-semibold tracking-[-0.03em] text-[#1C241F]">
                  {title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5F6B63]">
                  {description}
                </p>
              </div>
            </div>
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-2.5 lg:max-w-[18rem] lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className={cn("border-b px-6 py-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
