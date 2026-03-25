"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Package2, ShoppingBag, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { cn } from "@/lib/utils";

const navItems = [
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
    matches: (pathname: string) => pathname === "/products",
  },
  {
    href: "/products?wishlist=1",
    label: "Wish",
    icon: Heart,
    matches: (pathname: string) => pathname === "/products",
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
  const { isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const { wishlistIds } = useStorefront();
  const accountHref = isAuthenticated ? "/profile" : "/login";

  const items = [
    ...navItems,
    {
      href: accountHref,
      label: "Cuenta",
      icon: UserRound,
      matches: (value: string) => value === "/profile" || value === "/login",
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[rgb(251_249_243_/_0.98)] px-3 pt-2 shadow-[0_-10px_30px_-24px_rgb(23_24_21_/_0.18)] backdrop-blur-xl md:hidden"
      aria-label="Navegación principal móvil"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches(pathname);
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
                "relative flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <div className="relative">
                <Icon className="h-4.5 w-4.5" />
                {badgeCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-semibold text-secondary-foreground">
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
