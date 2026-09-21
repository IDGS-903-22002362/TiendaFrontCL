"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GeminiSparkleProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  animated?: boolean;
  withHalo?: boolean;
}

const SIZES = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
};

export function GeminiSparkle({
  className,
  size = "md",
  animated = false,
  withHalo = false,
}: GeminiSparkleProps) {
  const pixelSize = typeof size === "number" ? size : SIZES[size] || 22;
  const gradientId = React.useId();
  const filterId = React.useId();

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        withHalo && "p-1.5 rounded-full bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-amber-500/15 ring-1 ring-emerald-500/20",
        className,
      )}
      style={{ width: withHalo ? pixelSize + 12 : pixelSize, height: withHalo ? pixelSize + 12 : pixelSize }}
    >
      {withHalo && (
        <span
          className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/20 via-indigo-500/15 to-amber-400/20 blur-sm animate-gemini-pulse-glow"
          aria-hidden="true"
        />
      )}
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "relative z-10 transition-transform duration-300",
          animated && "animate-gemini-sparkle-spin",
        )}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="35%" stopColor="#0d9488" />
            <stop offset="70%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="1.5"
              floodColor="#10b981"
              floodOpacity="0.25"
            />
          </filter>
        </defs>
        {/* Iconic Gemini 4-pointed curved star shape */}
        <path
          d="M12 1.5C12 7.29899 7.29899 12 1.5 12C7.29899 12 12 16.701 12 22.5C12 16.701 16.701 12 22.5 12C16.701 12 12 7.29899 12 1.5Z"
          fill={`url(#${gradientId})`}
          filter={`url(#${filterId})`}
        />
        {/* Subtle center highlight */}
        <circle cx="12" cy="12" r="1.5" fill="#ffffff" fillOpacity="0.75" />
      </svg>
    </span>
  );
}
