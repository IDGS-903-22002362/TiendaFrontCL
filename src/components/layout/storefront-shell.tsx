"use client";

import { Suspense, type ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { cn } from "@/lib/utils";

type StorefrontShellProps = {
  children: ReactNode;
};

function isProductDetailRoute(pathname: string) {
  return pathname.startsWith("/products/") && pathname !== "/products";
}

export function StorefrontShell({ children }: StorefrontShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  // Redirigir a complete-profile si el usuario está autenticado pero su perfil no está completo
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !user.perfilCompleto && pathname !== "/complete-profile") {
      router.push("/complete-profile");
    }
  }, [isAuthenticated, user, isLoading, pathname, router]);

  const isAdminRoute = pathname.startsWith("/admin");
  const isEmployeeRoute = pathname.startsWith("/empleado-club") || pathname.startsWith("/empleado");
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isCheckoutRoute = pathname.startsWith("/checkout");
  const isLoginRoute = pathname === "/login";
  const isPublicStorefront =
    !isAdminRoute && !isEmployeeRoute && !isSuperAdminRoute;
  const showBottomNav =
    pathname === "/" ||
    pathname === "/products" ||
    pathname === "/cart" ||
    pathname === "/order-history" ||
    pathname === "/profile" ||
    pathname === "/ai";

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.storefront = isPublicStorefront ? "true" : "false";

    return () => {
      document.body.dataset.storefront = "false";
    };
  }, [isPublicStorefront]);

  if (!isPublicStorefront) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-x-clip">
        {children}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <Header />
      <main
        className={cn(
          "relative flex-grow pt-[var(--storefront-header-reserved-height,var(--storefront-header-mobile-height))] lg:pt-[var(--storefront-header-reserved-height,var(--storefront-header-desktop-height))]",
          showBottomNav
            ? "pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] md:pb-12"
            : "pb-10 md:pb-12",
          isProductDetailRoute(pathname) &&
          "pb-[calc(var(--product-mobile-cta-height)+8rem)] md:pb-12",
          isCheckoutRoute &&
          "pb-[calc(var(--checkout-mobile-cta-height)+1.5rem)] md:pb-12",
          pathname === "/ai" &&
          "pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+1.25rem)] md:pb-12",
          isLoginRoute && "pb-10",
        )}
      >
        {children}
      </main>
      {!isCheckoutRoute ? <Footer /> : null}
      {showBottomNav ? (
        <Suspense fallback={null}>
          <MobileBottomNav />
        </Suspense>
      ) : null}
    </div>
  );
}
