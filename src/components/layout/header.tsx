"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchProducts } from "@/lib/api/storefront";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CartDrawer } from "@/components/cart/cart-drawer";

const baseNavLinks = [
  { href: "/products", label: "Todos los Productos" },
  { href: "/products?category=jerseys", label: "Jerseys" },
  { href: "/products?tag=new", label: "Novedades" },
  { href: "/products?tag=sale", label: "Ofertas" },
  { href: "/order-history", label: "Mis Pedidos" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAuthenticated, clearSession, user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const navLinks = useMemo(() => {
    const links = [...baseNavLinks];

    if (role === "ADMIN" || role === "EMPLEADO") {
      links.push({ href: "/admin", label: "Admin" });
    }

    return links;
  }, [role]);

  const desktopNavLinks = useMemo(() => {
    const primary = navLinks.filter((link) => link.href !== "/order-history");
    return primary.slice(0, role === "ADMIN" || role === "EMPLEADO" ? 5 : 4);
  }, [navLinks, role]);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktopViewport(event.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isSearchOpen || products.length > 0) {
      return;
    }

    const loadProducts = async () => {
      const result = await fetchProducts();
      setProducts(result);
    };

    void loadProducts();
  }, [isSearchOpen, products.length]);

  const suggestions = useMemo(() => {
    const term = normalizeText(searchQuery);

    if (!term) {
      return products.slice(0, 6);
    }

    return products
      .map((product) => {
        const name = normalizeText(product.name);
        const description = normalizeText(product.description);
        const category = normalizeText(product.category);

        let score = 0;

        if (name.startsWith(term)) score += 120;
        else if (name.includes(term)) score += 90;

        if (description.includes(term)) score += 50;
        if (category.includes(term)) score += 30;

        return { product, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.product);
  }, [products, searchQuery]);

  const runSearch = (query: string) => {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return;
    }

    router.push(`/products?q=${encodeURIComponent(cleanQuery)}`);
    setIsSearchOpen(false);
  };

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    role === "SUPER_ADMIN" ||
    role === "EMPLEADO_CLUB"
  ) {
    return null;
  }

  const searchPanel = (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        runSearch(searchQuery);
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Ej. Jersey de local, gorra..."
          className="h-12"
        />
        <Button type="submit" className="h-12 shrink-0 px-4">
          Buscar
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-[22px] border border-border bg-muted/45 p-1">
          {suggestions.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => runSearch(product.name)}
              className="flex w-full flex-col rounded-xl px-3 py-3 text-left transition-colors hover:bg-card"
            >
              <span className="truncate text-sm font-medium">
                {product.name}
              </span>
              <span className="truncate text-xs text-text-muted">
                {product.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </form>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/82 backdrop-blur-xl">
      <div className="container flex h-[var(--mobile-header-height)] items-center justify-between gap-2 md:h-[76px]">
        <div className="flex items-center gap-2 md:gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-2xl md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[320px] border-border bg-background-deep/95 px-0"
            >
              <div className="flex h-full flex-col p-5">
                <Link href="/" className="mb-8 flex items-center">
                  <Logo className="h-14 w-auto" />
                </Link>
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-2xl border border-transparent px-4 py-3 text-base font-semibold text-text-secondary hover:border-primary/25 hover:bg-muted hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto border-t border-border/70 pt-5">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <div className="mb-3 px-1">
                        {user?.email ? (
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.email}
                          </p>
                        ) : null}
                        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                          {role}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        className="block rounded-2xl border border-transparent px-4 py-3 text-base font-semibold text-text-secondary hover:border-primary/25 hover:bg-muted hover:text-foreground"
                      >
                        Mi Perfil
                      </Link>
                      <Link
                        href="/ai"
                        className="block rounded-2xl border border-transparent px-4 py-3 text-base font-semibold text-text-secondary hover:border-primary/25 hover:bg-muted hover:text-foreground"
                      >
                        Asistente AI
                      </Link>
                      <Link
                        href="/order-history"
                        className="block rounded-2xl border border-transparent px-4 py-3 text-base font-semibold text-text-secondary hover:border-primary/25 hover:bg-muted hover:text-foreground"
                      >
                        Mis Pedidos
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-full justify-start rounded-2xl px-4 py-3 text-base font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => void clearSession()}
                      >
                        Cerrar sesión
                      </Button>
                    </div>
                  ) : (
                    <Button asChild className="h-12 w-full rounded-2xl">
                      <Link href="/login">Iniciar sesión</Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center">
            <Logo className="h-10 w-auto md:h-16" />
          </Link>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {desktopNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-text-secondary transition-all hover:border-primary/20 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-11 w-11 rounded-2xl border border-border bg-card/70 md:inline-flex"
                >
                  <Avatar className="h-8 w-8 bg-primary/15 text-primary">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user?.email ? <p className="font-medium">{user.email}</p> : null}
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {role}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="w-full cursor-pointer">
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ai" className="w-full cursor-pointer">
                    Asistente AI
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/order-history" className="w-full cursor-pointer">
                    Mis Pedidos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => void clearSession()}
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden h-11 w-11 rounded-2xl sm:hidden"
              >
                <Link href="/login">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Iniciar sesión</span>
                </Link>
              </Button>
              <Button asChild variant="secondary" className="hidden sm:inline-flex">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            </>
          )}

          {isDesktopViewport ? (
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-11 w-11 rounded-2xl md:inline-flex"
                >
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Buscar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="border-primary/15">
                <DialogHeader>
                  <DialogTitle>Buscar productos</DialogTitle>
                </DialogHeader>
                {searchPanel}
              </DialogContent>
            </Dialog>
          ) : (
            <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-2xl md:hidden"
                >
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Buscar</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="mobile-panel-height rounded-t-[28px] border-t border-border bg-background-deep/98 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
              >
                <SheetHeader className="mb-4 text-left">
                  <SheetTitle>Buscar productos</SheetTitle>
                </SheetHeader>
                {searchPanel}
              </SheetContent>
            </Sheet>
          )}

          <div className="hidden md:block">
            <CartDrawer />
          </div>
        </div>
      </div>
    </header>
  );
}
