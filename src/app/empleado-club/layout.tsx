"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GalleryHorizontal, GalleryThumbnails, Menu, Newspaper } from "lucide-react";

export default function EmpleadoClubLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { role, isLoading } = useAuth();
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (!isLoading && role !== "EMPLEADO_CLUB") {
            router.replace("/login");
        }
    }, [role, isLoading, router]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-lg text-gray-600">Cargando...</div>
            </div>
        );
    }

    const navLinks = [{ href: "/empleado-club/noticias", label: "Noticias", icon: Newspaper }, { href: "/empleado-club/galerias", label: "Galerías", icon: GalleryThumbnails }];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 border-r bg-white md:flex flex-col">
                <div className="border-b px-6 py-4">
                    <h1 className="text-xl font-bold text-gray-900">Empleado Club</h1>
                </div>
                <nav className="flex-1 space-y-2 p-4">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Button
                            key={href}
                            variant="ghost"
                            className="w-full justify-start gap-2"
                            onClick={() => router.push(href)}
                        >
                            <Icon className="h-5 w-5" />
                            {label}
                        </Button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header with Menu */}
                {isMobile && (
                    <div className="border-b bg-white p-4 flex items-center justify-between md:hidden">
                        <h1 className="text-lg font-bold">Empleado Club</h1>
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left">
                                <nav className="flex flex-col gap-4 mt-8">
                                    {navLinks.map(({ href, label, icon: Icon }) => (
                                        <Button
                                            key={href}
                                            variant="ghost"
                                            className="justify-start gap-2"
                                            onClick={() => {
                                                router.push(href);
                                            }}
                                        >
                                            <Icon className="h-5 w-5" />
                                            {label}
                                        </Button>
                                    ))}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
        </div>
    );
}
