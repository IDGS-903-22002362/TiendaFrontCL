"use client";

import { useEffect, useState } from "react";
import { fetchHomeRecommendations } from "@/lib/api/recommendations";
import { RecommendationSection, getRecommendationErrorMessage } from "./recommendation-section";
import { useAuth } from "@/hooks/use-auth";

export function HomeRecommendations() {
  const { token } = useAuth();
  const [sections, setSections] = useState<Awaited<ReturnType<typeof fetchHomeRecommendations>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchHomeRecommendations(token);
        if (!cancelled) {
          setSections(data);
        }
      } catch {
        if (!cancelled) {
          setSections([]);
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
  }, [token]);

  if (isLoading) {
    return (
      <div className="space-y-10">
        <RecommendationSection title="Seleccionado para ti" isLoading contained={false} />
      </div>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {sections.map((section) => (
        <RecommendationSection
          key={section.seccionId || section.estrategia}
          title={section.titulo}
          subtitle={section.subtitulo}
          items={section.items}
          estrategia={section.estrategia}
          seccionId={section.seccionId}
          superficie="home"
          contained={false}
        />
      ))}
    </div>
  );
}
