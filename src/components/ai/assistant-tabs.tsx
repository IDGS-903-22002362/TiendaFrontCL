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
  variant = "default",
  rightSlot,
}: AssistantTabsProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <TabsList className="grid w-full grid-cols-2 h-8 p-1 rounded-lg bg-muted/50">
        {tabs.map((tab) => (
          <TabsTrigger 
            key={tab.value} 
            value={tab.value}
            className="text-[11px] font-bold rounded-md data-[state=active]:shadow-sm"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {rightSlot}
    </div>
  );
}
