import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/backend-client";

function getSuffix(path?: string[]) {
    if (!path || path.length === 0) {
        return "";
    }
    return `/${path.join("/")}`;
}

function shouldRequireAuth(path?: string[]) {
    if (!path || path.length === 0) {
        // GET / no requiere auth (listar noticias públicas)
        // POST / requiere auth (crear noticia)
        return false; // Será evaluado en el método específico
    }

    const suffix = `/${path.join("/")}`;

    // Rutas públicas (no requieren auth)
    const publicRoutes = [
        "/buscar",
    ];

    // Check si la ruta es pública
    const isPublic = publicRoutes.some((route) => suffix.startsWith(route));

    return !isPublic; // Si no es pública, requiere auth
}

function forward(request: NextRequest, path?: string[]) {
    const suffix = getSuffix(path);

    // Lógica especial para POST / (crear noticia requiere auth)
    let requireAuth = shouldRequireAuth(path);
    if (request.method === "POST" && suffix === "") {
        requireAuth = true;
    }

    // GET / (listar noticias) puede ser sin auth pero optional
    if (request.method === "GET" && suffix === "") {
        requireAuth = false;
    }

    return proxyToBackend({
        request,
        backendPath: `/api/noticias${suffix}`,
        requireAuth,
    });
}

export function GET(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> },
) {
    return context.params.then((params) => forward(request, params.path));
}

export function POST(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> },
) {
    return context.params.then((params) => forward(request, params.path));
}

export function PUT(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> },
) {
    return context.params.then((params) => forward(request, params.path));
}

export function DELETE(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> },
) {
    return context.params.then((params) => forward(request, params.path));
}
