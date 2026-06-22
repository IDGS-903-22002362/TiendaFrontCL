"use client";

import { useEffect, useState } from "react";
import { fetchProductRecommendations } from "@/lib/api/recommendations";
import { RecommendationSection } from "./recommendation-section";
import { useAuth } from "@/hooks/use-auth";

export function ProductRecommendations({ productId }: { productId: string }) {
  const { token } = useAuth();
  const [similares, setSimilares] = useState<Awaited<ReturnType<typeof fetchProductRecommendations>>["similares"] | null>(null);
  const [compradosJuntos, setCompradosJuntos] = useState<Awaited<ReturnType<typeof fetchProductRecommendations>>["compradosJuntos"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchProductRecommendations(productId, token);
        if (!cancelled) {
          setSimilares(data.similares);
          setCompradosJuntos(data.compradosJuntos);
        }
      } catch {
        if (!cancelled) {
          setSimilares(null);
          setCompradosJuntos(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [productId, token]);

  return (
    <div className="space-y-10 md:space-y-14">
      <RecommendationSection
        title={similares?.titulo || "Productos similares"}
        subtitle={similares?.subtitulo}
        items={similares?.items}
        estrategia="similares"
        seccionId={similares?.seccionId}
        superficie="producto"
        isLoading={isLoading}
        contained={false}
      />
      <RecommendationSection
        title={compradosJuntos?.titulo || "Frecuentemente comprados juntos"}
        subtitle={compradosJuntos?.subtitulo}
        items={compradosJuntos?.items}
        estrategia="comprados_juntos"
        seccionId={compradosJuntos?.seccionId}
        superficie="producto"
        isLoading={isLoading}
        contained={false}
      />
    </div>
  );
}
