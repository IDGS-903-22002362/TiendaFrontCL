import { NextRequest, NextResponse } from "next/server";
import type { AplazoReturnKind } from "@/lib/types";

const FALLBACK_API_BASE = "http://localhost:3000/api";

function resolveBackendPublicBase() {
  const apiBase =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    FALLBACK_API_BASE;

  return apiBase.replace(/\/api\/?$/, "");
}

function isReturnKind(value: string): value is AplazoReturnKind {
  return value === "success" || value === "failure" || value === "cancel";
}

async function parsePayload(response: Response) {
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kind: string }> },
) {
  const { kind } = await context.params;
  if (!isReturnKind(kind)) {
    return NextResponse.json(
      { success: false, message: "Return kind inválido" },
      { status: 404 },
    );
  }

  const targetUrl = `${resolveBackendPublicBase()}/payments/aplazo/${kind}${request.nextUrl.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: request.headers.get("accept") || "application/json",
      },
      cache: "no-store",
    });

    const payload = await parsePayload(response);
    return NextResponse.json(payload, {
      status: response.status,
      headers: {
        "cache-control": response.headers.get("cache-control") || "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo conectar con el backend" },
      { status: 502 },
    );
  }
}
