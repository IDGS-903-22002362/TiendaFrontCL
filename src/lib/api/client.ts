const FALLBACK_API_BASE = "http://localhost:3000/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  FALLBACK_API_BASE;

type ApiErrorPayload = {
  success?: false;
  message?: string;
  error?: string;
  errors?: Array<{ campo?: string; mensaje?: string; codigo?: string }>;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
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

  const payloadMessage =
    typeof payload.message === "string"
      ? payload.message
      : typeof payload.error === "string"
        ? payload.error
        : "";

  return (
    payload.success === false &&
    /token|autorizad|sesi[oó]n|session/i.test(payloadMessage)
  );
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

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: ApiFetchOptions,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});

  if (!headers.has("Content-Type") && init.body !== undefined) {
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

  let response: Response;
  const endpoint = options?.local ? path : `${API_BASE}${path}`;

  try {
    response = await fetch(endpoint, {
      ...init,
      headers,
      credentials: options?.local ? "include" : init.credentials,
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
    (!response.ok || payload?.success === false)
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

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.message || payload?.error || `Error HTTP ${response.status}`;
    throw new ApiError(response.status, message, payload);
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
