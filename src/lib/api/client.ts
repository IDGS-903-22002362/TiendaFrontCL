import { CSRF_HEADER_NAME } from "@/lib/cookies/constants";
import { readCsrfTokenFromDocument } from "@/lib/cookies/csrf-client";

const FALLBACK_API_BASE = "http://localhost:3000/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  FALLBACK_API_BASE;

function joinApiUrl(base: string, path: string) {
  const sanitizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${sanitizedBase}${normalizedPath}`;
}

type ApiErrorPayload = {
  ok?: boolean;
  success?: false;
  code?: string;
  message?: string;
  error?: string | { code?: string; message?: string };
  errors?: Array<{ campo?: string; mensaje?: string; codigo?: string }>;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: ApiErrorPayload;

  constructor(
    status: number,
    message: string,
    payload?: ApiErrorPayload,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.code = code;
  }
}

type ApiFetchOptions = {
  token?: string;
  sessionId?: string;
  idempotencyKey?: string;
  local?: boolean;
  skipAuthRecovery?: boolean;
  _authRetryAttempt?: number;
};

type SessionRefreshResult = {
  ok: boolean;
  token?: string;
};

let pendingSessionRefresh: Promise<SessionRefreshResult> | null = null;

export function resetAuthRecoveryCache(): void {
  pendingSessionRefresh = null;
}

function isAuthSessionPath(path: string): boolean {
  return path === "/api/auth/session" || path.startsWith("/api/auth/session?");
}

function shouldTryAuthRecovery(
  path: string,
  response: Response,
  payload: ApiErrorPayload,
  options?: ApiFetchOptions,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (options?.skipAuthRecovery) {
    return false;
  }

  if ((options?._authRetryAttempt ?? 0) > 0) {
    return false;
  }

  if (isAuthSessionPath(path)) {
    return false;
  }

  if (response.status === 401) {
    return true;
  }

  const payloadMessage = getPayloadMessage(payload);

  return (
    (payload.ok === false || payload.success === false) &&
    /token|autorizad|sesi[oó]n|session/i.test(payloadMessage)
  );
}

function getPayloadErrorObject(payload?: ApiErrorPayload) {
  const errorValue = payload?.error;
  return errorValue && typeof errorValue === "object"
    ? (errorValue as { code?: string; message?: string })
    : undefined;
}

function getPayloadMessage(payload?: ApiErrorPayload, fallback = "") {
  if (typeof payload?.message === "string" && payload.message) {
    return payload.message;
  }

  if (typeof payload?.error === "string" && payload.error) {
    return payload.error;
  }

  const nestedError = getPayloadErrorObject(payload);
  if (typeof nestedError?.message === "string" && nestedError.message) {
    return nestedError.message;
  }

  return fallback;
}

function getPayloadCode(payload?: ApiErrorPayload) {
  if (typeof payload?.code === "string" && payload.code) {
    return payload.code;
  }

  const nestedError = getPayloadErrorObject(payload);
  return typeof nestedError?.code === "string" ? nestedError.code : undefined;
}

async function refreshBackendSessionFromFirebase(): Promise<SessionRefreshResult> {
  try {
    const [{ getFirebaseAuth, isFirebaseConfigured }] = await Promise.all([
      import("@/lib/firebase/client"),
    ]);

    if (!isFirebaseConfigured()) {
      return { ok: false };
    }

    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return { ok: false };
    }

    const firebaseIdToken = await currentUser.getIdToken(true);
    const sessionResponse = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firebaseIdToken }),
      credentials: "include",
    });

    if (!sessionResponse.ok) {
      return { ok: false };
    }

    const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as {
      data?: { token?: string };
    };

    const nextToken = sessionPayload.data?.token;
    return {
      ok: true,
      token: typeof nextToken === "string" ? nextToken : undefined,
    };
  } catch {
    return { ok: false };
  }
}

async function recoverAuthSession(): Promise<SessionRefreshResult> {
  if (!pendingSessionRefresh) {
    pendingSessionRefresh = refreshBackendSessionFromFirebase().finally(() => {
      pendingSessionRefresh = null;
    });
  }

  return pendingSessionRefresh;
}

function attachCsrfHeader(headers: Headers, useLocalProxy: boolean, method: string) {
  if (!useLocalProxy || typeof window === "undefined") {
    return;
  }

  const normalized = method.toUpperCase();
  if (normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS") {
    return;
  }

  const csrfToken = readCsrfTokenFromDocument();
  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }
}

function shouldUseLocalProxy(path: string, options?: ApiFetchOptions): boolean {
  if (options?.local !== undefined) {
    return options.local;
  }

  return (
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "development" &&
    path.startsWith("/api/")
  );
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: ApiFetchOptions,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});

  // Si el body es FormData, NO establecer Content-Type (el navegador lo maneja)
  // Si el body es otro tipo y no hay Content-Type, establecer application/json
  if (
    !headers.has("Content-Type") &&
    init.body !== undefined &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options?.sessionId) {
    headers.set("x-session-id", options.sessionId);
  }

  if (options?.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  if (typeof window !== "undefined") {
    try {
      const { getAppCheckToken } = await import("@/lib/firebase/client");
      const appCheckToken = await getAppCheckToken();
      if (appCheckToken) {
        headers.set("X-Firebase-AppCheck", appCheckToken);
      }
    } catch {
      // App Check es opcional hasta activar APP_CHECK_ENFORCED en backend.
    }
  }

  let response: Response;
  const useLocalProxy = shouldUseLocalProxy(path, options);
  const endpoint = useLocalProxy ? path : joinApiUrl(API_BASE, path);
  const method = (init.method ?? "GET").toUpperCase();
  attachCsrfHeader(headers, useLocalProxy, method);

  try {
    response = await fetch(endpoint, {
      ...init,
      headers,
      credentials: useLocalProxy ? "include" : init.credentials,
      cache:
        init.cache ??
        (typeof window !== "undefined" ? "no-store" : "force-cache"),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error de red al conectar con el backend";

    throw new ApiError(
      0,
      `No se pudo conectar con la API (${endpoint}): ${message}`,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload &
    T;

  if (
    shouldTryAuthRecovery(path, response, payload, options) &&
    (!response.ok || payload?.success === false || payload?.ok === false)
  ) {
    const sessionRecovery = await recoverAuthSession();

    if (sessionRecovery.ok) {
      const nextOptions: ApiFetchOptions = {
        ...options,
        _authRetryAttempt: (options?._authRetryAttempt ?? 0) + 1,
      };

      if (options?.token && sessionRecovery.token) {
        nextOptions.token = sessionRecovery.token;
      }

      return apiFetch<T>(path, init, nextOptions);
    }
  }

  if (!response.ok || payload?.success === false || payload?.ok === false) {
    const message = getPayloadMessage(payload, `Error HTTP ${response.status}`);
    throw new ApiError(response.status, message, payload, getPayloadCode(payload));
  }

  return payload as T;
}

export function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}
