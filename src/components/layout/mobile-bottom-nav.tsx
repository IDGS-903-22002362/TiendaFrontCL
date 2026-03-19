"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package2, ShoppingCart, ReceiptText, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
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
    label: "Catálogo",
    icon: Package2,
    matches: (pathname: string) => pathname === "/products",
  },
  {
    href: "/cart",
    label: "Carrito",
    icon: ShoppingCart,
    matches: (pathname: string) => pathname === "/cart",
  },
  {
    href: "/order-history",
    label: "Pedidos",
    icon: ReceiptText,
    matches: (pathname: string) => pathname === "/order-history",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const accountHref = isAuthenticated ? "/profile" : "/login";

  const items = [
    ...navItems,
    {
      href: accountHref,
      label: "Cuenta",
      icon: User,
      matches: (value: string) => value === "/profile" || value === "/login",
    },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background-deep/96 px-2 pt-2 backdrop-blur-xl md:hidden",
        "pb-[calc(env(safe-area-inset-bottom)+0.5rem)]",
      )}
      aria-label="Navegación principal móvil"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches(pathname);

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-[10px] font-semibold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-text-muted hover:bg-card hover:text-foreground",
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.href === "/cart" && totalItems > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-foreground">
                    {Math.min(totalItems, 99)}
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
