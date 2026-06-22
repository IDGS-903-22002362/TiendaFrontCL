"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type LucideIcon,
  Heart,
  Home,
  Package2,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matches: (
    pathname: string,
    searchParams: ReturnType<typeof useSearchParams>,
  ) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    matches: (pathname: string) => pathname === "/",
  },
  {
    href: "/products",
    label: "Shop",
    icon: Package2,
    matches: (pathname: string, searchParams) =>
      pathname === "/products" && searchParams.get("wishlist") !== "1",
  },
  {
    href: "/products?wishlist=1",
    label: "Wish",
    icon: Heart,
    matches: (pathname: string, searchParams) =>
      pathname === "/products" && searchParams.get("wishlist") === "1",
  },
  {
    href: "/cart",
    label: "Bag",
    icon: ShoppingBag,
    matches: (pathname: string) => pathname === "/cart",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const { showFavoritesNav, wishlistIds } = useStorefront();
  const accountHref = isAuthenticated ? "/profile" : "/login";

  const items: NavItem[] = [
    ...navItems.filter((item) => item.label !== "Wish" || showFavoritesNav),
    {
      href: accountHref,
      label: "Cuenta",
      icon: UserRound,
      matches: (value: string) => value === "/profile" || value === "/login",
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[rgb(248_242_233_/_0.96)] px-3 pt-2 shadow-[0_-16px_34px_-28px_rgb(10_14_11_/_0.34)] backdrop-blur-xl md:hidden"
      aria-label="Navegación principal móvil"
    >
      <div
        className={cn(
          "mx-auto grid max-w-xl gap-1 rounded-[1.4rem] border border-border/70 bg-card/72 p-1.5 pb-[calc(env(safe-area-inset-bottom)+0.4rem)]",
          showFavoritesNav ? "grid-cols-5" : "grid-cols-4",
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches(pathname, searchParams);
          const badgeCount =
            item.label === "Bag"
              ? totalItems
              : item.label === "Wish"
                ? wishlistIds.length
                : 0;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center rounded-[1rem] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-[color,background-color,transform]",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <div className="relative">
                <Icon className="h-4.5 w-4.5" />
                {badgeCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-semibold text-secondary-foreground shadow-[var(--shadow-card)]">
                    {Math.min(badgeCount, 99)}
                  </span>
                ) : null}
              </div>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
