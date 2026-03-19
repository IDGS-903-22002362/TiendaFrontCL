import { ApiError, apiFetch, unwrapData } from "@/lib/api/client";
import type {
  AiAdminMetrics,
  AiAttachment,
  AiChatResult,
  AiConversationSyncState,
  AiMessage,
  AiSession,
  AiSessionDetail,
  AiSseError,
  AiSseHandlers,
  AiToolCall,
  CreateAiSessionInput,
  CreateTryOnJobInput,
  SendAiMessageInput,
  TryOnAsset,
  TryOnJob,
} from "@/lib/ai/types";
import type { UserRole } from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

type ApiEnvelope<T> = {
  success?: boolean;
  count?: number;
  data?: T;
  message?: string;
};

function getLocalOptions() {
  return { local: true as const };
}

function toRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return fallback;
}

function normalizeTimestamp(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  if (typeof value === "number") {
    const ms = value > 9999999999 ? value : value * 1000;
    return new Date(ms).toISOString();
  }

  if (typeof value === "object") {
    const record = value as UnknownRecord;
    const seconds = Number(record._seconds ?? record.seconds);
    const nanoseconds = Number(record._nanoseconds ?? record.nanoseconds ?? 0);

    if (Number.isFinite(seconds)) {
      return new Date(
        seconds * 1000 + Math.floor(nanoseconds / 1_000_000),
      ).toISOString();
    }
  }

  return null;
}

function toArray<T>(value: unknown, mapper: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(mapper);
}

function pickFirstString(
  record: UnknownRecord,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = record[key];
    const normalized = toStringValue(value);
    if (normalized) {
      return normalized;
    }
  }

  return fallback;
}

function asRole(value: unknown): UserRole {
  if (value === "ADMIN" || value === "EMPLEADO" || value === "CLIENTE") {
    return value;
  }

  return "CLIENTE";
}

function mapAttachment(input: unknown): AiAttachment {
  const record = toRecord(input);
  return {
    assetId: toStringValue(record.assetId ?? record.id),
    url: toStringValue(record.url) || undefined,
    mimeType: toStringValue(record.mimeType, "application/octet-stream"),
    kind:
      (toStringValue(record.kind, "generic") as AiAttachment["kind"]) ??
      "generic",
  };
}

function mapSession(input: unknown): AiSession {
  const record = toRecord(input);

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.userId),
    role: asRole(record.role),
    channel: toStringValue(record.channel, "app"),
    title: toStringValue(record.title, "Nueva conversacion"),
    status:
      (toStringValue(record.status, "active") as AiSession["status"]) ??
      "active",
    summary: toStringValue(record.summary) || undefined,
    lastMessageAt: normalizeTimestamp(record.lastMessageAt),
    createdAt: normalizeTimestamp(record.createdAt),
    updatedAt: normalizeTimestamp(record.updatedAt),
  };
}

function mapMessage(input: unknown): AiMessage {
  const record = toRecord(input);
  const tokenUsage = toRecord(record.tokenUsage);
  const content = pickFirstString(record, [
    "content",
    "text",
    "message",
    "response",
    "outputText",
    "assistantMessage",
  ]);

  return {
    id: toStringValue(record.id),
    sessionId: toStringValue(record.sessionId),
    userId: toStringValue(record.userId),
    role:
      (toStringValue(record.role, "assistant") as AiMessage["role"]) ??
      "assistant",
    content,
    model: toStringValue(record.model) || undefined,
    attachments: toArray(record.attachments, mapAttachment),
    toolCallIds: toArray(record.toolCallIds, (item) =>
      toStringValue(item),
    ).filter(Boolean),
    latencyMs: Number.isFinite(Number(record.latencyMs))
      ? Number(record.latencyMs)
      : undefined,
    tokenUsage:
      Object.keys(tokenUsage).length > 0
        ? {
            promptTokens: toNumber(tokenUsage.promptTokens, NaN),
            responseTokens: toNumber(tokenUsage.responseTokens, NaN),
            totalTokens: toNumber(tokenUsage.totalTokens, NaN),
          }
        : undefined,
    createdAt: normalizeTimestamp(record.createdAt),
  };
}

function mapToolCall(input: unknown): AiToolCall {
  const record = toRecord(input);

  return {
    id: toStringValue(record.id),
    sessionId: toStringValue(record.sessionId),
    messageId: toStringValue(record.messageId),
    userId: toStringValue(record.userId),
    toolName: toStringValue(record.toolName),
    input: toRecord(record.input),
    output:
      record.output && typeof record.output === "object"
        ? (record.output as Record<string, unknown>)
        : undefined,
    status:
      (toStringValue(record.status, "success") as AiToolCall["status"]) ??
      "success",
    durationMs: Number.isFinite(Number(record.durationMs))
      ? Number(record.durationMs)
      : undefined,
    errorCode: toStringValue(record.errorCode) || undefined,
    errorMessage: toStringValue(record.errorMessage) || undefined,
    createdAt: normalizeTimestamp(record.createdAt),
  };
}

function mapTryOnAsset(input: unknown): TryOnAsset {
  const record = toRecord(input);

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.userId),
    sessionId: toStringValue(record.sessionId) || undefined,
    jobId: toStringValue(record.jobId) || undefined,
    productId: toStringValue(record.productId) || undefined,
    variantId: toStringValue(record.variantId) || undefined,
    sku: toStringValue(record.sku) || undefined,
    kind:
      (toStringValue(record.kind, "user_upload") as TryOnAsset["kind"]) ??
      "user_upload",
    bucket: toStringValue(record.bucket),
    objectPath: toStringValue(record.objectPath),
    mimeType: toStringValue(record.mimeType),
    fileName: toStringValue(record.fileName),
    sizeBytes: toNumber(record.sizeBytes),
    width: Number.isFinite(Number(record.width))
      ? Number(record.width)
      : undefined,
    height: Number.isFinite(Number(record.height))
      ? Number(record.height)
      : undefined,
    sha256: toStringValue(record.sha256) || undefined,
    createdAt: normalizeTimestamp(record.createdAt),
    updatedAt: normalizeTimestamp(record.updatedAt),
  };
}

function mapTryOnJob(input: unknown): TryOnJob {
  const record = toRecord(input);

  return {
    id: toStringValue(record.id),
    userId: toStringValue(record.userId),
    sessionId: toStringValue(record.sessionId),
    productId: toStringValue(record.productId),
    variantId: toStringValue(record.variantId) || undefined,
    sku: toStringValue(record.sku) || undefined,
    inputUserImageAssetId: toStringValue(record.inputUserImageAssetId),
    inputUserImageUrl: toStringValue(record.inputUserImageUrl) || undefined,
    inputProductImageUrl: toStringValue(record.inputProductImageUrl),
    outputAssetId: toStringValue(record.outputAssetId) || undefined,
    outputImageUrl: toStringValue(record.outputImageUrl) || undefined,
    status:
      (toStringValue(record.status, "queued") as TryOnJob["status"]) ??
      "queued",
    consentAccepted: toBoolean(record.consentAccepted),
    requestedByRole: asRole(record.requestedByRole),
    errorCode: toStringValue(record.errorCode) || undefined,
    errorMessage: toStringValue(record.errorMessage) || undefined,
    providerJobId: toStringValue(record.providerJobId) || undefined,
    createdAt: normalizeTimestamp(record.createdAt),
    updatedAt: normalizeTimestamp(record.updatedAt),
    completedAt: normalizeTimestamp(record.completedAt),
  };
}

function mapChatResult(input: unknown): AiChatResult {
  const record = toRecord(input);
  const nestedData = toRecord(record.data);
  const text =
    pickFirstString(record, [
      "text",
      "content",
      "message",
      "response",
      "outputText",
      "assistantMessage",
    ]) ||
    pickFirstString(nestedData, [
      "text",
      "content",
      "message",
      "response",
      "outputText",
      "assistantMessage",
    ]);

  return {
    text,
    toolCalls: toArray(record.toolCalls ?? nestedData.toolCalls, (item) => {
      const tool = toRecord(item);
      return {
        id: toStringValue(tool.id),
        toolName: toStringValue(tool.toolName),
        status: toStringValue(tool.status),
      };
    }),
    model: toStringValue(record.model ?? nestedData.model) || undefined,
    latencyMs: Number.isFinite(Number(record.latencyMs ?? nestedData.latencyMs))
      ? Number(record.latencyMs ?? nestedData.latencyMs)
      : undefined,
  };
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}`;
}

async function parseTextPayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as UnknownRecord;
  } catch {
    return { message: text };
  }
}

function getResponseMessage(payload: UnknownRecord, fallback: string) {
  const errorRecord = toRecord(payload.error);
  const message = toStringValue(
    payload.message ?? payload.error ?? errorRecord.message,
  );
  return message || fallback;
}

function getResponseCode(payload: UnknownRecord) {
  const errorRecord = toRecord(payload.error);
  const code = toStringValue(errorRecord.code);
  return code || undefined;
}

function createAiStreamError(
  payload: UnknownRecord,
  fallback: string,
): AiSseError {
  const error = new Error(getResponseMessage(payload, fallback)) as AiSseError;
  const code = getResponseCode(payload);
  if (code) {
    error.code = code;
  }
  return error;
}

export function isAiStreamingConfigError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const code = (error as AiSseError).code?.toLowerCase() ?? "";

  const hasCallingModeHint =
    message.includes("calling mode") ||
    message.includes("allowed") ||
    message.includes("stream");

  return code === "invalid_argument" && hasCallingModeHint;
}

function splitSseChunks(buffer: string) {
  return buffer.replace(/\r\n/g, "\n").split("\n\n");
}

function parseSseChunk(chunk: string) {
  const lines = chunk
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const event =
    lines
      .find((line) => line.startsWith("event:"))
      ?.replace("event:", "")
      .trim() || "message";

  const dataLine = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace("data:", "").trim())
    .join("");

  return { event, dataLine };
}

function logAiDebug(label: string, payload?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (payload === undefined) {
    console.log(`[ai-debug] ${label}`);
    return;
  }

  console.log(`[ai-debug] ${label}`, payload);
}

function extractErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const payload = error.payload as UnknownRecord | undefined;
    return getResponseMessage(payload ?? {}, error.message);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

export function isFirestoreIndexError(error: unknown) {
  const message = extractErrorMessage(error);
  return /FAILED_PRECONDITION|requires an index|create_composite|query requires an index/i.test(
    message,
  );
}

export function getAiConversationSyncState(
  error: unknown,
): AiConversationSyncState {
  return isFirestoreIndexError(error) ? "degraded_missing_index" : "ready";
}

export async function createAiSession(input: CreateAiSessionInput = {}) {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    "/api/ai/chat/sessions",
    {
      method: "POST",
      body: JSON.stringify({
        channel: input.channel ?? "app",
        ...(input.title ? { title: input.title } : {}),
      }),
    },
    getLocalOptions(),
  );

  return mapSession(unwrapData(payload));
}

export async function listAiSessions() {
  const payload = await apiFetch<ApiEnvelope<unknown[]>>(
    "/api/ai/chat/sessions",
    { method: "GET" },
    getLocalOptions(),
  );

  return toArray(payload.data, mapSession);
}

export async function getAiSessionDetail(
  sessionId: string,
): Promise<AiSessionDetail> {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    `/api/ai/chat/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    getLocalOptions(),
  );

  const data = toRecord(unwrapData(payload));
  return {
    session: mapSession(data.session),
    messages: toArray(data.messages, mapMessage),
    toolCalls: toArray(data.toolCalls, mapToolCall),
  };
}

export async function sendAiMessageJson(body: SendAiMessageInput) {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    "/api/ai/chat/messages",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    getLocalOptions(),
  );

  return mapChatResult(unwrapData(payload));
}

export async function sendAiMessageSse(
  body: SendAiMessageInput,
  handlers: AiSseHandlers,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/ai/chat/messages?stream=true", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "x-request-id": createRequestId(),
    },
    body: JSON.stringify({
      ...body,
      stream: true,
    }),
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await parseTextPayload(response)) as UnknownRecord;
    logAiDebug("sse-response-error", {
      status: response.status,
      payload,
    });
    throw new ApiError(
      response.status,
      getResponseMessage(payload, "No se pudo abrir el stream AI"),
      payload,
    );
  }

  const responseContentType = response.headers.get("content-type") || "";
  logAiDebug("sse-response-meta", {
    status: response.status,
    contentType: responseContentType,
  });
  if (!responseContentType.includes("text/event-stream")) {
    const payload = (await parseTextPayload(response)) as UnknownRecord;
    const finalPayload = toRecord(unwrapData(payload as ApiEnvelope<unknown>));
    logAiDebug("sse-fallback-json", {
      payload,
      finalPayload,
    });

    if (Object.keys(finalPayload).length > 0) {
      handlers.onFinal?.(mapChatResult(finalPayload));
      return;
    }

    throw new ApiError(
      response.status,
      getResponseMessage(
        payload,
        "La respuesta AI no contiene datos renderizables",
      ),
      payload,
    );
  }

  if (!response.body) {
    throw new ApiError(response.status, "El stream AI no incluye body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneReceived = false;

  const processChunk = (chunk: string) => {
    const { event, dataLine } = parseSseChunk(chunk);
    logAiDebug("sse-chunk", {
      event,
      dataLine,
    });

    if (!dataLine) {
      if (event === "done") {
        doneReceived = true;
      }
      return;
    }

    const payload = JSON.parse(dataLine) as UnknownRecord;
    const finalPayload = toRecord(unwrapData(payload as ApiEnvelope<unknown>));
    logAiDebug("sse-payload", {
      event,
      payload,
      finalPayload,
    });

    if (event === "status") {
      handlers.onStatus?.({
        status: toStringValue(payload.status, "processing"),
      });
      return;
    }

    if (event === "final" || event === "message" || event === "result") {
      handlers.onFinal?.(mapChatResult(finalPayload));
      return;
    }

    if (event === "error") {
      logAiDebug("sse-error-payload", payload);
      handlers.onError?.(createAiStreamError(payload, "El stream AI fallo"));
      return;
    }

    if (event === "done") {
      doneReceived = true;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      const remainingChunk = buffer.trim();
      if (remainingChunk) {
        try {
          processChunk(remainingChunk);
        } catch (error) {
          handlers.onError?.(
            error instanceof Error
              ? error
              : new Error("No se pudo interpretar la respuesta AI"),
          );
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = splitSseChunks(buffer);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      if (!chunk.trim()) {
        continue;
      }

      try {
        processChunk(chunk);
        if (doneReceived) {
          return;
        }
      } catch (error) {
        handlers.onError?.(
          error instanceof Error
            ? error
            : new Error("No se pudo interpretar la respuesta AI"),
        );
      }
    }
  }
}

export async function uploadAiUserImage(file: File, sessionId?: string) {
  const formData = new FormData();
  formData.append("file", file);

  if (sessionId) {
    formData.append("sessionId", sessionId);
  }

  const response = await fetch("/api/ai/files/upload", {
    method: "POST",
    headers: {
      "x-request-id": createRequestId(),
    },
    body: formData,
    credentials: "include",
    cache: "no-store",
  });

  const payload = (await parseTextPayload(response)) as UnknownRecord;

  if (!response.ok || !("data" in payload)) {
    throw new ApiError(
      response.status,
      getResponseMessage(payload, "No se pudo subir la imagen"),
      payload,
    );
  }

  return mapTryOnAsset(payload.data);
}

export async function createTryOnJob(input: CreateTryOnJobInput) {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    "/api/ai/tryon/jobs",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    getLocalOptions(),
  );

  return mapTryOnJob(unwrapData(payload));
}

export async function listTryOnJobs() {
  const payload = await apiFetch<ApiEnvelope<unknown[]>>(
    "/api/ai/tryon/jobs",
    { method: "GET" },
    getLocalOptions(),
  );

  return toArray(payload.data, mapTryOnJob);
}

export async function getTryOnJob(jobId: string) {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    `/api/ai/tryon/jobs/${encodeURIComponent(jobId)}`,
    { method: "GET" },
    getLocalOptions(),
  );

  return mapTryOnJob(unwrapData(payload));
}

export async function pollTryOnUntilFinished(
  jobId: string,
  intervalMs = 4000,
  timeoutMs = 120000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const job = await getTryOnJob(jobId);
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timeout esperando el resultado del try-on");
}

export async function getTryOnDownloadLink(jobId: string) {
  const payload = await apiFetch<
    ApiEnvelope<{ jobId?: string; url?: string; expiresInSec?: number }>
  >(
    `/api/ai/tryon/jobs/${encodeURIComponent(jobId)}/download`,
    { method: "GET" },
    getLocalOptions(),
  );

  const data = toRecord(unwrapData(payload));

  return {
    jobId: toStringValue(data.jobId),
    url: toStringValue(data.url),
    expiresInSec: toNumber(data.expiresInSec),
  };
}

export async function getAiAdminMetrics() {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    "/api/ai/admin/metrics",
    { method: "GET" },
    getLocalOptions(),
  );

  const data = toRecord(unwrapData(payload));

  return {
    sessions: toNumber(data.sessions),
    messages: toNumber(data.messages),
    toolCalls: toNumber(data.toolCalls),
    tryOnJobs: toNumber(data.tryOnJobs),
  } satisfies AiAdminMetrics;
}

export async function listAiAdminJobs() {
  const payload = await apiFetch<ApiEnvelope<unknown[]>>(
    "/api/ai/admin/jobs",
    { method: "GET" },
    getLocalOptions(),
  );

  return toArray(payload.data, mapTryOnJob);
}
