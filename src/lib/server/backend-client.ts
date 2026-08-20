import { NextRequest, NextResponse } from "next/server";
import {
  csrfForbiddenResponse,
  isMutatingMethod,
  setCsrfCookie,
  validateCsrfRequest,
} from "@/lib/server/csrf";
import { getApiTokenFromRequest } from "@/lib/server/session";
import {
  COOKIE_SESSION_TOKEN,
  resolveAuthorizationHeader,
} from "@/lib/cookies/constants";
import {
  joinBackendApiUrl,
  resolveBackendBaseUrl,
} from "@/lib/backend-url";
import { CLIENT_ORIGIN_HEADER } from "@/lib/privacy/constants";

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

function copyPassthroughHeaders(
  source: Headers,
  extra?: Record<string, string | null | undefined>,
) {
  const headers = new Headers();
  const passthroughNames = [
    "content-type",
    "cache-control",
    "content-disposition",
    "retry-after",
    "x-request-id",
    "vary",
  ];

  passthroughNames.forEach((name) => {
    const value = source.get(name);
    if (value) {
      headers.set(name, value);
    }
  });

  if (extra) {
    Object.entries(extra).forEach(([name, value]) => {
      if (value) {
        headers.set(name, value);
      }
    });
  }

  return headers;
}

type ProxyOptions = {
  request: NextRequest;
  backendPath: string;
  requireAuth?: boolean;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  rawResponse?: boolean;
  /** @deprecated El proxy ahora bufferiza multipart de forma segura. */
  streamMultipart?: boolean;
  /** Omitir validación CSRF (p. ej. login inicial). */
  skipCsrf?: boolean;
};

export async function proxyToBackend({
  request,
  backendPath,
  requireAuth = false,
  method,
  rawResponse = false,
  skipCsrf = false,
}: ProxyOptions) {
  const nextMethod = method ?? (request.method as ProxyOptions["method"]);

  if (
    !skipCsrf &&
    nextMethod &&
    isMutatingMethod(nextMethod) &&
    !validateCsrfRequest(request)
  ) {
    return csrfForbiddenResponse();
  }

  const tokenFromCookie = getApiTokenFromRequest(request);
  let authorization = resolveAuthorizationHeader(
    request.headers.get("authorization"),
    tokenFromCookie,
  );

  if (!authorization) {
    const rawCookieToken = tokenFromCookie?.trim();
    if (rawCookieToken && rawCookieToken !== COOKIE_SESSION_TOKEN) {
      authorization = `Bearer ${rawCookieToken}`;
    }
  }

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
  const requestId = request.headers.get("x-request-id");
  const accept = request.headers.get("accept");
  const appCheckToken = request.headers.get("x-firebase-appcheck");
  const clientOrigin = request.headers.get(CLIENT_ORIGIN_HEADER);

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
  if (requestId) {
    headers.set("x-request-id", requestId);
  }
  if (accept) {
    headers.set("Accept", accept);
  }
  if (appCheckToken) {
    headers.set("X-Firebase-AppCheck", appCheckToken);
  }
  if (clientOrigin) {
    headers.set(CLIENT_ORIGIN_HEADER, clientOrigin);
  }

  const url = `${joinBackendApiUrl(resolveBackendBaseUrl(), backendPath)}${request.nextUrl.search}`;
  const hasBody = nextMethod !== "GET";
  const isMultipart = contentType?.includes("multipart/form-data");

  let body: BodyInit | undefined;
  if (hasBody) {
    const rawBody = await request.arrayBuffer();
    const declaredLength = Number.parseInt(
      request.headers.get("content-length") ?? "",
      10,
    );

    if (
      isMultipart &&
      Number.isFinite(declaredLength) &&
      declaredLength > 0 &&
      rawBody.byteLength > 0 &&
      rawBody.byteLength < declaredLength
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "El archivo llegó incompleto al proxy. Reinicia el servidor de desarrollo tras actualizar next.config y vuelve a intentar.",
        },
        { status: 413 },
      );
    }

    if (rawBody.byteLength > 0) {
      body = rawBody;
      headers.set("Content-Length", String(rawBody.byteLength));
    } else if (isMultipart) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se recibió el archivo en el proxy. Verifica el tamaño del video (máx. 50 MB) y reinicia Next.js.",
        },
        { status: 400 },
      );
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Proxy URL:", url);
    console.log("Method:", nextMethod);
    console.log("Content-Type:", contentType);
    console.log(
      "Body bytes:",
      body instanceof ArrayBuffer ? body.byteLength : 0,
    );
  }

  try {
    const response = await fetch(url, {
      method: nextMethod,
      headers,
      body,
      cache: "no-store",
    });

    const responseHeaders = copyPassthroughHeaders(response.headers);
    const isSseResponse =
      rawResponse ||
      response.headers.get("content-type")?.includes("text/event-stream");

    if (isSseResponse) {
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    const payload = await parseResponsePayload(response);
    if (!response.ok && process.env.NODE_ENV !== "production") {
      console.error(`Backend returned ${response.status} for ${backendPath}`);
    }
    const jsonResponse = NextResponse.json(payload, {
      status: response.status,
      headers: responseHeaders,
    });

    if (nextMethod === "GET") {
      setCsrfCookie(jsonResponse);
    }

    return jsonResponse;
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo conectar con el backend" },
      { status: 502 },
    );
  }
}
