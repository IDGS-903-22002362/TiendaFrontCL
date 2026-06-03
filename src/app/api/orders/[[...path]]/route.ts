import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/backend-client";

function getSuffix(path?: string[]) {
  return path && path.length > 0 ? `/${path.join("/")}` : "";
}

function forward(request: NextRequest, path?: string[]) {
  return proxyToBackend({
    request,
    backendPath: `/api/orders${getSuffix(path)}`,
    requireAuth: true,
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
