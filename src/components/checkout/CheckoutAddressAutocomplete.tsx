"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ParsedGoogleCheckoutAddress } from "@/components/checkout/GooglePlaceAutocompleteElement";

type PlaceSuggestion = {
  placeId: string;
  label: string;
};

type Props = {
  onAddressSelected: (address: ParsedGoogleCheckoutAddress) => void;
  disabled?: boolean;
  defaultValue?: string;
  onReady?: () => void;
  onError?: (message: string) => void;
};

function getSuggestionLabel(suggestion: {
  placePrediction?: {
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
    place?: string;
    placeId?: string;
  };
}): PlaceSuggestion | null {
  const prediction = suggestion.placePrediction;
  if (!prediction) {
    return null;
  }

  const placeId = prediction.place || prediction.placeId;
  if (!placeId) {
    return null;
  }

  const mainText = prediction.structuredFormat?.mainText?.text?.trim();
  const secondaryText = prediction.structuredFormat?.secondaryText?.text?.trim();
  const fallbackText = prediction.text?.text?.trim();
  const label =
    [mainText, secondaryText].filter(Boolean).join(", ") ||
    fallbackText ||
    "";

  if (!label) {
    return null;
  }

  return { placeId, label };
}

export function CheckoutAddressAutocomplete({
  onAddressSelected,
  disabled = false,
  defaultValue = "",
  onReady,
  onError,
}: Props) {
  const listboxId = useId();
  const sessionTokenRef = useRef(crypto.randomUUID());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectionCommittedRef = useRef(false);
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (disabled) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (selectionCommittedRef.current) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = window.setTimeout(() => {
      void fetch("/api/places/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
        }),
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            suggestions?: unknown[];
            error?: string;
          };

          if (!response.ok) {
            throw new Error(payload.error || "No se pudo buscar la direccion.");
          }

          const nextSuggestions = (payload.suggestions ?? [])
            .map((item) =>
              getSuggestionLabel(
                item as Parameters<typeof getSuggestionLabel>[0],
              ),
            )
            .filter((item): item is PlaceSuggestion => Boolean(item));

          setSuggestions(nextSuggestions);
          setIsOpen(nextSuggestions.length > 0);
          setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
          setErrorMessage(null);
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo buscar la direccion.";
          setSuggestions([]);
          setIsOpen(false);
          setErrorMessage(message);
          onError?.(message);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [disabled, onError, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const selectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion) => {
      selectionCommittedRef.current = true;
      setIsSelecting(true);
      setErrorMessage(null);
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);
      setQuery(suggestion.label);

      try {
        const response = await fetch("/api/places/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placeId: suggestion.placeId,
            sessionToken: sessionTokenRef.current,
          }),
        });

        const payload = (await response.json()) as {
          address?: ParsedGoogleCheckoutAddress;
          error?: string;
        };

        if (!response.ok || !payload.address) {
          throw new Error(payload.error || "No se pudo obtener la direccion.");
        }

        sessionTokenRef.current = crypto.randomUUID();
        onAddressSelected(payload.address);
      } catch (error: unknown) {
        selectionCommittedRef.current = false;
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo obtener la direccion.";
        setErrorMessage(message);
        onError?.(message);
      } finally {
        setIsSelecting(false);
      }
    },
    [onAddressSelected, onError],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current + 1 >= suggestions.length ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current - 1 < 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          disabled={disabled || isSelecting}
          placeholder="Busca tu direccion en Mexico"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          onChange={(event) => {
            selectionCommittedRef.current = false;
            setQuery(event.target.value);
            setErrorMessage(null);
          }}
          onFocus={() => {
            if (!selectionCommittedRef.current && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        {isSearching || isSelecting ? (
          <Loader2
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : null}
      </div>

      {isOpen && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-[1rem] border border-border bg-card py-1 shadow-[0_18px_40px_-24px_rgb(8_14_11_/_0.35)]"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.placeId}-${index}`} role="presentation">
              <button
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={cn(
                  "flex w-full px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted",
                  activeIndex === index && "bg-muted",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  void selectSuggestion(suggestion);
                }}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
