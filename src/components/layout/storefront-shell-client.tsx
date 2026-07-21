"use client";

import { Suspense, type ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { cn } from "@/lib/utils";
import { useIsFromMobileApp } from "@/hooks/use-from-mobile-app";
import { isInternalAccount } from "@/lib/staff-access";

type StorefrontShellClientProps = {
  children: ReactNode;
};

function isProductDetailRoute(pathname: string) {
  return pathname.startsWith("/products/") && pathname !== "/products";
}

export function StorefrontShellClient({ children }: StorefrontShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, isLoading, role } = useAuth();
  const { isFromMobileApp } = useIsFromMobileApp();

  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      user &&
      !user.perfilCompleto &&
      !isFromMobileApp &&
      pathname !== "/complete-profile" &&
      pathname !== "/register"
    ) {
      router.push("/complete-profile");
    }
  }, [isAuthenticated, user, isLoading, isFromMobileApp, pathname, router]);

  const isAdminRoute = pathname.startsWith("/admin");
  const isEmployeeRoute =
    pathname.startsWith("/empleado-club") || pathname.startsWith("/empleado");
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isStaffLandingRoute = pathname.startsWith("/staff");
  const isCheckoutRoute = pathname.startsWith("/checkout");
  const isLoginRoute = pathname === "/login";
  const isAuthFullscreenRoute = isLoginRoute || pathname === "/register";
  const isPublicStorefront =
    !isAdminRoute && !isEmployeeRoute && !isSuperAdminRoute && !isStaffLandingRoute;

  useEffect(() => {
    if (!isLoading && isAuthenticated && isInternalAccount(role, user?.roles) && isPublicStorefront) {
      router.replace("/staff");
    }
  }, [isAuthenticated, isLoading, isPublicStorefront, role, router, user?.roles]);

  const showBottomNav =
    pathname === "/" ||
    pathname === "/products" ||
    pathname === "/cart" ||
    pathname === "/order-history" ||
    pathname === "/profile" ||
    pathname === "/ai";
  const reserveStoreBottomNavSpace = showBottomNav && !isFromMobileApp;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.storefront = isPublicStorefront ? "true" : "false";
    document.body.dataset.embeddedApp = isFromMobileApp ? "true" : "false";

    return () => {
      document.body.dataset.storefront = "false";
      document.body.dataset.embeddedApp = "false";
    };
  }, [isFromMobileApp, isPublicStorefront]);

  if (!isLoading && isAuthenticated && isInternalAccount(role, user?.roles) && isPublicStorefront) {
    return null;
  }

  if (!isPublicStorefront) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        {children}
      </div>
    );
  }

  if (isAuthFullscreenRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <main
        className={cn(
          isFromMobileApp
            ? "relative flex-grow pt-[var(--storefront-header-reserved-height,var(--storefront-header-mobile-height))]"
            : "relative flex-grow pt-[var(--storefront-header-reserved-height,var(--storefront-header-mobile-height))] lg:pt-[var(--storefront-header-reserved-height,var(--storefront-header-desktop-height))]",
          reserveStoreBottomNavSpace
            ? "pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] md:pb-12"
            : isFromMobileApp
              ? "pb-3"
              : "",
          isProductDetailRoute(pathname) &&
            "pb-[calc(var(--product-mobile-cta-height)+8rem)] ",
          isCheckoutRoute &&
            "pb-[calc(var(--checkout-mobile-cta-height)+1.5rem)] ",
          pathname === "/ai" &&
            !isFromMobileApp &&
            "pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+1.25rem)] ",
        )}
      >
        {children}
      </main>
      {!isCheckoutRoute && !isFromMobileApp ? <Footer /> : null}
      {showBottomNav && !isFromMobileApp ? (
        <Suspense fallback={null}>
          <MobileBottomNav />
        </Suspense>
      ) : null}
    </div>
  );
}
