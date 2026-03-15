"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

/**
 * Esta página redirige automáticamente al usuario según su rol
 * SUPER_ADMIN → /super-admin/usuarios
 * ADMIN/EMPLEADO → /admin
 * CLIENTE → /
 */
export default function RoleRedirectPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading, role } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            router.replace("/login");
            return;
        }

        // Redirigir según el rol
        switch (role) {
            case "SUPER_ADMIN":
                router.replace("/super-admin/usuarios");
                break;
            case "ADMIN":
            case "EMPLEADO":
                router.replace("/admin");
                break;
            case "EMPLEADO_CLUB":
                router.replace("/empleado-club/noticias");
                break;
            case "CLIENTE":
                router.replace("/");
                break;
            default:
                router.replace("/");
        }
    }, [isAuthenticated, isLoading, role, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="mb-4 text-lg font-semibold">Redirigiendo...</div>
                <p className="text-sm text-gray-600">Por favor espera mientras te llevamos a tu dashboard</p>
            </div>
        </div>
    );
}
