import { NextRequest, NextResponse } from "next/server";
import { getApiTokenFromRequest } from "@/lib/server/session";

const FALLBACK_API_BASE = "http://localhost:3000/api";

function resolveBackendBase() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    FALLBACK_API_BASE
  );
}

function joinUrl(base: string, path: string) {
  const sanitizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${sanitizedBase}${normalizedPath}`;
}

async function parseResponsePayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

type ProxyOptions = {
  request: NextRequest;
  backendPath: string;
  requireAuth?: boolean;
  method?: "GET" | "POST" | "PUT" | "DELETE";
};

export async function proxyToBackend({
  request,
  backendPath,
  requireAuth = false,
  method,
}: ProxyOptions) {
  const tokenFromCookie = getApiTokenFromRequest(request);
  const authorization =
    request.headers.get("authorization") ||
    (tokenFromCookie ? `Bearer ${tokenFromCookie}` : "");

  if (requireAuth && !authorization) {
    return NextResponse.json(
      { success: false, message: "No autenticado" },
      { status: 401 },
    );
  }

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const sessionId = request.headers.get("x-session-id");
  const idempotencyKey = request.headers.get("idempotency-key");

  if (authorization) {
    headers.set("Authorization", authorization);
  }
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (sessionId) {
    headers.set("x-session-id", sessionId);
  }
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  const nextMethod = method ?? (request.method as ProxyOptions["method"]);
  const url = joinUrl(resolveBackendBase(), backendPath);
  const hasBody = nextMethod !== "GET";
  const rawBody = hasBody ? await request.arrayBuffer() : undefined;
  const body = rawBody && rawBody.byteLength > 0 ? rawBody : undefined;

  try {
    const response = await fetch(url, {
      method: nextMethod,
      headers,
      body,
      cache: "no-store",
    });

    const payload = await parseResponsePayload(response);
    if (!response.ok) {
      console.error(`Backend returned ${response.status} for ${url}`);
      console.error("Backend Error Payload:", JSON.stringify(payload, null, 2));
    }
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo conectar con el backend" },
      { status: 502 },
    );
  }
}
