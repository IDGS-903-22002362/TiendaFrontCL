"use client";

import Link from "next/link";
import {
  sectionHasMegaMenu,
  type NavSection,
} from "@/lib/storefront/navigation";
import { cn } from "@/lib/utils";

type DesktopNavProps = {
  pathname: string;
  sections: NavSection[];
  activeSectionId: string | null;
  isMegaMenuOpen: boolean;
  megaMenuPanelId: string;
  onSectionIntent: (sectionId: string, immediate?: boolean) => void;
  onNavEnter: () => void;
  onNavLeave: () => void;
  onNavigate: () => void;
};

function isSectionActive(pathname: string, section: NavSection): boolean {
  if (pathname === section.href) {
    return true;
  }

  try {
    const sectionUrl = new URL(section.href, "https://laguarida.local");
    const currentUrl = new URL(pathname, "https://laguarida.local");

    if (sectionUrl.pathname !== currentUrl.pathname) {
      return false;
    }

    for (const [key, value] of sectionUrl.searchParams.entries()) {
      if (currentUrl.searchParams.get(key) !== value) {
        return false;
      }
    }

    return sectionUrl.search.length > 0;
  } catch {
    return pathname.startsWith(section.href);
  }
}

export function DesktopNav({
  pathname,
  sections,
  activeSectionId,
  isMegaMenuOpen,
  megaMenuPanelId,
  onSectionIntent,
  onNavEnter,
  onNavLeave,
  onNavigate,
}: DesktopNavProps) {
  return (
    <nav
      className="relative hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:gap-7 xl:gap-9"
      aria-label="Navegación principal"
      onMouseEnter={onNavEnter}
      onMouseLeave={onNavLeave}
    >
      <ul className="flex items-center gap-7 xl:gap-9">
        {sections.map((section) => {
          const active = isSectionActive(pathname, section);
          const hasMegaMenu = sectionHasMegaMenu(section);
          const isCurrentMega =
            isMegaMenuOpen && activeSectionId === section.id;

          return (
            <li key={section.id} className="list-none">
              {hasMegaMenu ? (
                <button
                  type="button"
                  className={cn(
                    "group relative py-3 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-foreground/72 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    (active || isCurrentMega) && "text-foreground",
                  )}
                  aria-expanded={isCurrentMega}
                  aria-controls={megaMenuPanelId}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => onSectionIntent(section.id, isMegaMenuOpen)}
                  onFocus={() => onSectionIntent(section.id, true)}
                >
                  {section.label}
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100",
                      (active || isCurrentMega) && "scale-x-100",
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={section.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative inline-flex py-3 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-foreground/72 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active && "text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {section.label}
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100",
                      active && "scale-x-100",
                    )}
                  />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
