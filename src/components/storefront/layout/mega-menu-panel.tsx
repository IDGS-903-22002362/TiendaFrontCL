"use client";

import Link from "next/link";
import type { NavSection } from "@/lib/storefront/navigation";
import { cn } from "@/lib/utils";

type MegaMenuPanelProps = {
  section: NavSection | null;
  isVisible: boolean;
  onNavigate: () => void;
  panelId: string;
};

function getColumnsLayoutClass(columnCount: number): string {
  if (columnCount <= 2) {
    return "max-w-4xl gap-x-16 gap-y-8 lg:gap-x-24 xl:max-w-5xl xl:gap-x-28";
  }

  if (columnCount === 3) {
    return "max-w-5xl gap-x-12 gap-y-8 lg:gap-x-16 xl:max-w-6xl xl:gap-x-20";
  }

  return "max-w-6xl gap-x-10 gap-y-8 lg:max-w-7xl lg:gap-x-14 xl:gap-x-16";
}

export function MegaMenuPanel({
  section,
  isVisible,
  onNavigate,
  panelId,
}: MegaMenuPanelProps) {
  const columnCount = section?.columns.length ?? 0;

  return (
    <div
      id={panelId}
      role="region"
      aria-hidden={!isVisible || !section}
      aria-label={section ? `Menú ${section.label}` : "Menú de catálogo"}
      className={cn(
        "absolute inset-x-0 top-full border-t border-border/80 bg-background shadow-[0_18px_40px_-28px_rgb(8_12_10_/_0.35)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        isVisible && section
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0",
      )}
    >
      {section ? (
        <div className="px-6 py-8 md:px-10 md:py-10 lg:px-12 xl:px-16">
          <div
            className={cn(
              "mx-auto flex w-full flex-wrap justify-center",
              getColumnsLayoutClass(columnCount),
            )}
            key={section.id}
          >
            {section.columns.map((column) => (
              <div
                key={`${section.id}-${column.title}`}
                className="w-[11.5rem] shrink-0 sm:w-[12rem] lg:w-[13rem]"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                  {column.title}
                </p>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onNavigate}
                        className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                {column.viewAllHref ? (
                  <Link
                    href={column.viewAllHref}
                    onClick={onNavigate}
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Ver todo
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}