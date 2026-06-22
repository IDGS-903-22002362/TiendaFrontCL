"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ProductCarouselSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-border/60 p-3">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
