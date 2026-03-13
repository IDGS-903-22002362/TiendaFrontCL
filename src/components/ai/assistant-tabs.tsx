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
  if (variant === "product-premium") {
    return (
      <div
        className={cn(
          "border-b border-[#E6ECE6] bg-[#FBFCFB] px-5 py-4 sm:px-6",
          className,
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto rounded-2xl border border-[#E6ECE6] bg-[#F6F8F6] p-1 text-[#5F6B63]">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-[14px] px-4 py-2.5 text-sm font-medium transition data-[state=active]:border data-[state=active]:border-[#E6ECE6] data-[state=active]:bg-white data-[state=active]:text-[#1C241F] data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {rightSlot}
        </div>
      </div>
    );
  }

  return (
    <TabsList className={cn("grid w-full max-w-md grid-cols-2", className)}>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
