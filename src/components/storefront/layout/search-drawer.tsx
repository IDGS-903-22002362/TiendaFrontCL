"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { fetchProducts } from "@/lib/api/storefront";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { normalizeStorefrontText } from "@/lib/storefront";

type SearchDrawerProps = {
  isDesktop: boolean;
};

function SearchPanel({
  query,
  setQuery,
  suggestions,
  onSearch,
}: {
  query: string;
  setQuery: (value: string) => void;
  suggestions: Product[];
  onSearch: (value: string) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query);
      }}
    >
      <div className="flex items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca jerseys, gorras y piezas oficiales"
          className="h-12"
        />
        <Button type="submit" className="h-12 px-5">
          Buscar
        </Button>
      </div>
      <div className="rounded-[1.5rem] border border-border bg-muted/45 p-2">
        <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/75">
          Sugerencias
        </p>
        <div className="space-y-1">
          {suggestions.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSearch(product.name)}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-card"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category}</p>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

export function SearchDrawer({ isDesktop }: SearchDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || products.length > 0) {
      return;
    }

    const loadProducts = async () => {
      const nextProducts = await fetchProducts();
      setProducts(nextProducts);
    };

    void loadProducts();
  }, [open, products.length]);

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeStorefrontText(query);
    const list = products.filter(Boolean);

    if (!normalizedQuery) {
      return list.slice(0, 6);
    }

    return list
      .map((product) => {
        const haystack = normalizeStorefrontText(
          `${product.name} ${product.description} ${product.category}`,
        );
        const score = haystack.startsWith(normalizedQuery)
          ? 3
          : haystack.includes(normalizedQuery)
            ? 2
            : 0;

        return { product, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map((item) => item.product);
  }, [products, query]);

  const runSearch = (value: string) => {
    const nextQuery = value.trim();
    if (!nextQuery) {
      return;
    }

    router.push(`/products?q=${encodeURIComponent(nextQuery)}`);
    setOpen(false);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="h-11 min-w-[9.75rem] rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground hover:border-primary/25 hover:bg-card"
          >
            <Search className="h-4.5 w-4.5" />
            <span>Buscar</span>
            <span className="sr-only">Buscar productos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="border-border bg-card sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Buscar productos</DialogTitle>
          </DialogHeader>
          <SearchPanel
            query={query}
            setQuery={setQuery}
            suggestions={suggestions}
            onSearch={runSearch}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-transparent hover:border-border"
        >
          <Search className="h-4.5 w-4.5" />
          <span className="sr-only">Buscar productos</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-[2rem] border-t border-border bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>Buscar productos</SheetTitle>
        </SheetHeader>
        <SearchPanel
          query={query}
          setQuery={setQuery}
          suggestions={suggestions}
          onSearch={runSearch}
        />
      </SheetContent>
    </Sheet>
  );
}
