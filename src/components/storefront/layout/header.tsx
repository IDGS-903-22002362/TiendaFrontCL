"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, Menu, ShoppingBag, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useStorefront } from "@/hooks/use-storefront";
import { useMegaMenuIntent } from "@/hooks/use-mega-menu-intent";
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
import { MegaMenuPanel } from "./mega-menu-panel";
import { MegaMenuOverlay } from "./mega-menu-overlay";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { cn } from "@/lib/utils";
import { useIsFromMobileApp } from "@/hooks/use-from-mobile-app";
import {
  buildNavModel,
  type StorefrontNavModel,
} from "@/lib/storefront/navigation";

const FALLBACK_NAV_MODEL = buildNavModel([], []);
const MEGA_MENU_PANEL_ID = "storefront-mega-menu-panel";

type StorefrontHeaderProps = {
  navModel?: StorefrontNavModel;
};

export function StorefrontHeader({
  navModel = FALLBACK_NAV_MODEL,
}: StorefrontHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const { role, isAuthenticated, clearSession, user } = useAuth();
  const { totalItems } = useCart();
  const { showFavoritesNav, wishlistIds } = useStorefront();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPointerFine, setIsPointerFine] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const shellRef = useRef<HTMLDivElement>(null);
  const navSurfaceRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  const {
    activeSectionId,
    isOpen: isMegaMenuOpen,
    openSection,
    scheduleClose,
    cancelClose,
    closeMenu,
  } = useMegaMenuIntent();

  const { isFromMobileApp } = useIsFromMobileApp();

  const handleLogout = async () => {
    await clearSession();

    if (isFromMobileApp) {
      router.replace("/");
    }
  };

  const activeSection = useMemo(
    () =>
      navModel.sections.find((section) => section.id === activeSectionId) ??
      null,
    [activeSectionId, navModel.sections],
  );

  const mobileLinks = useMemo(
    () =>
      navModel.sections.map((section) => ({
        href: section.href,
        label: section.label,
      })),
    [navModel.sections],
  );

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const updateDesktop = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (!event.matches) {
        closeMenu();
      }
    };

    const updatePointer = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsPointerFine(event.matches);
      if (!event.matches) {
        closeMenu();
      }
    };

    updateDesktop(desktopQuery);
    updatePointer(pointerQuery);
    desktopQuery.addEventListener("change", updateDesktop);
    pointerQuery.addEventListener("change", updatePointer);

    return () => {
      desktopQuery.removeEventListener("change", updateDesktop);
      pointerQuery.removeEventListener("change", updatePointer);
    };
  }, [closeMenu]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenu]);

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

      rootStyle.setProperty(
        "--storefront-header-reserved-height",
        `${reservedHeight}px`,
      );
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
  }, [isCompact, isFromMobileApp, isVisible, isMegaMenuOpen, pathname]);

  const overlayTop =
    navSurfaceRef.current?.getBoundingClientRect().bottom ??
    shellRef.current?.getBoundingClientRect().bottom ??
    0;

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/empleado-club") ||
    pathname.startsWith("/empleado")
  ) {
    return null;
  }

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const showMegaMenu = isDesktop && isPointerFine && isMegaMenuOpen;
  const panelSection =
    activeSection ??
    navModel.sections.find((section) => section.columns.length > 0) ??
    null;

  return (
    <>
      <div
        ref={shellRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div
          ref={navSurfaceRef}
          className={cn(
            "relative border-b border-black/14 bg-[rgb(255_255_255_/_0.94)] backdrop-blur-md transition-all duration-300",
            isCompact &&
              "bg-[rgb(255_255_255_/_0.98)] shadow-[0_18px_34px_-28px_rgb(8_14_11_/_0.18)]",
          )}
          onMouseLeave={() => {
            if (showMegaMenu) {
              scheduleClose();
            }
          }}
        >
          <UtilityBar links={navModel.utilityLinks} />
          <div
            className={cn(
              "storefront-frame flex items-center gap-4 transition-[height,padding] duration-300 lg:!pl-3 xl:!pl-4 lg:gap-8",
              isCompact ? "h-[4rem]" : "h-[4.5rem] lg:h-[5rem]",
            )}
          >
            <div className="flex shrink-0 items-center gap-2 lg:w-[10rem] lg:gap-4">
              <MobileNavDrawer
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-full border border-black/14 bg-white lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                }
                sections={navModel.sections}
                links={mobileLinks}
                isAuthenticated={isAuthenticated}
                role={role}
                email={user?.email}
                onLogout={handleLogout}
              />
              <Link
                href="/"
                className="flex items-center"
                aria-label="La Guarida inicio"
              >
                <Logo
                  className={cn(
                    "w-auto object-contain transition-[height,width] duration-300",
                    isCompact
                      ? "h-12 w-[76px] lg:h-[60px] lg:w-[88px]"
                      : "h-14 w-[96px] lg:h-[72px] lg:w-[120px]",
                  )}
                />
              </Link>
            </div>

            <DesktopNav
              pathname={currentPath}
              sections={navModel.sections}
              activeSectionId={activeSectionId}
              isMegaMenuOpen={showMegaMenu}
              megaMenuPanelId={MEGA_MENU_PANEL_ID}
              onSectionIntent={(sectionId, immediate) => {
                cancelClose();
                openSection(sectionId, immediate);
              }}
              onNavEnter={cancelClose}
              onNavLeave={scheduleClose}
              onNavigate={closeMenu}
            />

            <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2 lg:min-w-[20rem] lg:justify-end">
              <SearchDrawer isDesktop={isDesktop} onOpenChange={(open) => open && closeMenu()} />

              {showFavoritesNav ? (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="relative hidden h-11 w-11 rounded-full border border-black/14 bg-white lg:inline-flex"
                >
                  <Link href="/products?wishlist=1" onClick={closeMenu}>
                    <Heart className="h-4.5 w-4.5" />
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-[var(--shadow-card)]">
                      {Math.min(wishlistIds.length, 99)}
                    </span>
                    <span className="sr-only">Favoritos</span>
                  </Link>
                </Button>
              ) : null}

              {isAuthenticated ? (
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open) closeMenu();
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden h-11 w-11 rounded-full border border-black/14 bg-white md:inline-flex"
                    >
                      <UserRound className="h-4.5 w-4.5" />
                      <span className="sr-only">Cuenta</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-1.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user?.email}
                      </p>
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
                      onClick={handleLogout}
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
                  className="hidden h-11 w-11 rounded-full border border-black/14 bg-white md:inline-flex"
                >
                  <Link href="/login">
                    <UserRound className="h-4.5 w-4.5" />
                    <span className="sr-only">Iniciar sesión</span>
                  </Link>
                </Button>
              )}

              <div className="hidden md:block">
                <CartDrawer onOpenChange={(open) => open && closeMenu()} />
              </div>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-full border border-black/14 bg-white lg:hidden"
              >
                <Link href="/cart">
                  <ShoppingBag className="h-4.5 w-4.5" />
                  {totalItems > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-[var(--shadow-card)]">
                      {Math.min(totalItems, 99)}
                    </span>
                  ) : null}
                  <span className="sr-only">Carrito</span>
                </Link>
              </Button>
            </div>
          </div>

          <div
            className="hidden lg:block"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <MegaMenuPanel
              section={panelSection}
              isVisible={showMegaMenu}
              onNavigate={closeMenu}
              panelId={MEGA_MENU_PANEL_ID}
            />
          </div>
        </div>
      </div>

      <MegaMenuOverlay
        isVisible={showMegaMenu}
        onClick={closeMenu}
        topOffset={overlayTop}
      />
    </>
  );
}
