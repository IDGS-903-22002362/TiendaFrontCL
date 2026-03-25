"use client";

import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function FilterDrawer({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 flex-1 rounded-full xl:hidden">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-[2rem] border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>Refina el catálogo</SheetTitle>
        </SheetHeader>
        <div className="max-h-[72dvh] overflow-y-auto pr-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
