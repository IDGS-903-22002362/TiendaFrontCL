"use client";

import { Suspense } from "react";
import { PosCutFlow } from "@/components/pos/cuts/pos-cut-flow";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPosCortePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <PosCutFlow />
    </Suspense>
  );
}
