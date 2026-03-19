"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
    GalleryThumbnails,
    Newspaper,
    LogOut,
    Menu,
    User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetHeader,
} from "@/components/ui/sheet";

const navLinks = [
    { href: "/empleado-club/noticias", label: "Noticias", icon: Newspaper },
    { href: "/empleado-club/galerias", label: "Galerías", icon: GalleryThumbnails },
];

export default function EmpleadoClubLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { role, isLoading, clearSession } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && role !== "EMPLEADO_CLUB") {
            router.replace("/login");
        }
    }, [role, isLoading, router]);

    if (isLoading || role !== "EMPLEADO_CLUB") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-text-secondary">Verificando acceso...</p>
            </div>
        );
    }

    const NavLinks = () => (
        <>
            {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all ${isActive
                                ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                                : "text-text-secondary hover:bg-muted hover:text-foreground"
                            }`}
                    >
                        <Icon className="h-5 w-5" />
                        {link.label}
                    </Link>
                );
            })}
        </>
    );

    return (
        <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
            {/* Mobile header */}
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background-deep px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button size="icon" variant="outline" className="sm:hidden">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="sm:max-w-xs">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle className="font-headline text-2xl font-bold">
                                Empleado Club
                            </SheetTitle>
                        </SheetHeader>
                        <nav className="grid gap-2 text-lg font-medium">
                            <NavLinks />
                        </nav>
                        <div className="absolute bottom-4 left-4 right-4">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3"
                                onClick={() => {
                                    void clearSession();
                                    router.push("/");
                                }}
                            >
                                <LogOut className="h-5 w-5" /> Cerrar Sesión
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="flex flex-1 items-center justify-between">
                    <span className="font-headline text-lg font-bold">
                        Panel Empleado Club
                    </span>
                    <span className="text-xs uppercase text-text-muted">EMPLEADO</span>
                </div>
            </header>

            {/* Desktop sidebar */}
            <aside className="hidden border-r border-border bg-background-deep md:block md:w-64 lg:w-72">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b border-border px-4 lg:h-[60px] lg:px-6">
                        <Link href="/empleado-club" className="flex items-center gap-2 font-semibold">
                            <span className="font-headline text-xl">Empleado Club</span>
                        </Link>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
                            <NavLinks />
                        </nav>
                    </div>
                    <div className="mt-auto border-t border-border p-4">
                        <div className="mb-4 flex items-center gap-2 px-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-bold text-primary">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Personal</span>
                                <span className="text-xs uppercase text-text-muted">EMPLEADO</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                                void clearSession();
                                router.push("/");
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex w-full max-w-full flex-1 flex-col gap-4 overflow-hidden p-4 lg:gap-6 lg:p-6">
                {children}
            </main>
        </div>
    );
}