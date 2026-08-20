/**
 * Cliente del Asistente Administrativo.
 *
 * Usa el mismo proxy `/api/ai/*` que el resto de la IA (Bearer + App Check +
 * CSRF los adjunta `prepareApiRequest`). El backend valida rol admin.
 */

import { ApiError, apiFetch, prepareApiRequest, unwrapData } from "@/lib/api/client";
import {
  normalizeAdminReport,
  normalizeAdminReportTrace,
} from "@/lib/ai/admin-report";
import type {
  AdminAssistantSession,
  AdminAssistantStreamHandlers,
  AdminAssistantTurn,
  AdminReportResult,
} from "@/lib/ai/admin-report-types";

type UnknownRecord = Record<string, unknown>;

type ApiEnvelope<T> = {
  success?: boolean;
  count?: number;
  data?: T;
  message?: string;
};

const LOCAL = { local: true as const };

function toRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

function toIsoOrNull(value: unknown): string | null {
  const text = toText(value);
  if (!text) {
    return null;
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function mapSession(input: unknown): AdminAssistantSession {
  const record = toRecord(input);

  return {
    id: toText(record.id),
    userId: toText(record.userId),
    title: toText(record.title, "Analisis"),
    turns: Number(record.turns) || 0,
    createdAt: toIsoOrNull(record.createdAt),
    updatedAt: toIsoOrNull(record.updatedAt),
  };
}

function mapTurn(input: unknown): AdminAssistantTurn {
  const record = toRecord(input);

  return {
    id: toText(record.id),
    sessionId: toText(record.sessionId),
    question: toText(record.question),
    summary: toText(record.summary),
    report: normalizeAdminReport(record.report),
    trace: record.trace ? normalizeAdminReportTrace(record.trace) : null,
    success: record.success !== false,
    createdAt: toIsoOrNull(record.createdAt),
  };
}

function mapResult(input: unknown): AdminReportResult | null {
  const record = toRecord(input);
  const report = normalizeAdminReport(record.report);

  return report
    ? { report, trace: normalizeAdminReportTrace(record.trace) }
    : null;
}

export async function createAdminAssistantSession(title?: string) {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    "/api/ai/admin/assistant/sessions",
    {
      method: "POST",
      body: JSON.stringify(title ? { title } : {}),
    },
    LOCAL,
  );

  return mapSession(unwrapData(payload));
}

export async function listAdminAssistantSessions() {
  const payload = await apiFetch<ApiEnvelope<unknown[]>>(
    "/api/ai/admin/assistant/sessions",
    { method: "GET" },
    LOCAL,
  );

  return (Array.isArray(payload.data) ? payload.data : []).map(mapSession);
}

export async function getAdminAssistantSessionDetail(sessionId: string) {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    `/api/ai/admin/assistant/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    LOCAL,
  );

  const data = toRecord(unwrapData(payload));

  return {
    session: mapSession(data.session),
    turns: (Array.isArray(data.turns) ? data.turns : []).map(mapTurn),
  };
}

export async function askAdminAssistantJson(input: {
  sessionId: string;
  question: string;
}) {
  const payload = await apiFetch<ApiEnvelope<unknown>>(
    "/api/ai/admin/assistant/messages",
    { method: "POST", body: JSON.stringify(input) },
    LOCAL,
  );

  const result = mapResult(unwrapData(payload));
  if (!result) {
    throw new ApiError(502, "El asistente no devolvio un informe legible");
  }

  return result;
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

  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace("data:", "").trim())
    .join("");

  return { event, data };
}

async function parseErrorPayload(response: Response): Promise<UnknownRecord> {
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

/**
 * Ejecuta la consulta con SSE para mostrar el avance del analisis.
 * Si el entorno no entrega `text/event-stream`, cae al JSON de la misma ruta.
 */
export async function askAdminAssistantStream(
  input: { sessionId: string; question: string },
  handlers: AdminAssistantStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const path = "/api/ai/admin/assistant/messages?stream=true";
  const init: RequestInit = {
    method: "POST",
    headers: { Accept: "text/event-stream" },
    body: JSON.stringify({ ...input, stream: true }),
    credentials: "include",
    cache: "no-store",
    signal,
  };

  const { endpoint, headers } = await prepareApiRequest(path, init, LOCAL);
  const response = await fetch(endpoint, { ...init, headers });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const errorRecord = toRecord(payload.error);
    throw new ApiError(
      response.status,
      toText(payload.message) ||
        toText(errorRecord.message) ||
        "No se pudo iniciar el analisis administrativo",
      payload,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    const payload = (await parseErrorPayload(response)) as ApiEnvelope<unknown>;
    const result = mapResult(unwrapData(payload));
    if (!result) {
      throw new ApiError(502, "El asistente no devolvio un informe legible");
    }

    handlers.onFinal?.(result);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalReceived = false;

  const processChunk = (chunk: string) => {
    const { event, data } = parseSseChunk(chunk);
    if (!data) {
      return false;
    }

    const payload = JSON.parse(data) as UnknownRecord;

    if (event === "status") {
      handlers.onStatus?.(toText(payload.status, "Analizando..."));
      return false;
    }

    if (event === "final") {
      const result = mapResult(payload);
      if (!result) {
        throw new Error("El informe recibido no es legible");
      }

      finalReceived = true;
      handlers.onFinal?.(result);
      return false;
    }

    if (event === "error") {
      throw new Error(
        toText(payload.message) || "El analisis administrativo fallo",
      );
    }

    return event === "done";
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const rest = buffer.trim();
        if (rest) {
          processChunk(rest);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.replace(/\r\n/g, "\n").split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        if (chunk.trim() && processChunk(chunk) && finalReceived) {
          return;
        }
      }
    }

    if (!finalReceived) {
      throw new Error("El analisis termino sin entregar un informe");
    }
  } catch (error) {
    const streamError =
      error instanceof Error
        ? error
        : new Error("No se pudo interpretar la respuesta del asistente");
    handlers.onError?.(streamError);
    throw streamError;
  }
}
