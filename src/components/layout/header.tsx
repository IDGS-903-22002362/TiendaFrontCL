'use client';

import Link from 'next/link';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/icons';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';

const navLinks = [
  { href: '/products', label: 'Todos los Productos' },
  { href: '/products?category=jerseys', label: 'Jerseys' },
  { href: '/products?tag=new', label: 'Novedades' },
  { href: '/products?tag=sale', label: 'Ofertas' },
  { href: '/order-history', label: 'Mis Pedidos' },
];

export function Header() {
  const { totalItems } = useCart();

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
                    León Fanshop
                  </span>
                </Link>
                <nav className="flex flex-col gap-4">
                  {navLinks.map(link => (
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
              León Fanshop
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.slice(0, 4).map(link => (
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
          <Dialog>
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
              <div className="flex items-center gap-2">
                <Input placeholder="Ej. Jersey de local, gorra..." />
                <Button type="submit">Buscar</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button asChild variant="ghost" size="icon">
            <Link href="/cart">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge
                    variant="solid"
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
