"use client";

import type { ReactNode } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type AssistantTab = {
  value: string;
  label: string;
};

type AssistantTabsProps = {
  tabs: AssistantTab[];
  className?: string;
  variant?: "default" | "product-premium";
  rightSlot?: ReactNode;
};

export function AssistantTabs({
  tabs,
  className,
  rightSlot,
}: AssistantTabsProps) {
  const gridColumns = `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))`;

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <TabsList
        className="grid h-10 w-full rounded-2xl border border-border bg-muted/70 p-1"
        style={{ gridTemplateColumns: gridColumns }}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-xl px-2 text-xs font-bold data-[state=active]:border data-[state=active]:border-primary/25 data-[state=active]:bg-card data-[state=active]:shadow-[var(--shadow-card)]"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {rightSlot}
    </div>
  );
}

