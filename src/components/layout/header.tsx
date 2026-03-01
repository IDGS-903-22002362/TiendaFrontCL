"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { fetchProducts } from "@/lib/api/storefront";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/icons";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";

const baseNavLinks = [
  { href: "/products", label: "Todos los Productos" },
  { href: "/products?category=jerseys", label: "Jerseys" },
  { href: "/products?tag=new", label: "Novedades" },
  { href: "/products?tag=sale", label: "Ofertas" },
  { href: "/order-history", label: "Mis Pedidos" },
];

export function Header() {
  const router = useRouter();
  const { totalItems } = useCart();
  const { role } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <div className="flex flex-col p-4">
                <Link href="/" className="mb-8 flex items-center gap-2">
                  <Logo className="h-8 w-auto" />
                  <span className="font-headline text-xl font-bold">
                    La Dungeon
                  </span>
                </Link>
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium text-foreground/80 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/" className="hidden items-center gap-2 md:flex">
            <Logo className="h-8 w-auto" />
            <span className="hidden font-headline text-xl font-bold sm:inline-block">
              La Dungeon
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {desktopNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
                <span className="sr-only">Buscar</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buscar productos</DialogTitle>
              </DialogHeader>
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
                  />
                  <Button type="submit">Buscar</Button>
                </div>

                {suggestions.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-md border bg-background">
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => runSearch(product.name)}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-accent"
                      >
                        <span className="truncate text-sm font-medium">
                          {product.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {product.category}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </DialogContent>
          </Dialog>

          <Button asChild variant="ghost" size="icon">
            <Link href="/cart">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary p-0 text-xs text-primary-foreground"
                  >
                    {totalItems}
                  </Badge>
                )}
              </div>
              <span className="sr-only">Carrito de compras</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
