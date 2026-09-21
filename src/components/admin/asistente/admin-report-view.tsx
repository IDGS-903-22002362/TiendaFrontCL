"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import {
  ActivitySquare,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Compass,
  Database,
  Info,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAdminReportChange,
  formatAdminReportValue,
} from "@/lib/ai/admin-report";
import type {
  AdminReport,
  AdminReportBlock,
  AdminReportPriority,
  AdminReportTextKind,
} from "@/lib/ai/admin-report-types";
import {
  buildAdminChartModel,
  buildForecastChartModel,
} from "@/lib/ai/admin-report-echarts";
import { cn } from "@/lib/utils";
import {
  ComparisonBlock,
  DiagramBlock,
  InsightBlock,
  ScenarioBlock,
  SegmentBlock,
} from "@/components/admin/asistente/admin-decision-blocks";

const AdminReportEchart = dynamic(
  () =>
    import("@/components/admin/asistente/admin-report-echart").then(
      (mod) => mod.AdminReportEchart,
    ),
  { ssr: false },
);

const TEXT_KIND_LABEL: Record<AdminReportTextKind, string> = {
  observacion: "Dato observado",
  inferencia: "Inferencia",
  recomendacion: "Recomendación",
  prediccion: "Predicción",
  simulacion: "Simulación",
  conclusion: "Conclusión",
  contexto: "Contexto",
};

const CONFIDENCE_LABEL: Record<AdminReport["confidence"], string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

const CONFIDENCE_DOT: Record<AdminReport["confidence"], string> = {
  alta: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
  media: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  baja: "bg-slate-400",
};

function formatDateForSource(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "fecha no disponible"
    : new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>
  );
}

function TextBlock({ block }: { block: AdminReportBlock }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-card/60 p-4.5 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
        {block.kind ? (
          <Badge variant="outline" className="text-[11px] font-normal border-border/80 bg-background/60">
            {TEXT_KIND_LABEL[block.kind]}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
        {block.content}
      </p>
    </div>
  );
}

function WarningBlock({ block }: { block: AdminReportBlock }) {
  return (
    <div
      role="status"
      className="flex gap-3.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 shadow-xs"
    >
      <div className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
        <AlertTriangle className="size-4" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          {block.title || "Limitación de los datos"}
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          {block.content}
        </p>
      </div>
    </div>
  );
}

function KpisBlock({ block }: { block: AdminReportBlock }) {
  return (
    <div className="flex flex-col gap-3">
      {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {block.items?.map((item) => {
          const positive = typeof item.change === "number" && item.change > 0;
          const negative = typeof item.change === "number" && item.change < 0;
          const ChangeIcon = positive ? ArrowUpRight : ArrowDownRight;

          return (
            <div
              key={item.label}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-text-secondary line-clamp-2">
                  {item.label}
                </p>
                {typeof item.change === "number" ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      positive && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      negative && "bg-destructive/10 text-destructive",
                      !positive && !negative && "bg-muted text-text-muted",
                    )}
                  >
                    {positive || negative ? (
                      <ChangeIcon className="size-3" aria-hidden />
                    ) : null}
                    {formatAdminReportChange(item.change)}
                  </span>
                ) : null}
              </div>

              <div className="mt-3">
                <p className="admin-tabular text-2xl font-bold tracking-tight text-foreground">
                  {formatAdminReportValue(item.value, item.format)}
                </p>
                {item.hint ? (
                  <p className="mt-1 text-[11px] text-text-muted">{item.hint}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableBlock({ block }: { block: AdminReportBlock }) {
  const columns = block.columns ?? [];

  return (
    <div className="flex flex-col gap-3">
      {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
      <div className="overflow-x-auto rounded-2xl border border-border/80 shadow-xs bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((column, index) => (
                <TableHead
                  key={`${column.label}-${index}`}
                  className={cn(
                    "font-semibold text-xs text-foreground whitespace-nowrap",
                    column.format &&
                      column.format !== "text" &&
                      "text-right",
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows?.map((row, rowIndex) => (
              <TableRow key={`row-${rowIndex}`} className="hover:bg-muted/30">
                {row.cells.map((cell, cellIndex) => {
                  const format = columns[cellIndex]?.format ?? "text";
                  return (
                    <TableCell
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className={cn(
                        "text-sm",
                        format !== "text" && "admin-tabular text-right font-medium",
                      )}
                    >
                      {formatAdminReportValue(cell, format)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ChartBlock({ block }: { block: AdminReportBlock }) {
  const model = React.useMemo(
    () => buildAdminChartModel(block),
    [
      block.chartType,
      block.data,
      block.seriesLabels,
      block.valueFormat,
      block.xLabel,
    ],
  );

  if (!model) {
    return block.title ? (
      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 p-4">
        <BlockTitle>{block.title}</BlockTitle>
        <p className="text-sm text-text-muted">
          No hay datos suficientes para graficar.
        </p>
      </div>
    ) : null;
  }

  return (
    <figure className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      {block.title ? (
        <figcaption className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
          <BlockTitle>{block.title}</BlockTitle>
        </figcaption>
      ) : null}
      <div className="w-full min-w-0" style={{ height: model.height }}>
        <AdminReportEchart
          option={model.option}
          height={model.height}
          ariaLabel={block.title || "Gráfica del informe"}
        />
      </div>
      {block.xLabel ? (
        <p className="text-xs text-text-muted text-center italic">{block.xLabel}</p>
      ) : null}
    </figure>
  );
}

const QUALITY_LABEL: Record<AdminReportPriority, string> = {
  alta: "Calidad alta",
  media: "Calidad media",
  baja: "Calidad baja",
};

const SEVERITY_LABEL: Record<AdminReportPriority, string> = {
  alta: "Severidad alta",
  media: "Severidad media",
  baja: "Severidad baja",
};

function ForecastBlock({ block }: { block: AdminReportBlock }) {
  const model = React.useMemo(
    () => buildForecastChartModel(block),
    [block.forecast, block.historical, block.valueFormat],
  );
  const metricLabel = block.metricLabel || block.metric;
  const errorParts = [
    typeof block.error?.mae === "number"
      ? `MAE ${formatAdminReportValue(block.error.mae, "number")}`
      : null,
    typeof block.error?.mape === "number"
      ? `MAPE ${formatAdminReportValue(block.error.mape, "percentage")}`
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
            <TrendingUp className="size-4" aria-hidden />
          </span>
          <BlockTitle>
            {block.title || `Proyección de ${metricLabel}`}
          </BlockTitle>
        </div>
        <div className="flex items-center gap-2">
          {block.quality ? (
            <Badge variant="outline" className="text-[11px] font-normal border-emerald-500/30 text-emerald-700 bg-emerald-500/5">
              {QUALITY_LABEL[block.quality]}
            </Badge>
          ) : null}
          {block.horizon ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              Horizonte {block.horizon} días
            </Badge>
          ) : null}
        </div>
      </div>

      {model ? (
        <div className="w-full min-w-0" style={{ height: model.height }}>
          <AdminReportEchart
            option={model.option}
            height={model.height}
            ariaLabel={block.title || `Proyección de ${metricLabel}`}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 rounded-xl bg-muted/40 p-3 text-xs text-text-muted sm:grid-cols-3">
        {block.method ? (
          <div>
            <span className="font-semibold text-text-secondary">Modelo: </span>
            <span>{block.method}</span>
          </div>
        ) : null}
        {block.historical && block.historical.length > 0 ? (
          <div>
            <span className="font-semibold text-text-secondary">Historial: </span>
            <span>{block.historical.length} observaciones</span>
          </div>
        ) : null}
        {errorParts.length > 0 ? (
          <div>
            <span className="font-semibold text-text-secondary">Error histórico: </span>
            <span>{errorParts.join(" · ")}</span>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-text-muted italic">
        {block.note ||
          "La proyección es un escenario estadístico estimado a partir del historial, no un resultado garantizado."}
      </p>
    </div>
  );
}

function AnomalyBlock({ block }: { block: AdminReportBlock }) {
  const severity = block.severity ?? "media";
  const metricLabel = block.metricLabel || block.metric;

  return (
    <div
      className={cn(
        "flex gap-3.5 rounded-2xl border p-5 shadow-xs",
        severity === "alta"
          ? "border-destructive/40 bg-gradient-to-br from-destructive/8 via-destructive/3 to-transparent"
          : "border-amber-500/30 bg-gradient-to-br from-amber-500/8 via-amber-500/3 to-transparent",
      )}
    >
      <div
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
          severity === "alta"
            ? "bg-destructive/15 text-destructive"
            : "bg-amber-500/15 text-amber-600",
        )}
      >
        <ActivitySquare className="size-4.5" aria-hidden />
      </div>

      <div className="flex flex-col gap-2.5 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            {block.title || `Anomalía detectada en ${metricLabel}`}
          </p>
          <Badge
            variant={severity === "alta" ? "destructive" : "outline"}
            className="text-[11px] font-medium"
          >
            {SEVERITY_LABEL[severity]}
          </Badge>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-xl bg-background/70 border border-border/60 p-3 text-xs text-text-secondary sm:grid-cols-2">
          <div className="flex flex-wrap gap-1">
            <dt className="text-text-muted">Observado:</dt>
            <dd className="admin-tabular font-bold text-foreground">
              {formatAdminReportValue(
                block.observed ?? 0,
                block.valueFormat ?? "number",
              )}
            </dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="text-text-muted">Esperado:</dt>
            <dd className="font-semibold text-foreground">{block.expected}</dd>
          </div>
          {block.reference ? (
            <div className="flex flex-wrap gap-1 sm:col-span-2 pt-1 border-t border-border/40">
              <dt className="text-text-muted">Periodo de referencia:</dt>
              <dd className="text-foreground">{block.reference}</dd>
            </div>
          ) : null}
        </dl>

        <p className="text-sm leading-relaxed text-text-secondary">
          {block.explanation}
        </p>
      </div>
    </div>
  );
}

function RecommendationsBlock({ block }: { block: AdminReportBlock }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <BlockTitle>{block.title || "Recomendaciones Estratégicas"}</BlockTitle>
      </div>

      <ul className="flex flex-col gap-3">
        {block.recommendations?.map((item, index) => (
          <li
            key={`${item.action}-${index}`}
            className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card p-4.5 shadow-xs transition-all hover:border-emerald-500/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {index + 1}. {item.action}
              </p>
              <Badge
                variant={item.priority === "alta" ? "default" : "outline"}
                className={cn(
                  "text-[10px] font-medium",
                  item.priority === "alta" && "bg-emerald-600 hover:bg-emerald-700 text-white",
                )}
              >
                Prioridad {item.priority}
              </Badge>
            </div>

            <p className="text-sm leading-relaxed text-text-secondary">{item.reason}</p>

            {(item.evidence || item.expectedImpact || item.risk) && (
              <div className="mt-2 grid grid-cols-1 gap-2 rounded-xl bg-muted/40 p-3 text-xs text-text-muted sm:grid-cols-3">
                {item.evidence ? (
                  <div>
                    <span className="font-semibold text-text-secondary">Evidencia: </span>
                    <span>{item.evidence}</span>
                  </div>
                ) : null}
                {item.expectedImpact ? (
                  <div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Impacto: </span>
                    <span className="text-foreground">{item.expectedImpact}</span>
                  </div>
                ) : null}
                {item.risk ? (
                  <div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Riesgo: </span>
                    <span>{item.risk}</span>
                  </div>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminReportBlockView({ block }: { block: AdminReportBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "warning":
      return <WarningBlock block={block} />;
    case "kpis":
      return <KpisBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "chart":
      return <ChartBlock block={block} />;
    case "forecast":
      return <ForecastBlock block={block} />;
    case "anomaly":
      return <AnomalyBlock block={block} />;
    case "recommendations":
      return <RecommendationsBlock block={block} />;
    case "insight":
      return <InsightBlock block={block} />;
    case "scenario":
      return <ScenarioBlock block={block} />;
    case "comparison":
      return <ComparisonBlock block={block} />;
    case "diagram":
      return <DiagramBlock block={block} />;
    case "segment":
      return <SegmentBlock block={block} />;
    default:
      return null;
  }
}

export function AdminReportView({
  report,
  onSuggestionSelect,
  suggestionsDisabled = false,
}: {
  report: AdminReport;
  onSuggestionSelect?: (question: string) => void;
  suggestionsDisabled?: boolean;
}) {
  const suggestions = report.suggestedQuestions ?? [];

  return (
    <article className="flex flex-col gap-6">
      {/* Executive Summary Card */}
      <header className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 via-card to-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", CONFIDENCE_DOT[report.confidence])} aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {CONFIDENCE_LABEL[report.confidence]}
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            Informe generado por Garritas IA
          </span>
        </div>

        <p className="text-base font-medium leading-relaxed text-foreground">
          {report.summary}
        </p>
      </header>

      {/* Structured Blocks with Staggered Entrance */}
      {report.blocks.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Info className="size-4" aria-hidden />
          El análisis no generó bloques adicionales.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {report.blocks.map((block, index) => (
            <motion.div
              key={`block-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.05 }}
            >
              <AdminReportBlockView block={block} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Gemini Follow-up Prompt Suggestions */}
      {suggestions.length > 0 && onSuggestionSelect ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            <Sparkles className="size-3.5 text-emerald-600" aria-hidden />
            <span>Continuar profundizando el análisis</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                disabled={suggestionsDisabled}
                onClick={() => onSuggestionSelect(suggestion)}
                className="group relative h-auto rounded-full border-border/80 bg-background/90 px-3.5 py-2 text-left text-xs font-normal text-foreground shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-800 dark:hover:text-emerald-300"
              >
                <span className="mr-1.5 inline-block text-emerald-600 transition-transform group-hover:translate-x-0.5">
                  ✦
                </span>
                {suggestion}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Verified Data Sources */}
      {report.sourceMetadata?.length ? (
        <details className="group rounded-2xl border border-border/70 bg-card/60 px-4.5 py-3 transition-all">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-text-secondary select-none">
            <span className="flex items-center gap-2">
              <Database className="size-3.5 text-emerald-600" aria-hidden />
              <span>Fuentes de datos consultadas ({report.sourceMetadata.length})</span>
            </span>
            <span className="text-[11px] text-text-muted group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>

          <ul className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {report.sourceMetadata.map((source) => (
              <li
                key={source.id}
                className="rounded-xl border border-border/60 bg-background/80 p-3.5 text-xs shadow-2xs"
              >
                <p className="font-semibold text-foreground">{source.label}</p>
                {source.period ? (
                  <p className="mt-1 text-text-muted">
                    <span className="font-medium text-text-secondary">Periodo: </span>
                    {source.period}
                  </p>
                ) : null}
                <div className="mt-1 flex items-center gap-2 text-text-muted">
                  <span>
                    Cobertura: {source.coverage === "complete" ? "Completa" : "Parcial"}
                  </span>
                  <span>·</span>
                  <span>{formatDateForSource(source.observedAt)}</span>
                </div>
                {source.note ? (
                  <p className="mt-1.5 text-text-muted italic border-t border-border/40 pt-1.5">
                    {source.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
