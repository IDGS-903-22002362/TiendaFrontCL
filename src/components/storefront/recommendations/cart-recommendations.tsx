"use client";

import { useEffect, useState } from "react";
import { fetchCartRecommendations } from "@/lib/api/recommendations";
import { RecommendationSection } from "./recommendation-section";
import { useAuth } from "@/hooks/use-auth";

export function CartRecommendations({ productIds }: { productIds: string[] }) {
  const { token } = useAuth();
  const [section, setSection] = useState<Awaited<ReturnType<typeof fetchCartRecommendations>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productIds.length === 0) {
      setSection(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchCartRecommendations(productIds, token);
        if (!cancelled) {
          setSection(data);
        }
      } catch {
        if (!cancelled) {
          setSection(null);
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
  }, [productIds.join(","), token]);

  return (
    <RecommendationSection
      title={section?.titulo || "Completa tu carrito"}
      subtitle={section?.subtitulo}
      items={section?.items}
      estrategia="complementos_carrito"
      superficie="carrito"
      isLoading={isLoading}
    />
  );
}
