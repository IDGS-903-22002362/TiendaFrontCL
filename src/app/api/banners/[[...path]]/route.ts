import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/backend-client";

function getSuffix(path?: string[]): string {
    if (!path || path.length === 0) {
        return "";
    }
    return `/${path.join("/")}`;
}

function shouldRequireAuth(method: string, suffix: string): boolean {
    // Rutas públicas (no requieren autenticación)
    const publicRoutes: string[] = [
        "/active", // GET /api/banners/active (banners activos para el front)
        "",

    ];

    const isPublicRoute = publicRoutes.some(route => suffix === route);
    if (isPublicRoute && method === "GET") {
        return false;
    }

    // Si no es ruta pública, requiere autenticación
    return true;
}

function forward(request: NextRequest, path?: string[]) {
    const suffix = getSuffix(path);
    const backendPath = `/api/banners${suffix}`;
    const requireAuth = shouldRequireAuth(request.method, suffix);

    return proxyToBackend({
        request,
        backendPath,
        requireAuth,
    });
}

// Exportar métodos HTTP
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const resolvedParams = await params;
    return forward(request, resolvedParams.path);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const resolvedParams = await params;
    return forward(request, resolvedParams.path);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const resolvedParams = await params;
    return forward(request, resolvedParams.path);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const resolvedParams = await params;
    return forward(request, resolvedParams.path);
}