"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronDown,
  Clock,
  History,
  Layers,
  Lightbulb,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AdminInlineAlert } from "@/components/admin/admin-ui";
import { AdminReportView } from "@/components/admin/asistente/admin-report-view";
import { GeminiSparkle } from "@/components/admin/asistente/gemini-sparkle";
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

interface SuggestionCard {
  icon: React.ElementType;
  category: string;
  question: string;
  badge?: string;
  colorClass: string;
}

const PROMPT_SUGGESTIONS: SuggestionCard[] = [
  {
    icon: TrendingUp,
    category: "Ventas & Tendencias",
    question: "¿Qué debería saber esta semana?",
    badge: "Ejecutivo",
    colorClass: "from-emerald-500/20 via-teal-500/10 to-transparent text-emerald-600",
  },
  {
    icon: Zap,
    category: "Prioridades Críticas",
    question: "¿Qué deberíamos atender primero?",
    badge: "Urgente",
    colorClass: "from-amber-500/20 via-orange-500/10 to-transparent text-amber-600",
  },
  {
    icon: Lightbulb,
    category: "Oportunidades",
    question: "¿Dónde está la mayor oportunidad?",
    badge: "Crecimiento",
    colorClass: "from-indigo-500/20 via-blue-500/10 to-transparent text-indigo-600",
  },
  {
    icon: Package,
    category: "Afinidad de Catálogo",
    question: "¿Qué productos se compran juntos?",
    badge: "Cross-selling",
    colorClass: "from-purple-500/20 via-pink-500/10 to-transparent text-purple-600",
  },
  {
    icon: Users,
    category: "Retención & Cohortes",
    question: "¿Los clientes están regresando?",
    badge: "Lealtad",
    colorClass: "from-cyan-500/20 via-teal-500/10 to-transparent text-cyan-600",
  },
  {
    icon: BarChart3,
    category: "Simulación de Escenarios",
    question: "¿Qué pasaría si mejoramos la conversión 10%?",
    badge: "What-If",
    colorClass: "from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-600",
  },
];

const TOOL_LABELS: Record<string, string> = {
  get_sales_summary: "Ventas confirmadas",
  compare_sales_periods: "Comparación de ventas",
  get_sales_by_product: "Ventas por producto",
  get_sales_by_category: "Ventas por categoría",
  get_inventory_health: "Inventario",
  get_orders_metrics: "Pedidos",
  get_promotions_performance: "Promociones",
  get_customer_metrics: "Clientes agregados",
  get_traffic_summary: "Tráfico",
  get_conversion_funnel: "Embudo de conversión",
  get_product_interest: "Interés por producto",
  get_product_performance: "Desempeño de productos",
  get_traffic_sources: "Canales de tráfico",
  analyze_metric_relationships: "Relación entre métricas",
  forecast_metric: "Pronóstico estadístico",
  detect_business_anomalies: "Anomalías",
  prioritize_business_findings: "Prioridad de hallazgos",
  decompose_metric_change: "Descomposición matemática",
  simulate_business_scenario: "Simulación matemática",
  segment_products: "Segmentación de productos",
  get_customer_segments: "Segmentos de clientes",
  analyze_customer_cohorts: "Cohortes de clientes",
  analyze_product_affinity: "Afinidad de productos",
  get_business_brief: "Resumen de negocio",
};

type Turn = {
  id: string;
  question: string;
  report: AdminReport | null;
  trace: AdminReportTrace | null;
  error?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Reciente";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "Justo ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return formatDateTime(value);
}

function TraceDetails({ trace }: { trace: AdminReportTrace }) {
  if (trace.toolCalls.length === 0) return null;

  return (
    <details className="group rounded-2xl border border-border/70 bg-muted/20 px-4.5 py-3 transition-all text-xs">
      <summary className="flex cursor-pointer items-center justify-between font-medium text-text-secondary select-none">
        <span className="flex items-center gap-2">
          <Layers className="size-3.5 text-emerald-600" aria-hidden />
          <span>
            Telemetría de consultas ({trace.toolCalls.length}) · {Math.round(trace.durationMs / 100) / 10}s
          </span>
        </span>
        <span className="text-[10px] text-text-muted group-open:rotate-180 transition-transform">
          ▼
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-border/40">
        <div className="flex flex-wrap gap-1.5">
          {trace.toolCalls.map((call, index) => (
            <span
              key={`${call.toolName}-${index}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px]",
                call.success
                  ? "border-border/70 bg-background/80 text-text-secondary"
                  : "border-destructive/30 bg-destructive/5 text-destructive",
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="font-medium">
                {TOOL_LABELS[call.toolName] || call.toolName}
              </span>
              {call.periodLabel ? (
                <span className="text-text-muted">({call.periodLabel})</span>
              ) : null}
              <span className="text-[10px] text-text-muted font-mono">{call.durationMs}ms</span>
            </span>
          ))}
        </div>

        {trace.forecasts && trace.forecasts.length > 0 ? (
          <div className="mt-2 rounded-xl bg-background/60 p-2.5 text-[11px] text-text-muted">
            <span className="font-medium text-text-secondary">Modelos predictivos: </span>
            {trace.forecasts.map((f) => `${f.metric} (${f.method}, ${f.horizon}d, ${f.quality})`).join(" · ")}
          </div>
        ) : null}

        {trace.anomaliesDetected ? (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            ✦ {trace.anomaliesDetected} anomalía(s) identificadas y ponderadas en el informe.
          </p>
        ) : null}

        {trace.reachedToolLimit ? (
          <p className="text-[11px] text-amber-600 italic">
            Se alcanzó el límite de consultas; el informe se consolidó con la evidencia obtenida.
          </p>
        ) : null}
      </div>
    </details>
  );
}

export function AdminAssistantPanel() {
  const { user } = useAuth();
  const [sessions, setSessions] = React.useState<AdminAssistantSession[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [question, setQuestion] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [isBooting, setIsBooting] = React.useState(true);
  const [isAsking, setIsAsking] = React.useState(false);
  const [isLoadingSession, setIsLoadingSession] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = React.useState("");
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(true);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const turnsEndRef = React.useRef<HTMLDivElement>(null);

  const firstName = React.useMemo(() => {
    if (!user?.nombre) return "Administrador";
    return user.nombre.trim().split(" ")[0] || "Administrador";
  }, [user?.nombre]);

  const filteredSessions = React.useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const query = sessionSearch.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(query));
  }, [sessions, sessionSearch]);

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
    if (!sessionId) return;
    void openSession(sessionId);
  }, [sessionId, openSession]);

  React.useEffect(() => {
    if (turns.length > 0) {
      turnsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [turns, isAsking]);

  const startNewSession = async () => {
    setError(null);
    try {
      const created = await createAdminAssistantSession();
      setSessions((current) => [created, ...current]);
      setTurns([]);
      setSessionId(created.id);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    }
  };

  const ask = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || !sessionId || isAsking) return;

    const pendingId = `pending-${Date.now()}`;
    setIsAsking(true);
    setError(null);
    setStatus("Analizando consulta con Garritas IA...");
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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask(question);
    }
  };

  const hasTurns = turns.length > 0;

  return (
    <div
      className={cn(
        "relative grid min-h-[calc(100vh-8rem)] w-full gap-6 transition-all duration-300",
        isHistoryOpen
          ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]"
          : "grid-cols-1 max-w-5xl mx-auto",
      )}
    >
      {/* Main Analysis and Chat View */}
      <div className="relative flex flex-col justify-between min-w-0 w-full">
        {/* Top Floating Action Bar (Toggle History & Session Info) */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <GeminiSparkle size="sm" withHalo />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Garritas IA Studio
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startNewSession}
              disabled={isAsking}
              className="rounded-full border-border/80 bg-card hover:bg-muted text-xs font-medium px-3.5 shadow-2xs"
            >
              <MessageSquarePlus className="size-3.5 mr-1 text-emerald-600" aria-hidden />
              Nueva sesión
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen((prev) => !prev)}
              aria-label={isHistoryOpen ? "Ocultar historial" : "Mostrar historial"}
              className={cn(
                "rounded-full border-border/80 text-xs font-medium px-3 shadow-2xs transition-all",
                isHistoryOpen
                  ? "bg-muted/60 text-text-secondary"
                  : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
              )}
            >
              {isHistoryOpen ? (
                <>
                  <PanelRightClose className="size-3.5 mr-1" aria-hidden />
                  <span className="hidden sm:inline">Minimizar historial</span>
                </>
              ) : (
                <>
                  <History className="size-3.5 mr-1 text-emerald-600" aria-hidden />
                  <span>Historial ({sessions.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 flex flex-col gap-6 pb-36 sm:pb-44">
          {/* Welcome Hero Section (Prominent when empty, compact when chatting) */}
          {!hasTurns && !isBooting && !isLoadingSession && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-10 shadow-xs text-center flex flex-col items-center justify-center my-auto py-12"
            >
              <div
                className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-gradient-to-br from-emerald-500/10 via-teal-500/8 to-amber-500/8 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative flex flex-col items-center gap-3 max-w-2xl">
                <GeminiSparkle size="xl" withHalo />

                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-emerald-500/30 bg-emerald-500/5 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                  >
                    ✦ Garritas IA Engine
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full text-[11px] font-normal"
                  >
                    <ShieldCheck className="mr-1 size-3 text-emerald-600" aria-hidden />
                    Solo lectura · Datos en tiempo real
                  </Badge>
                </div>

                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground mt-2">
                  Hola, <span className="gemini-gradient-text">{firstName}</span>, ¿qué quieres analizar hoy?
                </h2>

                <p className="text-sm sm:text-base leading-relaxed text-text-secondary">
                  Escribe cualquier consulta sobre ventas, pedidos, inventario, comportamiento de clientes o escenarios comerciales.
                </p>
              </div>
            </motion.div>
          )}

          {/* Global Error Banner */}
          {error ? <AdminInlineAlert>{error}</AdminInlineAlert> : null}

          {/* Suggested Queries Grid (When no conversation is active) */}
          {!hasTurns && !isBooting && !isLoadingSession ? (
            <div className="flex flex-col gap-3.5 max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Sugerencias de análisis ejecutivo
                </p>
                <span className="text-[11px] text-text-muted">Haz clic para comenzar</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PROMPT_SUGGESTIONS.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <motion.button
                      key={suggestion.question}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      disabled={isBooting || isAsking}
                      onClick={() => void ask(suggestion.question)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("inline-flex size-8.5 items-center justify-center rounded-xl bg-gradient-to-br", suggestion.colorClass)}>
                          <Icon className="size-4" aria-hidden />
                        </span>
                        {suggestion.badge ? (
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                            {suggestion.badge}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                          {suggestion.category}
                        </p>
                        <p className="mt-1 text-xs sm:text-sm font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {suggestion.question}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted/40 text-text-muted transition-all group-hover:bg-emerald-500/10 group-hover:text-emerald-600 group-hover:translate-x-0.5">
                          <ArrowUpRight className="size-3.5" aria-hidden />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Loading state for booting or switching session */}
          {isBooting || isLoadingSession ? (
            <div className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card p-6 shadow-xs max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            </div>
          ) : null}

          {/* Active Conversation Turns (Centered Feed) */}
          <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <AnimatePresence mode="popLayout">
              {turns.map((turn, index) => (
                <motion.div
                  key={turn.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  {/* User Question Turn */}
                  <div className="flex items-start justify-end gap-3 pl-8 sm:pl-16">
                    <div className="flex flex-col items-end gap-1 max-w-2xl">
                      <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-emerald-800 to-emerald-950 px-5 py-3.5 text-white shadow-xs">
                        <p className="text-sm sm:text-base font-medium leading-relaxed">
                          {turn.question}
                        </p>
                      </div>
                      <span className="text-[10px] text-text-muted pr-1">Tú</span>
                    </div>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white font-semibold text-xs uppercase shadow-xs">
                      {firstName.charAt(0)}
                    </div>
                  </div>

                  {/* Gemini Assistant Response Turn */}
                  <div className="flex items-start gap-3 pr-2 sm:pr-8">
                    <div className="pt-1">
                      <GeminiSparkle size="md" withHalo />
                    </div>

                    <div className="flex flex-col gap-4 flex-1 min-w-0">
                      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
                        {turn.report ? (
                          <div className="flex flex-col gap-6">
                            <AdminReportView
                              report={turn.report}
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
                          /* Gemini Shimmer Thinking Wave State */
                          <div className="flex flex-col gap-4 py-3">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full w-full bg-gradient-to-r from-emerald-500 via-teal-400 via-indigo-500 to-amber-400 animate-gemini-shimmer" />
                            </div>

                            <div className="flex items-center gap-3 text-sm font-medium text-text-secondary">
                              <Loader2 className="size-4 animate-spin text-emerald-600" aria-hidden />
                              <span>{status || "Garritas IA está procesando la información..."}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                              <Skeleton className="h-20 rounded-xl" />
                              <Skeleton className="h-20 rounded-xl" />
                              <Skeleton className="h-20 rounded-xl" />
                              <Skeleton className="h-20 rounded-xl" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div ref={turnsEndRef} className="h-4" />
          </div>
        </div>

        {/* Floating Prompt Bar (Native Sticky Bottom-4 Centered within Middle Column) */}
        <div className="sticky bottom-4 z-30 w-full max-w-3xl mx-auto px-2 sm:px-4 mt-auto pt-4">
          <div className="relative rounded-3xl border border-border/90 bg-card/95 backdrop-blur-xl p-3 sm:p-4 gemini-composer-shadow transition-all duration-200">
              <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                <label htmlFor="admin-assistant-question" className="sr-only">
                  Consulta a Garritas IA
                </label>

                <div className="flex items-start gap-3">
                  <div className="pt-2 pl-1 hidden sm:block">
                    <GeminiSparkle size="sm" />
                  </div>
                  <Textarea
                    ref={textareaRef}
                    id="admin-assistant-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregúntale a Garritas IA sobre ventas, pedidos, inventario, clientes o escenarios..."
                    rows={2}
                    disabled={isBooting || isAsking}
                    className="min-h-[52px] max-h-[180px] w-full resize-none border-0 bg-transparent p-1 text-sm sm:text-base leading-relaxed text-foreground placeholder:text-text-muted focus-visible:ring-0 focus-visible:outline-none shadow-none"
                  />
                </div>

                {/* Composer Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-2">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                      <Sparkles className="size-3 text-emerald-600" aria-hidden />
                      Garritas IA Pro
                    </span>
                    <span className="hidden sm:inline text-[11px]">
                      Presiona <kbd className="rounded border border-border/80 bg-muted/70 px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> para enviar
                    </span>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isBooting || isAsking || !question.trim()}
                    className={cn(
                      "relative rounded-full px-5 py-2 text-xs font-semibold shadow-xs transition-all duration-200",
                      question.trim()
                        ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-500/20"
                        : "opacity-60",
                    )}
                  >
                    {isAsking ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        <span>Analizando...</span>
                      </>
                    ) : (
                      <>
                        <span>Consultar</span>
                        <SendHorizontal className="size-3.5" aria-hidden />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

      {/* Collapsible Sidebar: Gemini Sessions & History */}
      {isHistoryOpen && (
        <aside className="flex flex-col gap-4 min-w-0">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs sticky top-4 max-h-[calc(100vh-6rem)] overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-emerald-600" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">Historial de Análisis</h3>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHistoryOpen(false)}
                  title="Minimizar panel de historial"
                  aria-label="Minimizar panel de historial"
                  className="size-7 rounded-full text-text-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Search sessions filter */}
            {sessions.length > 3 ? (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-text-muted" aria-hidden />
                <input
                  type="text"
                  placeholder="Buscar análisis..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-muted/40 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            ) : null}

            {/* Session Items List */}
            {isBooting ? (
              <div className="flex flex-col gap-2 py-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="py-6 text-center text-xs text-text-muted">
                {sessionSearch ? "No se encontraron análisis." : "Aún no hay sesiones guardadas."}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto pr-1">
                {filteredSessions.map((session) => {
                  const isActive = session.id === sessionId;
                  return (
                    <li key={session.id}>
                      <button
                        type="button"
                        onClick={() => void openSession(session.id)}
                        disabled={isAsking}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "group flex w-full flex-col items-start gap-1 rounded-2xl p-3 text-left transition-all duration-200 hover:bg-muted/60 disabled:opacity-60",
                          isActive
                            ? "border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent text-foreground shadow-2xs font-medium"
                            : "border border-transparent text-text-secondary",
                        )}
                      >
                        <span className="line-clamp-2 text-xs font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {session.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                          <Clock className="size-3" aria-hidden />
                          <span>{formatRelativeTime(session.updatedAt)}</span>
                          <span>·</span>
                          <span className="font-medium">
                            {session.turns} {session.turns === 1 ? "consulta" : "consultas"}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </aside>
      )}
    </div>
  );
}
