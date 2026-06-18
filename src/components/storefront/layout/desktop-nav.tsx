"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
};

export function DesktopNav({
  pathname,
  links,
}: {
  pathname: string;
  links: NavLink[];
}) {
  return (
    <Suspense fallback={<DesktopNavFallback pathname={pathname} links={links} />}>
      <DesktopNavContent pathname={pathname} links={links} />
    </Suspense>
  );
}

function DesktopNavContent({
  pathname,
  links,
}: {
  pathname: string;
  links: NavLink[];
}) {
  const searchParams = useSearchParams();

  return (
    <nav
      className="hidden lg:flex lg:flex-1 lg:items-center lg:gap-6 lg:justify-start xl:gap-8"
      aria-label="Categorías principales"
    >
      {links.map((link) => {
        const url = new URL(link.href, "https://laguarida.local");
        let active = pathname === url.pathname;

        if (active) {
          if (url.search) {
            const linkParams = new URLSearchParams(url.search);
            linkParams.forEach((value, key) => {
              if (searchParams.get(key) !== value) {
                active = false;
              }
            });
          } else {
            if (searchParams.has("category") || searchParams.has("tag")) {
              active = false;
            }
          }
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group relative py-3 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-foreground/72 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active && "text-foreground",
            )}
          >
            {link.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100",
                active && "scale-x-100",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

function DesktopNavFallback({
  pathname,
  links,
}: {
  pathname: string;
  links: NavLink[];
}) {
  return (
    <nav
      className="hidden lg:flex lg:flex-1 lg:items-center lg:gap-6 lg:justify-start xl:gap-8"
      aria-label="Categorías principales"
    >
      {links.map((link) => {
        const url = new URL(link.href, "https://laguarida.local");
        const active = pathname === url.pathname && !url.search;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group relative py-3 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-foreground/72 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active && "text-foreground",
            )}
          >
            {link.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100",
                active && "scale-x-100",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
