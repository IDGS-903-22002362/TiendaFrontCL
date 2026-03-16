import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/server/backend-client";

function getSuffix(path?: string[]) {
  if (!path || path.length === 0) {
    return "";
  }
  return `/${path.join("/")}`;
}

function forward(request: NextRequest, path?: string[]) {
  const suffix = getSuffix(path);
  return proxyToBackend({
    request,
    backendPath: `/api/stripe${suffix}`,
    requireAuth: false, // El config y webhooks no requieren token Auth en algunos endpoints, el backend valida si es que sí.
  });
}

function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) {
    return null;
  }

  if (!key.startsWith("pk_")) {
    return null;
  }

  return key;
}

export function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return context.params.then((params) => {
    const suffix = getSuffix(params.path);

    if (suffix === "/config") {
      const publishableKey = getStripePublishableKey();
      if (!publishableKey) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Stripe publishable key no disponible o inválida en este entorno",
          },
          { status: 503 },
        );
      }

      return NextResponse.json({
        success: true,
        data: { publishableKey },
      });
    }

    return forward(request, params.path);
  });
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
