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
    return true;
  }

  const suffix = `/${path.join("/")}`;
  if (suffix === "/exists/email") {
    return false;
  }

  return true;
}

function forward(request: NextRequest, path?: string[]) {
  const suffix = getSuffix(path);
  return proxyToBackend({
    request,
    backendPath: `/api/usuarios${suffix}`,
    requireAuth: shouldRequireAuth(path),
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
