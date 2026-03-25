"use client";

import Image from "next/image";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type FocusCardItem = {
  title: string;
  src: string;
  imageHint?: string;
};

type FocusCardProps = {
  card: FocusCardItem;
  className?: string;
  children?: React.ReactNode;
  showTitleOverlay?: boolean;
};

export const FocusCard = React.memo(
  ({ card, className, children, showTitleOverlay = true }: FocusCardProps) => (
    <div
      className={cn(
        "group/focus-card relative w-full overflow-hidden rounded-[24px] border border-border/70 bg-card transition-all duration-300 ease-out hover:shadow-[var(--shadow-elevated)] md:rounded-[28px]",
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={card.src}
          alt={card.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          data-ai-hint={card.imageHint}
        />
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,transparent_34%,rgba(247,244,235,0.92))]" />
        {showTitleOverlay ? (
          <div className="absolute inset-x-0 bottom-0 z-[2] p-4 opacity-0 transition-opacity duration-300 group-hover/focus-card:opacity-100 md:p-5">
            <p className="line-clamp-2 font-headline text-base font-semibold text-foreground md:text-lg">
              {card.title}
            </p>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  ),
);

FocusCard.displayName = "FocusCard";

export function FocusCards({ cards }: { cards: FocusCardItem[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-3 md:px-8">
      {cards.map((card, index) => (
        <div
          key={`${card.title}-${index}`}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <FocusCard
            card={card}
            className={cn(
              hoveredIndex !== null &&
                hoveredIndex !== index &&
                "blur-[1px] scale-[0.985] opacity-80",
            )}
          />
        </div>
      ))}
    </div>
  );
}
