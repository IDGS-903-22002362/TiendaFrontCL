"use client";

import type { ReactNode } from "react";
import {
  GitCompareArrows,
  Network,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type { AdminReportBlock } from "@/lib/ai/admin-report-types";
import { cn } from "@/lib/utils";

function BlockTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>;
}

const INSIGHT_PRIORITY_LABEL = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
  opportunity: "Oportunidad",
} as const;

const EVIDENCE_LABEL = {
  high: "Evidencia alta",
  medium: "Evidencia media",
  limited: "Evidencia limitada",
} as const;

const CLASSIFICATION_LABEL = {
  observed: "Observado",
  inference: "Inferencia",
  recommendation: "Recomendación",
  prediction: "Pronóstico",
  simulation: "Simulación",
} as const;

export function InsightBlock({ block }: { block: AdminReportBlock }) {
  if (!block.priority || !block.evidence || !block.classification) return null;
  const attention = block.priority === "critical" || block.priority === "high";

  return (
    <section
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200 shadow-sm",
        attention
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/8 via-amber-500/3 to-transparent"
          : "border-border/80 bg-card hover:border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={attention ? "default" : "outline"}
          className={cn(
            "text-[11px] font-medium tracking-wide",
            attention && "bg-amber-600 hover:bg-amber-700 text-white border-transparent",
          )}
        >
          {INSIGHT_PRIORITY_LABEL[block.priority]}
        </Badge>
        <Badge variant="outline" className="text-[11px] font-normal border-border/80 bg-background/50">
          <ShieldCheck className="mr-1 size-3 text-emerald-600" aria-hidden />
          {EVIDENCE_LABEL[block.evidence]}
        </Badge>
        <Badge variant="secondary" className="text-[11px] font-normal">
          {CLASSIFICATION_LABEL[block.classification]}
        </Badge>
      </div>

      <h3 className="mt-3.5 text-base font-semibold text-foreground tracking-tight">
        {block.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary whitespace-pre-line">
        {block.summary}
      </p>

      {typeof block.change === "number" ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-1 text-xs">
          <span className="text-text-muted">Cambio observado:</span>
          <span className="admin-tabular font-semibold text-foreground">
            {formatAdminReportChange(block.change)}
          </span>
        </div>
      ) : null}

      {block.limitations?.length ? (
        <p className="mt-3 text-xs text-text-muted border-t border-border/40 pt-2.5">
          <span className="font-medium text-text-secondary">Limitaciones: </span>
          {block.limitations.join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

function MetricList({
  title,
  values,
}: {
  title: string;
  values: NonNullable<AdminReportBlock["baseline"]>;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{title}</p>
      <dl className="mt-3 flex flex-col gap-2 divide-y divide-border/40">
        {values.map((metric) => (
          <div key={metric.label} className="flex items-baseline justify-between gap-3 pt-2 first:pt-0 text-sm">
            <dt className="text-text-secondary text-xs">{metric.label}</dt>
            <dd className="admin-tabular font-semibold text-foreground">
              {formatAdminReportValue(metric.value, metric.format ?? "number")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ScenarioBlock({ block }: { block: AdminReportBlock }) {
  if (!block.baseline?.length || !block.result?.length) return null;

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 via-teal-500/3 to-transparent p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
            <SlidersHorizontal className="size-4" aria-hidden />
          </span>
          <BlockTitle>{block.title || "Simulación de Escenario"}</BlockTitle>
        </div>
        <Badge variant="outline" className="text-[11px] font-medium border-emerald-500/30 text-emerald-700 bg-emerald-500/5">
          Simulado, no pronosticado
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricList title="Base observada" values={block.baseline} />
        <MetricList title="Resultado simulado" values={block.result} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-xs md:grid-cols-2 border-t border-border/50 pt-3.5">
        <div>
          <p className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Supuestos del modelo</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-text-muted">
            {block.assumptions?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Limitaciones de simulación</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-text-muted">
            {block.limitations?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ComparisonBlock({ block }: { block: AdminReportBlock }) {
  if (!block.options?.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600">
          <GitCompareArrows className="size-4" aria-hidden />
        </span>
        <BlockTitle>{block.title || "Comparación de opciones estratégicas"}</BlockTitle>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {block.options.map((option, index) => {
          const recommended = block.recommendedOption === option.name;
          return (
            <article
              key={`${option.name}-${index}`}
              className={cn(
                "rounded-2xl border p-5 transition-all duration-200 shadow-sm flex flex-col justify-between",
                recommended
                  ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/8 via-card to-card ring-1 ring-emerald-500/20"
                  : "border-border/80 bg-card hover:border-border",
              )}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {String.fromCharCode(65 + index)}. {option.name}
                  </h4>
                  <Badge
                    variant={recommended ? "default" : "outline"}
                    className={cn(
                      "text-[10px] font-medium",
                      recommended && "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
                    )}
                  >
                    {recommended ? "✦ Recomendada" : EVIDENCE_LABEL[option.evidence]}
                  </Badge>
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-text-secondary">
                  {option.description}
                </p>

                <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-xs font-medium text-text-secondary">
                  <span className="text-text-muted font-normal">Dirección esperada: </span>
                  <span className="font-semibold text-foreground">{option.expectedDirection}</span>
                </div>

                {option.advantages.length ? (
                  <div className="mt-3.5 text-xs">
                    <p className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3" aria-hidden />
                      Ventajas
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-text-muted">
                      {option.advantages.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {option.risks.length ? (
                  <div className="mt-3 text-xs">
                    <p className="flex items-center gap-1 font-semibold text-amber-700">
                      <AlertCircle className="size-3" aria-hidden />
                      Riesgos
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-text-muted">
                      {option.risks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {block.recommendationReason ? (
        <p className="text-xs text-text-muted italic border-l-2 border-emerald-500/40 pl-3 py-1">
          {block.recommendationReason}
        </p>
      ) : null}
    </section>
  );
}

export function DiagramBlock({ block }: { block: AdminReportBlock }) {
  const nodes = block.nodes ?? [];
  const edges = block.edges ?? [];
  if (nodes.length < 2 || !block.diagramType) return null;
  const maxValue = Math.max(...nodes.map((node) => node.value ?? 0), 1);
  const isFunnel = block.diagramType === "funnel";
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <figure
      className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
      aria-label={block.title || "Diagrama"}
    >
      <figcaption className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
          <Network className="size-3.5" aria-hidden />
        </span>
        {block.title || "Diagrama de Flujo"}
      </figcaption>

      {isFunnel ? (
        <ol className="mt-5 flex flex-col items-center gap-2">
          {nodes.map((node, index) => {
            const edge = index > 0 ? edges.find((candidate) => candidate.to === node.id) : undefined;
            const width = Math.max(38, ((node.value ?? 0) / maxValue) * 100);
            return (
              <li key={node.id} className="flex w-full flex-col items-center">
                {edge ? (
                  <span className="py-1 text-[11px] font-medium text-emerald-600" aria-label="Tasa de avance">
                    ↓ {typeof edge.rate === "number" ? `${formatAdminReportValue(edge.rate, "percentage")}` : edge.label || "siguiente etapa"}
                  </span>
                ) : null}
                <div
                  className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 px-4 py-2.5 text-center shadow-xs transition-all hover:border-emerald-500/40"
                  style={{ width: `${width}%` }}
                >
                  <p className="text-xs font-medium text-text-secondary">{node.label}</p>
                  {typeof node.value === "number" ? (
                    <p className="admin-tabular text-base font-bold text-foreground">
                      {formatAdminReportValue(node.value, node.format ?? "number")}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {nodes.map((node) => {
            const incoming = edges.filter((edge) => edge.to === node.id);
            return (
              <div key={node.id} className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
                <p className="text-sm font-semibold text-foreground">{node.label}</p>
                {typeof node.value === "number" ? (
                  <p className="admin-tabular mt-1 text-lg font-bold text-foreground">
                    {formatAdminReportValue(node.value, node.format ?? "number")}
                  </p>
                ) : null}
                {incoming.length ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Relacionado desde {incoming.map((edge) => nodeById.get(edge.from)?.label || edge.from).join(", ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </figure>
  );
}

export function SegmentBlock({ block }: { block: AdminReportBlock }) {
  const items = block.segmentItems ?? [];
  if (!items.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
          <Tags className="size-3.5" aria-hidden />
        </span>
        <BlockTitle>{block.title || "Segmentación de Cartera"}</BlockTitle>
      </div>

      {block.methodology ? (
        <p className="text-xs text-text-muted">{block.methodology}</p>
      ) : null}

      {block.thresholds?.length ? (
        <p className="text-xs text-text-muted">
          <span className="font-medium text-text-secondary">Umbrales: </span>
          {block.thresholds.join(" · ")}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border/80 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs text-foreground">Elemento</TableHead>
              <TableHead className="font-semibold text-xs text-foreground">Segmento</TableHead>
              <TableHead className="font-semibold text-xs text-foreground">Evidencia</TableHead>
              <TableHead className="text-right font-semibold text-xs text-foreground">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.label}-${item.segment}`} className="hover:bg-muted/30">
                <TableCell className="font-medium text-sm text-foreground">{item.label}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal text-xs bg-background/80">
                    {item.segment}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-text-muted">{EVIDENCE_LABEL[item.evidence]}</TableCell>
                <TableCell className="admin-tabular text-right font-semibold text-sm">
                  {typeof item.score === "number" ? formatAdminReportValue(item.score, "number") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
