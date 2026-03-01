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
};

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
