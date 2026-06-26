"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  fetchCatalogPage,
  getRecientesCatalogQuery,
} from "@/lib/api/storefront";
import type { CatalogProductCard } from "@/lib/types";
import { formatCurrency } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SearchDrawerProps = {
  isDesktop: boolean;
};

type SearchSuggestion = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  price: number;
  originalPrice: number;
  hasOffer: boolean;
  available: boolean;
};

const FALLBACK_IMAGE = "/images/leon.png";
const SUGGESTION_LIST_ID = "search-suggestions-listbox";

function mapCatalogItemToSuggestion(item: CatalogProductCard): SearchSuggestion {
  return {
    id: item.id,
    name: item.nombre,
    category: item.categoriaLabel || item.lineaLabel || item.categoria,
    image: item.imagenPrincipal,
    price: item.precioFinal,
    originalPrice: item.precioOriginal,
    hasOffer: item.tieneOferta,
    available: item.disponible,
  };
}

function SearchSuggestionSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

function SearchSuggestionItem({
  suggestion,
  isActive,
  optionId,
  onSelect,
}: {
  suggestion: SearchSuggestion;
  isActive: boolean;
  optionId: string;
  onSelect: () => void;
}) {
  const imageSrc = suggestion.image?.trim() || FALLBACK_IMAGE;

  return (
    <button
      type="button"
      role="option"
      id={optionId}
      aria-selected={isActive}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 border-b border-black/8 px-3 py-2.5 text-left transition-colors last:border-b-0",
        isActive ? "bg-muted/60" : "hover:bg-muted/50",
        !suggestion.available && "opacity-75",
      )}
    >
      <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-[#f2f3ee]">
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="52px"
          className="object-contain"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {suggestion.name}
        </p>
        <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {suggestion.category}
        </p>
        {!suggestion.available ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Agotado</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-foreground">
          {formatCurrency(suggestion.price)}
        </p>
        {suggestion.hasOffer && suggestion.originalPrice > suggestion.price ? (
          <p className="text-[11px] text-muted-foreground line-through">
            {formatCurrency(suggestion.originalPrice)}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function SearchPanel({
  query,
  setQuery,
  suggestions,
  isLoadingSuggestions,
  activeIndex,
  setActiveIndex,
  inputRef,
  onSearch,
  onSelectProduct,
  variant,
  className,
}: {
  query: string;
  setQuery: (value: string) => void;
  suggestions: SearchSuggestion[];
  isLoadingSuggestions: boolean;
  activeIndex: number;
  setActiveIndex: (value: number | ((current: number) => number)) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSearch: (value: string) => void;
  onSelectProduct: (suggestion: SearchSuggestion) => void;
  variant: "desktop" | "mobile";
  className?: string;
}) {
  const trimmedQuery = query.trim();
  const showViewAll = Boolean(trimmedQuery) && suggestions.length > 0;

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      setActiveIndex((current) =>
        current < suggestions.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      onSelectProduct(suggestions[activeIndex]);
    }
  };

  return (
    <form
      className={cn("flex flex-col", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          onSelectProduct(suggestions[activeIndex]);
          return;
        }
        onSearch(query);
      }}
    >
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-text-muted" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Busca jerseys, gorras y piezas oficiales"
          className="h-12 pl-11 pr-10"
          role="combobox"
          aria-expanded={suggestions.length > 0 || isLoadingSuggestions}
          aria-controls={SUGGESTION_LIST_ID}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "editorial-panel mt-3 flex min-h-0 flex-col overflow-hidden p-2",
          variant === "mobile" && "flex-1",
        )}
      >
        <p className="shrink-0 px-2 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/76">
          {trimmedQuery ? "Sugerencias" : "Recientes"}
        </p>

        <ScrollArea
          className={cn(
            variant === "desktop"
              ? "max-h-[min(420px,60vh)]"
              : "min-h-0 flex-1",
          )}
        >
          <div
            id={SUGGESTION_LIST_ID}
            role="listbox"
            aria-label={trimmedQuery ? "Sugerencias de búsqueda" : "Productos recientes"}
            className="space-y-0"
          >
            {isLoadingSuggestions ? (
              Array.from({ length: 4 }).map((_, index) => (
                <SearchSuggestionSkeleton key={index} />
              ))
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                {trimmedQuery
                  ? "Sin coincidencias. Prueba con otra palabra o revisa el catálogo completo."
                  : "Escribe para ver sugerencias del catálogo."}
              </p>
            ) : (
              suggestions.map((product, index) => (
                <SearchSuggestionItem
                  key={product.id}
                  suggestion={product}
                  isActive={activeIndex === index}
                  optionId={`search-suggestion-${product.id}`}
                  onSelect={() => onSelectProduct(product)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {showViewAll ? (
          <button
            type="button"
            onClick={() => onSearch(query)}
            className="mt-2 shrink-0 border-t border-black/8 px-3 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-muted/40"
          >
            Ver todos los resultados para &ldquo;{trimmedQuery}&rdquo;
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function SearchDrawer({ isDesktop }: SearchDrawerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setSuggestions([]);
      setActiveIndex(-1);
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmedQuery = query.trim();
    const timer = globalThis.setTimeout(async () => {
      setIsLoadingSuggestions(true);

      try {
        const catalogQuery = trimmedQuery
          ? getRecientesCatalogQuery(8, { q: trimmedQuery })
          : getRecientesCatalogQuery(6);

        const response = await fetchCatalogPage(catalogQuery);
        setSuggestions(response.items.map(mapCatalogItemToSuggestion));
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setActiveIndex(-1);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [open, query]);

  const runSearch = (value: string) => {
    const nextQuery = value.trim();
    if (!nextQuery) {
      return;
    }

    router.push(`/products?q=${encodeURIComponent(nextQuery)}`);
    handleOpenChange(false);
  };

  const selectProduct = (suggestion: SearchSuggestion) => {
    router.push(`/products/${suggestion.id}`);
    handleOpenChange(false);
  };

  const panelProps = {
    query,
    setQuery,
    suggestions,
    isLoadingSuggestions,
    activeIndex,
    setActiveIndex,
    inputRef,
    onSearch: runSearch,
    onSelectProduct: selectProduct,
  };

  const triggerButton = isDesktop ? (
    <Button
      variant="outline"
      className="h-[48px] w-[260px] justify-between border-black/14 bg-white px-4 text-sm font-medium text-foreground lg:w-[340px]"
    >
      <span className="flex items-center gap-3">
        <Search className="h-4.5 w-4.5 text-text-secondary" />
        <span>Buscar</span>
      </span>
      <span className="hidden border border-black/14 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted md:inline-flex">
        Catálogo
      </span>
      <span className="sr-only">Buscar productos</span>
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon"
      className="h-11 min-h-[44px] min-w-[44px] w-11 border-black/14 bg-white"
    >
      <Search className="h-4.5 w-4.5" />
      <span className="sr-only">Buscar productos</span>
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[440px] border-black/14 bg-white p-4 shadow-[0_24px_48px_-32px_rgb(8_12_10_/_0.28)]"
        >
          <p className="mb-3 text-sm font-semibold text-foreground">
            Buscar productos
          </p>
          <SearchPanel {...panelProps} variant="desktop" />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[85dvh] flex-col border-t border-black/14 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <SheetHeader className="mb-4 shrink-0 text-left">
          <SheetTitle>Buscar productos</SheetTitle>
        </SheetHeader>
        <SearchPanel
          {...panelProps}
          variant="mobile"
          className="min-h-0 flex-1"
        />
      </SheetContent>
    </Sheet>
  );
}
