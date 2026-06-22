import { useCallback, useEffect, useMemo, useState } from "react";
import { productsAdminApi } from "@/lib/api/products-admin";
import type { EntityOption } from "@/components/admin/entity-picker";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function mergeProductNameMap(
  current: Map<string, string>,
  options: EntityOption[],
): Map<string, string> {
  const next = new Map(current);
  options.forEach((option) => {
    next.set(option.id, option.label);
  });
  return next;
}

function mapProductsToOptions(
  products: Array<{
    id: string;
    clave?: string;
    descripcion?: string;
  }>,
): EntityOption[] {
  return products.map((product) => ({
    id: product.id,
    label: product.descripcion?.trim() || product.clave || product.id,
    subtitle: product.clave ? `Clave: ${product.clave}` : undefined,
    searchKey: `${product.clave ?? ""} ${product.descripcion ?? ""}`.trim(),
  }));
}

export function useAdminProductSearch(token?: string | null) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedToken = useMemo(() => {
    if (!token || token === "cookie-session") {
      return undefined;
    }
    return token;
  }, [token]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setOptions([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const products = await productsAdminApi.searchAdminProducts(
            trimmed,
            normalizedToken,
          );
          if (cancelled) return;
          setOptions(mapProductsToOptions(products));
        } catch {
          if (cancelled) return;
          setOptions([]);
          setError("No se pudieron buscar productos.");
        } finally {
          if (!cancelled) {
            setIsSearching(false);
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedToken, query]);

  const resetSearch = useCallback(() => {
    setQuery("");
    setOptions([]);
    setError(null);
    setIsSearching(false);
  }, []);

  return {
    query,
    setQuery,
    options,
    isSearching,
    error,
    minQueryLength: MIN_QUERY_LENGTH,
    resetSearch,
  };
}