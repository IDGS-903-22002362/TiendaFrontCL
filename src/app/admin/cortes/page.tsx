"use client";

import { Suspense } from "react";
import { PosCutsHistory } from "@/components/pos/cuts/pos-cuts-history";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCortesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <PosCutsHistory />
    </Suspense>
  );
}
