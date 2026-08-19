import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/backend-client";

function backendPath(path?: string[]) {
  const suffix = path?.length ? `/${path.join("/")}` : "";
  return `/api/pos/v1${suffix}`;
}

function forward(request: NextRequest, path?: string[]) {
  return proxyToBackend({
    request,
    backendPath: backendPath(path),
    requireAuth: true,
  });
}

type RouteContext = { params: Promise<{ path?: string[] }> };

export function GET(request: NextRequest, context: RouteContext) {
  return context.params.then(({ path }) => forward(request, path));
}

export function POST(request: NextRequest, context: RouteContext) {
  return context.params.then(({ path }) => forward(request, path));
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return context.params.then(({ path }) => forward(request, path));
}

export function PUT(request: NextRequest, context: RouteContext) {
  return context.params.then(({ path }) => forward(request, path));
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return context.params.then(({ path }) => forward(request, path));
}
