"use client";

import * as React from "react";
import {
  History,
  Loader2,
  MessageSquarePlus,
  Search,
  SendHorizonal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminInlineAlert,
  AdminPanelCard,
} from "@/components/admin/admin-ui";
import { AdminReportView } from "@/components/admin/asistente/admin-report-view";
import {
  askAdminAssistantStream,
  createAdminAssistantSession,
  getAdminAssistantSessionDetail,
  listAdminAssistantSessions,
} from "@/lib/api/ai-admin-assistant";
import { getApiErrorMessage } from "@/lib/api/errors";
import type {
  AdminAssistantSession,
  AdminReport,
  AdminReportTrace,
} from "@/lib/ai/admin-report-types";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "¿Cómo vamos esta semana?",
  "¿Cómo está nuestro tráfico?",
  "¿Qué productos están llamando más la atención?",
  "¿Dónde perdemos más clientes en el funnel?",
  "¿Qué productos tienen muchas visitas y pocas ventas?",
  "¿Ves alguna anomalía?",
  "Proyecta las ventas de los próximos 7 días.",
];

type Turn = {
  id: string;
  question: string;
  report: AdminReport | null;
  trace: AdminReportTrace | null;
  error?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function TraceDetails({ trace }: { trace: AdminReportTrace }) {
  if (trace.toolCalls.length === 0) {
    return null;
  }

  return (
    <details className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
      <summary className="cursor-pointer text-xs font-medium text-text-secondary">
        Consultas usadas ({trace.toolCalls.length}) ·{" "}
        {Math.round(trace.durationMs / 100) / 10}s
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-text-muted">
        {trace.toolCalls.map((call, index) => (
          <li key={`${call.toolName}-${index}`} className="flex flex-wrap gap-2">
            <span className="font-medium text-text-secondary">
              {call.toolName}
            </span>
            {call.periodLabel ? <span>periodo: {call.periodLabel}</span> : null}
            <span>{call.durationMs} ms</span>
            {call.success ? null : (
              <span className="text-destructive">
                falló{call.errorMessage ? `: ${call.errorMessage}` : ""}
              </span>
            )}
          </li>
        ))}
      </ul>
      {trace.forecasts && trace.forecasts.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-text-muted">
          {trace.forecasts.map((forecast, index) => (
            <li key={`${forecast.metric}-${index}`}>
              Pronóstico de {forecast.metric}: modelo {forecast.method} sobre{" "}
              {forecast.observations} observaciones, horizonte {forecast.horizon}{" "}
              días, calidad {forecast.quality}
              {forecast.mae === null
                ? ""
                : `, error medio ${Math.round(forecast.mae * 100) / 100}`}
              .
            </li>
          ))}
        </ul>
      ) : null}
      {trace.anomaliesDetected ? (
        <p className="mt-2 text-xs text-text-muted">
          Anomalías detectadas por las herramientas: {trace.anomaliesDetected}.
        </p>
      ) : null}
      {trace.reachedToolLimit ? (
        <p className="mt-2 text-xs text-amber-700">
          Se alcanzó el límite de consultas por pregunta; el informe usa la
          evidencia obtenida hasta ese punto.
        </p>
      ) : null}
    </details>
  );
}

export function AdminAssistantPanel() {
  const [sessions, setSessions] = React.useState<AdminAssistantSession[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [question, setQuestion] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [isBooting, setIsBooting] = React.useState(true);
  const [isAsking, setIsAsking] = React.useState(false);
  const [isLoadingSession, setIsLoadingSession] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshSessions = React.useCallback(async () => {
    const list = await listAdminAssistantSessions();
    setSessions(list);
    return list;
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const list = await listAdminAssistantSessions();
        if (cancelled) return;

        setSessions(list);
        if (list.length > 0) {
          setSessionId(list[0].id);
        } else {
          const created = await createAdminAssistantSession();
          if (cancelled) return;
          setSessions([created]);
          setSessionId(created.id);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(getApiErrorMessage(caught));
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const openSession = React.useCallback(async (id: string) => {
    setSessionId(id);
    setIsLoadingSession(true);
    setError(null);

    try {
      const detail = await getAdminAssistantSessionDetail(id);
      setTurns(
        detail.turns.map((turn) => ({
          id: turn.id,
          question: turn.question,
          report: turn.report,
          trace: turn.trace,
        })),
      );
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  React.useEffect(() => {
    if (!sessionId) {
      return;
    }

    void openSession(sessionId);
    // openSession es estable; solo recargamos al cambiar de sesion.
  }, [sessionId, openSession]);

  const startNewSession = async () => {
    setError(null);

    try {
      const created = await createAdminAssistantSession();
      setSessions((current) => [created, ...current]);
      setTurns([]);
      setSessionId(created.id);
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    }
  };

  const ask = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || !sessionId || isAsking) {
      return;
    }

    const pendingId = `pending-${Date.now()}`;
    setIsAsking(true);
    setError(null);
    setStatus("Interpretando la pregunta...");
    setQuestion("");
    setTurns((current) => [
      ...current,
      { id: pendingId, question: trimmed, report: null, trace: null },
    ]);

    try {
      await askAdminAssistantStream(
        { sessionId, question: trimmed },
        {
          onStatus: (value) => setStatus(value),
          onFinal: (result) => {
            setTurns((current) =>
              current.map((turn) =>
                turn.id === pendingId
                  ? { ...turn, report: result.report, trace: result.trace }
                  : turn,
              ),
            );
          },
        },
      );

      await refreshSessions();
    } catch (caught) {
      // El error se muestra dentro del turno afectado, no como alerta global.
      const message = getApiErrorMessage(caught);
      setTurns((current) =>
        current.map((turn) =>
          turn.id === pendingId ? { ...turn, error: message } : turn,
        ),
      );
    } finally {
      setIsAsking(false);
      setStatus(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void ask(question);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex flex-col gap-6">
        <AdminPanelCard
          title="Consulta"
          description="Pregunta en lenguaje natural sobre ventas, pedidos, productos, categorías, inventario, promociones o clientes."
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="admin-assistant-question" className="sr-only">
              Consulta administrativa
            </label>
            <Textarea
              id="admin-assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej. ¿Por qué bajaron las ventas esta semana?"
              rows={3}
              disabled={isBooting || isAsking}
              className="resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                El asistente solo lee datos: consulta la información real de la
                tienda y no ejecuta cambios.
              </p>
              <Button
                type="submit"
                disabled={isBooting || isAsking || !question.trim()}
              >
                {isAsking ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <SendHorizonal className="size-4" aria-hidden />
                )}
                {isAsking ? "Analizando" : "Analizar"}
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                disabled={isBooting || isAsking}
                onClick={() => void ask(suggestion)}
                className="h-auto whitespace-normal py-1.5 text-xs font-normal"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </AdminPanelCard>

        {error ? <AdminInlineAlert>{error}</AdminInlineAlert> : null}

        {isBooting || isLoadingSession ? (
          <AdminPanelCard>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </AdminPanelCard>
        ) : null}

        {!isBooting && !isLoadingSession && turns.length === 0 ? (
          <AdminPanelCard>
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Search className="size-6 text-text-muted" aria-hidden />
              <p className="text-sm font-medium text-foreground">
                Sin análisis en esta sesión
              </p>
              <p className="max-w-md text-sm text-text-secondary">
                Escribe una pregunta o elige una sugerencia. El asistente
                consultará los datos reales de la tienda y devolverá un informe
                con indicadores, tablas y gráficas cuando aporten.
              </p>
            </div>
          </AdminPanelCard>
        ) : null}

        {turns.map((turn, index) => (
          <AdminPanelCard key={turn.id} title={turn.question}>
            {turn.report ? (
              <div className="flex flex-col gap-5">
                <AdminReportView
                  report={turn.report}
                  // Solo el ultimo turno ofrece seguimiento: las sugerencias de
                  // turnos anteriores ya no corresponden al contexto actual.
                  onSuggestionSelect={
                    index === turns.length - 1
                      ? (suggestion) => void ask(suggestion)
                      : undefined
                  }
                  suggestionsDisabled={isAsking}
                />
                {turn.trace ? <TraceDetails trace={turn.trace} /> : null}
              </div>
            ) : turn.error ? (
              <AdminInlineAlert>{turn.error}</AdminInlineAlert>
            ) : (
              <div
                className="flex items-center gap-2 text-sm text-text-secondary"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {status || "Analizando..."}
              </div>
            )}
          </AdminPanelCard>
        ))}
      </div>

      <aside className="flex flex-col gap-3">
        <AdminPanelCard
          title="Sesiones"
          description="Las preguntas de seguimiento usan el contexto de la sesión activa."
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void startNewSession()}
              disabled={isAsking}
            >
              <MessageSquarePlus className="size-4" aria-hidden />
              Nueva
            </Button>
          }
          contentClassName="p-0"
          noPadding
        >
          {isBooting ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">
              Aún no hay sesiones guardadas.
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {sessions.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => void openSession(session.id)}
                    disabled={isAsking}
                    aria-current={session.id === sessionId ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                      session.id === sessionId && "bg-muted/60",
                    )}
                  >
                    <span className="line-clamp-2 text-sm font-medium text-foreground">
                      {session.title}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-text-muted">
                      <History className="size-3" aria-hidden />
                      {formatDateTime(session.updatedAt)}
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {session.turns} consulta
                        {session.turns === 1 ? "" : "s"}
                      </Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminPanelCard>
      </aside>
    </div>
  );
}
