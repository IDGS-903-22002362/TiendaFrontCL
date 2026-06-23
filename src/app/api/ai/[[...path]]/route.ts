import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/backend-client";

function getSuffix(path?: string[]) {
  if (!path || path.length === 0) {
    return "";
  }

  return `/${path.join("/")}`;
}

function forward(request: NextRequest, path?: string[]) {
  const suffix = getSuffix(path);
  const isMessageStream =
    request.method === "POST" &&
    suffix === "/chat/messages" &&
    (request.nextUrl.searchParams.get("stream") === "true" ||
      request.headers.get("accept")?.includes("text/event-stream"));
  const isTryOnImageStream =
    request.method === "GET" && /\/tryon\/jobs\/[^/]+\/image$/.test(suffix);

  return proxyToBackend({
    request,
    backendPath: `/api/ai${suffix}`,
    requireAuth: true,
    rawResponse: isMessageStream || isTryOnImageStream,
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

export function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return context.params.then((params) => forward(request, params.path));
}
