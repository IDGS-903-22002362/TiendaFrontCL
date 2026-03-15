"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Menu, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const superAdminNavLinks = [
    { href: "/super-admin/usuarios", label: "Gestión de Usuarios", icon: Users },
];

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading, role, clearSession } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated || role !== "SUPER_ADMIN") {
                router.replace("/login?redirect=/super-admin");
            }
        }
    }, [isAuthenticated, isLoading, role, router]);

    const handleLogout = async () => {
        await clearSession();
        router.replace("/login");
    };

    if (isLoading || (!isAuthenticated && role !== "SUPER_ADMIN")) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="mb-4 text-lg font-semibold">Cargando...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
            {/* Sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col border-r bg-white">
                <div className="flex items-center justify-center border-b p-4">
                    <h1 className="text-xl font-bold">Super Admin</h1>
                </div>
                <nav className="flex-1 space-y-2 p-4">
                    {superAdminNavLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link key={link.href} href={link.href}>
                                <button
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${isActive
                                            ? "bg-blue-50 text-blue-600 font-medium"
                                            : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {link.label}
                                </button>
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t p-4">
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full justify-start gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                    </Button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col">
                {/* Mobile header */}
                <div className="md:hidden flex items-center justify-between border-b bg-white p-4">
                    <h1 className="text-lg font-bold">Super Admin</h1>
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64">
                            <SheetHeader>
                                <SheetTitle>Menú</SheetTitle>
                            </SheetHeader>
                            <nav className="mt-6 space-y-2">
                                {superAdminNavLinks.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <button
                                                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${pathname === link.href
                                                        ? "bg-blue-50 text-blue-600 font-medium"
                                                        : "text-gray-700 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                {link.label}
                                            </button>
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="mt-6 border-t pt-4">
                                <Button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Cerrar sesión
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
