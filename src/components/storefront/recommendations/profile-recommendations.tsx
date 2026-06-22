"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecommendationSection } from "@/components/storefront/recommendations/recommendation-section";
import {
  clearRecentlyViewedHistory,
  fetchAccountRecommendations,
  fetchBuyAgainRecommendations,
  fetchRecentlyViewedRecommendations,
  type RecommendationSectionResponse,
} from "@/lib/api/recommendations";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api/errors";

type LoadedSection = {
  key: string;
  data: RecommendationSectionResponse | null;
  error: string | null;
  isLoading: boolean;
};

function emptySection(key: string): LoadedSection {
  return { key, data: null, error: null, isLoading: true };
}

export function ProfileRecommendations() {
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [recent, setRecent] = useState<LoadedSection>(emptySection("recent"));
  const [buyAgain, setBuyAgain] = useState<LoadedSection>(emptySection("buyAgain"));
  const [forYou, setForYou] = useState<LoadedSection>(emptySection("forYou"));
  const [isClearing, setIsClearing] = useState(false);

  const loadRecent = useCallback(async () => {
    setRecent((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetchRecentlyViewedRecommendations(token);
      setRecent({ key: "recent", data, error: null, isLoading: false });
    } catch (error) {
      setRecent({
        key: "recent",
        data: null,
        error: getApiErrorMessage(error),
        isLoading: false,
      });
    }
  }, [token]);

  const loadBuyAgain = useCallback(async () => {
    if (!token) {
      setBuyAgain({ key: "buyAgain", data: null, error: null, isLoading: false });
      return;
    }

    setBuyAgain((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetchBuyAgainRecommendations(token);
      setBuyAgain({ key: "buyAgain", data, error: null, isLoading: false });
    } catch (error) {
      setBuyAgain({
        key: "buyAgain",
        data: null,
        error: getApiErrorMessage(error),
        isLoading: false,
      });
    }
  }, [token]);

  const loadForYou = useCallback(async () => {
    if (!token) {
      setForYou({ key: "forYou", data: null, error: null, isLoading: false });
      return;
    }

    setForYou((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetchAccountRecommendations(token);
      setForYou({ key: "forYou", data, error: null, isLoading: false });
    } catch (error) {
      setForYou({
        key: "forYou",
        data: null,
        error: getApiErrorMessage(error),
        isLoading: false,
      });
    }
  }, [token]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    void loadBuyAgain();
  }, [loadBuyAgain]);

  useEffect(() => {
    void loadForYou();
  }, [loadForYou]);

  async function onClearHistory() {
    setIsClearing(true);
    try {
      const result = await clearRecentlyViewedHistory(token);
      toast({
        title: "Historial limpiado",
        description: `Se eliminaron ${result.deleted} eventos de navegación.`,
      });
      await loadRecent();
      await loadForYou();
    } catch (error) {
      toast({
        title: "No se pudo limpiar el historial",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  }

  const hasRecent = Boolean(recent.data?.items.length);
  const hasBuyAgain = Boolean(buyAgain.data?.items.length);
  const hasForYou = Boolean(forYou.data?.items.length);
  const showEmptyState =
    !recent.isLoading &&
    !buyAgain.isLoading &&
    !forYou.isLoading &&
    !hasRecent &&
    (!isAuthenticated || (!hasBuyAgain && !hasForYou));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline text-xl font-semibold uppercase tracking-wide">
            Para ti
          </h2>
          <p className="text-sm text-muted-foreground">
            Recomendaciones basadas en tu actividad y compras en La Guarida.
          </p>
        </div>
        {hasRecent ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isClearing}
            onClick={() => void onClearHistory()}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {isClearing ? "Limpiando..." : "Limpiar vistos recientemente"}
          </Button>
        ) : null}
      </div>

      <RecommendationSection
        title={recent.data?.titulo ?? "Vistos recientemente"}
        subtitle={recent.data?.subtitulo}
        items={recent.data?.items}
        estrategia={recent.data?.estrategia ?? "recientemente_vistos"}
        superficie="cuenta"
        isLoading={recent.isLoading}
        error={recent.error}
        contained={false}
      />

      {isAuthenticated ? (
        <>
          <RecommendationSection
            title={buyAgain.data?.titulo ?? "Comprar nuevamente"}
            subtitle={buyAgain.data?.subtitulo ?? "Productos de tus pedidos anteriores"}
            items={buyAgain.data?.items}
            estrategia={buyAgain.data?.estrategia ?? "comprar_nuevamente"}
            superficie="cuenta"
            isLoading={buyAgain.isLoading}
            error={buyAgain.error}
            contained={false}
          />

          <RecommendationSection
            title={forYou.data?.titulo ?? "Recomendaciones para ti"}
            subtitle={forYou.data?.subtitulo ?? "Basadas en tus compras y preferencias"}
            items={forYou.data?.items}
            estrategia={forYou.data?.estrategia ?? "para_ti"}
            superficie="cuenta"
            isLoading={forYou.isLoading}
            error={forYou.error}
            contained={false}
          />
        </>
      ) : null}

      {showEmptyState ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Explora el catálogo para empezar a ver recomendaciones personalizadas.
        </p>
      ) : null}
    </div>
  );
}
