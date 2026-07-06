import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/backend-client";
import { buildLoyaltyBackendPath } from "@/lib/server/loyalty-proxy-path";

function forward(request: NextRequest, path?: string[]) {
  return proxyToBackend({
    request,
    backendPath: buildLoyaltyBackendPath(path),
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
