"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type HoverImagePreviewProps = {
  images: string[];
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  overlay?: ReactNode;
  intervalMs?: number;
};

const FALLBACK_IMAGE = "/images/leon.png";

function uniqueImages(images: string[]) {
  const seen = new Set<string>();

  return images.filter((image) => {
    const normalized = image.trim();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

export function HoverImagePreview({
  images,
  alt,
  sizes,
  className,
  imageClassName,
  overlay,
  intervalMs = 1450,
}: HoverImagePreviewProps) {
  const normalizedImages = useMemo(() => {
    const unique = uniqueImages(images);
    return unique.length > 0 ? unique : [FALLBACK_IMAGE];
  }, [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [instantSwap, setInstantSwap] = useState(false);

  useEffect(() => {
    const mediaQuery =
      typeof window !== "undefined"
        ? window.matchMedia("(hover: hover) and (pointer: fine)")
        : null;

    if (!mediaQuery) {
      return;
    }

    const sync = () => setCanHover(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);

    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setIsHovering(false);
    setInstantSwap(false);
  }, [normalizedImages]);

  useEffect(() => {
    if (!instantSwap) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setInstantSwap(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [instantSwap]);

  useEffect(() => {
    if (!canHover || !isHovering || normalizedImages.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % normalizedImages.length);
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [canHover, intervalMs, isHovering, normalizedImages]);

  const handleMouseEnter = () => {
    if (!canHover || normalizedImages.length < 2) {
      return;
    }

    setInstantSwap(true);
    setActiveIndex(1);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setInstantSwap(false);
    setActiveIndex(0);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#f2f3ee]",
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {normalizedImages.map((image, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={`${image}-${index}`}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 bg-[#f2f3ee] transition-opacity ease-out",
              instantSwap ? "duration-0" : "duration-500",
              isActive ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={image}
              alt={alt}
              fill
              sizes={sizes}
              className={cn(
                "object-contain transition-transform ease-out",
                instantSwap ? "duration-0" : "duration-700",
                canHover && isHovering ? "scale-[1.02]" : "scale-100",
                imageClassName,
              )}
            />
          </div>
        );
      })}
      {overlay}
    </div>
  );
}
