import Link from "next/link";
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
    <nav
      className="hidden lg:flex lg:flex-1 lg:items-center lg:gap-6 lg:justify-start xl:gap-8"
      aria-label="Categorías principales"
    >
      {links.map((link) => {
        const url = new URL(link.href, "https://laguarida.local");
        const active = pathname === url.pathname;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group relative py-2 text-[0.95rem] font-semibold uppercase tracking-[0.18em] text-foreground/82 transition-colors hover:text-foreground",
              active && "text-foreground",
            )}
          >
            {link.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100",
                active && "scale-x-100",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
