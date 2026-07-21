"use client";

import { useCallback, useEffect, useState } from "react";
import { getTryOnEligibility } from "@/lib/api/ai";
import type { TryOnEligibility } from "@/lib/ai/types";

export type TryOnEligibilityState = {
  productId?: string;
  eligibility: TryOnEligibility | null;
  isLoading: boolean;
  hasError: boolean;
  refetch?: () => void;
};

export function useTryOnEligibility(
  productId: string | undefined,
  enabled = true,
): TryOnEligibilityState {
  const [state, setState] = useState<TryOnEligibilityState>({
    eligibility: null,
    isLoading: false,
    hasError: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !productId) {
      setState({ productId, eligibility: null, isLoading: false, hasError: false });
      return;
    }

    let cancelled = false;
    setState({ productId, eligibility: null, isLoading: true, hasError: false });

    void getTryOnEligibility({ productId })
      .then((eligibility) => {
        if (!cancelled) {
          setState({ productId, eligibility, isLoading: false, hasError: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ productId, eligibility: null, isLoading: false, hasError: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, productId, refreshKey]);

  return state.productId === productId
    ? { ...state, refetch }
    : { productId, eligibility: null, isLoading: Boolean(enabled && productId), hasError: false, refetch };
}
