"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, ShoppingBag, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DesktopNav } from "./desktop-nav";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { SearchDrawer } from "./search-drawer";
import { UtilityBar } from "./utility-bar";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/products", label: "Todos los productos" },
  { href: "/products?category=jerseys", label: "Jerseys" },
  { href: "/products?tag=new", label: "Novedades" },
  { href: "/products?tag=sale", label: "Ofertas" },
  { href: "/products?category=accesorios", label: "Accesorios" },
];

export function StorefrontHeader() {
  const pathname = usePathname();
  const { role, isAuthenticated, clearSession, user } = useAuth();
  const { totalItems } = useCart();
  const { wishlistIds } = useStorefront();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const shellRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateDesktop = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    updateDesktop(mediaQuery);
    mediaQuery.addEventListener("change", updateDesktop);
    return () => mediaQuery.removeEventListener("change", updateDesktop);
  }, []);

  useEffect(() => {
    const updateOnScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;
      const isNearTop = currentScrollY < 24;

      setIsCompact(currentScrollY > 18);

      if (isNearTop) {
        setIsVisible(true);
      } else if (delta > 8) {
        setIsVisible(false);
      } else if (delta < -8) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (tickingRef.current) {
        return;
      }

      tickingRef.current = true;
      window.requestAnimationFrame(updateOnScroll);
    };

    updateOnScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !shellRef.current) {
      return;
    }

    const shellElement = shellRef.current;
    const rootStyle = document.documentElement.style;
    let frameId = 0;

    const publishHeight = () => {
      const shellRect = shellElement.getBoundingClientRect();
      const reservedHeight = Math.round(shellRect.height);
      const currentHeight = Math.round(
        Math.max(0, Math.min(shellRect.height, shellRect.bottom)),
      );

      rootStyle.setProperty("--storefront-header-reserved-height", `${reservedHeight}px`);
      rootStyle.setProperty(
        "--storefront-header-current-height",
        `${currentHeight}px`,
      );
    };

    const syncHeaderHeight = (duration = 380) => {
      const startedAt = window.performance.now();

      const step = (timestamp: number) => {
        publishHeight();
        if (timestamp - startedAt < duration) {
          frameId = window.requestAnimationFrame(step);
        }
      };

      window.cancelAnimationFrame(frameId);
      publishHeight();
      frameId = window.requestAnimationFrame(step);
    };

    syncHeaderHeight();

    const resizeObserver = new ResizeObserver(() => {
      syncHeaderHeight(220);
    });
    const handleTransitionRun = () => syncHeaderHeight();

    resizeObserver.observe(shellElement);
    shellElement.addEventListener("transitionrun", handleTransitionRun);
    shellElement.addEventListener("transitionend", publishHeight);
    window.addEventListener("resize", publishHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      shellElement.removeEventListener("transitionrun", handleTransitionRun);
      shellElement.removeEventListener("transitionend", publishHeight);
      window.removeEventListener("resize", publishHeight);
    };
  }, [isCompact, isVisible, pathname]);

  const desktopLinks = useMemo(
    () => navLinks.map((link) => ({ ...link, href: link.href })),
    [],
  );

  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin") || pathname.startsWith("/empleado-club")) {
    return null;
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div
        className={cn(
          "border-b border-border/80 bg-[rgb(248_246_240_/_0.92)] shadow-[0_18px_38px_-34px_rgb(19_22_18_/_0.28)] backdrop-blur-xl transition-[background-color,box-shadow]",
          isCompact && "bg-[rgb(248_246_240_/_0.98)] shadow-[0_16px_34px_-28px_rgb(19_22_18_/_0.24)]",
        )}
      >
        <UtilityBar compact={isCompact} />
        <div
          className={cn(
            "storefront-frame flex items-center gap-6 transition-[height,padding] duration-300",
            isCompact ? "h-[4.75rem]" : "h-[5.5rem]",
          )}
        >
          <div className="flex shrink-0 items-center gap-2 lg:w-[8rem] lg:gap-5">
            <MobileNavDrawer
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-transparent lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              }
              links={navLinks}
              isAuthenticated={isAuthenticated}
              role={role}
              email={user?.email}
              onLogout={() => void clearSession()}
            />
            <Link href="/" className="flex items-center" aria-label="La Guarida inicio">
              <Logo
                className={cn(
                  "w-auto object-contain transition-[height] duration-300",
                  isCompact ? "h-9 md:h-10 lg:h-11" : "h-10 md:h-12 lg:h-[3.25rem]",
                )}
              />
            </Link>
          </div>

          <DesktopNav pathname={pathname} links={desktopLinks} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2 lg:min-w-[18rem] lg:justify-end">
            <SearchDrawer isDesktop={isDesktop} />

            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative hidden h-10 w-10 rounded-full border border-transparent hover:border-border lg:inline-flex"
            >
                <Link href="/products?wishlist=1">
                  <Heart className="h-4.5 w-4.5" />
                {wishlistIds.length > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {Math.min(wishlistIds.length, 99)}
                  </span>
                ) : null}
                <span className="sr-only">Favoritos</span>
              </Link>
            </Button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-10 w-10 rounded-full border border-transparent hover:border-border md:inline-flex"
                  >
                    <UserRound className="h-4.5 w-4.5" />
                    <span className="sr-only">Cuenta</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-medium text-foreground">{user?.email}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {role}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Mi perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/order-history">Mis pedidos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/ai">Asistente AI</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => void clearSession()}
                  >
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden h-10 w-10 rounded-full border border-transparent hover:border-border md:inline-flex"
              >
                <Link href="/login">
                  <UserRound className="h-4.5 w-4.5" />
                  <span className="sr-only">Iniciar sesión</span>
                </Link>
              </Button>
            )}

            <div className="hidden md:block">
              <CartDrawer />
            </div>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full border border-transparent lg:hidden"
            >
              <Link href="/cart">
                <ShoppingBag className="h-4.5 w-4.5" />
                {totalItems > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {Math.min(totalItems, 99)}
                  </span>
                ) : null}
                <span className="sr-only">Carrito</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
