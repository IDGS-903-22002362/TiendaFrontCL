/**
 * Normalizacion y formato del informe administrativo.
 *
 * El backend ya valida el contrato con Zod, pero la vista no debe romperse si
 * llega un bloque incompleto: aqui se descartan bloques no renderizables y se
 * formatean los valores con la configuracion regional de la tienda.
 */

import type {
  AdminReport,
  AdminReportBlock,
  AdminReportBlockType,
  AdminReportChartPoint,
  AdminReportChartType,
  AdminReportForecastError,
  AdminReportForecastPoint,
  AdminReportKpiItem,
  AdminReportPriority,
  AdminReportRecommendation,
  AdminReportTableColumn,
  AdminReportTableRow,
  AdminReportTextKind,
  AdminReportTrace,
  AdminReportValueFormat,
  AdminComparisonOption,
  AdminDiagramEdge,
  AdminDiagramNode,
  AdminEvidenceLevel,
  AdminInsightClassification,
  AdminInsightPriority,
  AdminReportMetricValue,
  AdminReportSource,
  AdminSegmentItem,
} from "@/lib/ai/admin-report-types";

type UnknownRecord = Record<string, unknown>;

const BLOCK_TYPES = new Set<AdminReportBlockType>([
  "text",
  "kpis",
  "table",
  "chart",
  "recommendations",
  "warning",
  "forecast",
  "anomaly",
  "insight",
  "scenario",
  "comparison",
  "diagram",
  "segment",
]);

const CHART_TYPES = new Set<AdminReportChartType>([
  "bar",
  "line",
  "pie",
  "scatter",
]);

/** Un scatter con uno o dos puntos no comunica ninguna relacion. */
const MIN_SCATTER_POINTS = 3;
const MAX_SUGGESTED_QUESTIONS = 5;

const VALUE_FORMATS = new Set<AdminReportValueFormat>([
  "currency",
  "number",
  "percentage",
  "text",
]);

const PRIORITIES = new Set(["alta", "media", "baja"]);

const TEXT_KINDS = new Set<AdminReportTextKind>([
  "observacion",
  "inferencia",
  "recomendacion",
  "prediccion",
  "simulacion",
  "conclusion",
  "contexto",
]);

const INSIGHT_PRIORITIES = new Set<AdminInsightPriority>([
  "critical",
  "high",
  "medium",
  "low",
  "opportunity",
]);
const EVIDENCE_LEVELS = new Set<AdminEvidenceLevel>([
  "high",
  "medium",
  "limited",
]);
const CLASSIFICATIONS = new Set<AdminInsightClassification>([
  "observed",
  "inference",
  "recommendation",
  "prediction",
  "simulation",
]);
const DIAGRAM_TYPES = new Set(["flow", "funnel", "cause-tree"]);
const SEGMENT_TYPES = new Set(["product", "customer", "cohort"]);

function toRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeKpis(value: unknown): AdminReportKpiItem[] {
  return toArray(value).flatMap((raw) => {
    const record = toRecord(raw);
    const label = toText(record.label);
    const numeric = toFiniteNumber(record.value);
    if (!label || numeric === null) {
      return [];
    }

    const format = toText(record.format);
    const change = toFiniteNumber(record.change);

    return [
      {
        label,
        value: numeric,
        format:
          format === "currency" || format === "percentage" ? format : "number",
        ...(change === null ? {} : { change }),
        ...(toText(record.hint) ? { hint: toText(record.hint) } : {}),
      } satisfies AdminReportKpiItem,
    ];
  });
}

function normalizeColumns(value: unknown): AdminReportTableColumn[] {
  return toArray(value).flatMap((raw) => {
    const record = toRecord(raw);
    const label = toText(record.label);
    if (!label) {
      return [];
    }

    const format = toText(record.format) as AdminReportValueFormat;
    return [
      {
        label,
        ...(VALUE_FORMATS.has(format) ? { format } : {}),
      } satisfies AdminReportTableColumn,
    ];
  });
}

function normalizeRows(
  value: unknown,
  columnCount: number,
): AdminReportTableRow[] {
  return toArray(value).flatMap((raw) => {
    const cells = toArray(toRecord(raw).cells).map((cell) =>
      cell === null || cell === undefined ? "" : String(cell),
    );

    if (cells.length === 0) {
      return [];
    }

    // Empareja el ancho para que la tabla no se desalinee.
    const normalized = cells.slice(0, columnCount);
    while (normalized.length < columnCount) {
      normalized.push("");
    }

    return [{ cells: normalized } satisfies AdminReportTableRow];
  });
}

function normalizeChartData(value: unknown): AdminReportChartPoint[] {
  return toArray(value).flatMap((raw) => {
    const record = toRecord(raw);
    const x = toText(record.x);
    if (!x) {
      return [];
    }

    const series = toArray(record.series).flatMap((rawSeries) => {
      const seriesRecord = toRecord(rawSeries);
      const key = toText(seriesRecord.key);
      const numeric = toFiniteNumber(seriesRecord.value);
      return key && numeric !== null ? [{ key, value: numeric }] : [];
    });

    const label = toText(record.label);

    return series.length > 0
      ? [{ x, ...(label ? { label } : {}), series }]
      : [];
  });
}

function normalizeForecastPoints(value: unknown): AdminReportForecastPoint[] {
  return toArray(value).flatMap((raw) => {
    const record = toRecord(raw);
    const date = toText(record.date);
    const numeric = toFiniteNumber(record.value);
    if (!date || numeric === null) {
      return [];
    }

    const lower = toFiniteNumber(record.lower);
    const upper = toFiniteNumber(record.upper);

    return [
      {
        date,
        value: numeric,
        ...(lower === null ? {} : { lower }),
        ...(upper === null ? {} : { upper }),
      } satisfies AdminReportForecastPoint,
    ];
  });
}

function normalizeForecastError(
  value: unknown,
): AdminReportForecastError | null {
  const record = toRecord(value);
  const mae = toFiniteNumber(record.mae);
  const rmse = toFiniteNumber(record.rmse);
  const mape = toFiniteNumber(record.mape);

  if (mae === null && rmse === null && mape === null) {
    return null;
  }

  return {
    ...(mae === null ? {} : { mae }),
    ...(rmse === null ? {} : { rmse }),
    ...(mape === null ? {} : { mape }),
  };
}

function normalizePriority(
  value: unknown,
  fallback: AdminReportPriority | null = null,
): AdminReportPriority | null {
  const parsed = toText(value);
  return PRIORITIES.has(parsed) ? (parsed as AdminReportPriority) : fallback;
}

function normalizeRecommendations(value: unknown): AdminReportRecommendation[] {
  return toArray(value).flatMap((raw) => {
    const record = toRecord(raw);
    const action = toText(record.action);
    const reason = toText(record.reason);
    if (!action || !reason) {
      return [];
    }

    const priority = toText(record.priority);

    return [
      {
        action,
        reason,
        ...(toText(record.evidence) ? { evidence: toText(record.evidence) } : {}),
        ...(toText(record.expectedImpact)
          ? { expectedImpact: toText(record.expectedImpact) }
          : {}),
        ...(toText(record.risk) ? { risk: toText(record.risk) } : {}),
        priority: PRIORITIES.has(priority)
          ? (priority as AdminReportRecommendation["priority"])
          : "media",
      } satisfies AdminReportRecommendation,
    ];
  });
}

function normalizeStringList(value: unknown, limit = 10): string[] {
  return toArray(value)
    .map(toText)
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeMetricValues(value: unknown): AdminReportMetricValue[] {
  return toArray(value).flatMap((raw) => {
    const record = toRecord(raw);
    const label = toText(record.label);
    const numeric = toFiniteNumber(record.value);
    if (!label || numeric === null) return [];
    const format = toText(record.format) as AdminReportValueFormat;
    const status = toText(record.status);
    return [{
      label,
      value: numeric,
      ...(VALUE_FORMATS.has(format) ? { format } : {}),
      ...(status === "observed" || status === "forecast" || status === "simulated"
        ? { status }
        : {}),
    } satisfies AdminReportMetricValue];
  });
}

type BlockBase = Pick<AdminReportBlock, "type" | "title" | "sourceIds">;

function optionalText(
  value: unknown,
  key: string,
): Record<string, string> | Record<string, never> {
  const text = toText(value);
  return text ? { [key]: text } : {};
}

function optionalValueFormat(value: unknown) {
  const valueFormat = toText(value) as AdminReportValueFormat;
  return VALUE_FORMATS.has(valueFormat) ? { valueFormat } : {};
}

function normalizeTextBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const content = toText(record.content);
  if (!content) {
    return null;
  }

  const kind = toText(record.kind) as AdminReportTextKind;
  return {
    ...base,
    content,
    ...(TEXT_KINDS.has(kind) ? { kind } : {}),
  };
}

function normalizeChartBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const chartType = toText(record.chartType) as AdminReportChartType;
  const data = normalizeChartData(record.data);
  if (!CHART_TYPES.has(chartType) || data.length === 0) {
    return null;
  }

  if (chartType === "scatter" && data.length < MIN_SCATTER_POINTS) {
    return null;
  }

  const seriesLabels = toArray(record.seriesLabels).flatMap((rawLabel) => {
    const labelRecord = toRecord(rawLabel);
    const key = toText(labelRecord.key);
    const label = toText(labelRecord.label);
    return key && label ? [{ key, label }] : [];
  });

  return {
    ...base,
    chartType,
    data,
    ...(seriesLabels.length > 0 ? { seriesLabels } : {}),
    ...optionalText(record.xLabel, "xLabel"),
    ...optionalValueFormat(record.valueFormat),
  };
}

function normalizeForecastBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const forecast = normalizeForecastPoints(record.forecast);
  const metric = toText(record.metric);

  // Sin serie proyectada no hay nada que graficar: el backend descarta los
  // pronosticos que el modelo no respaldo con la herramienta de forecast.
  if (forecast.length === 0 || !metric) {
    return null;
  }

  const horizon = toFiniteNumber(record.horizon);
  const quality = normalizePriority(record.quality);
  const error = normalizeForecastError(record.error);

  return {
    ...base,
    metric,
    forecast,
    historical: normalizeForecastPoints(record.historical),
    ...optionalText(record.metricLabel, "metricLabel"),
    ...(horizon === null ? {} : { horizon }),
    ...optionalText(record.method, "method"),
    ...(quality ? { quality } : {}),
    ...(error ? { error } : {}),
    ...optionalText(record.note, "note"),
    ...optionalValueFormat(record.valueFormat),
  };
}

function normalizeAnomalyBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const metric = toText(record.metric);
  const observed = toFiniteNumber(record.observed);
  const expected = toText(record.expected);
  const explanation = toText(record.explanation);

  if (!metric || observed === null || !expected || !explanation) {
    return null;
  }

  return {
    ...base,
    metric,
    observed,
    expected,
    explanation,
    severity: normalizePriority(record.severity, "media") ?? "media",
    ...optionalText(record.metricLabel, "metricLabel"),
    ...optionalText(record.reference, "reference"),
    ...optionalValueFormat(record.valueFormat),
  };
}

function normalizeInsightBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const summary = toText(record.summary);
  const priority = toText(record.priority) as AdminInsightPriority;
  const evidence = toText(record.evidence) as AdminEvidenceLevel;
  const classification = toText(record.classification) as AdminInsightClassification;
  if (
    !base.title ||
    !summary ||
    !INSIGHT_PRIORITIES.has(priority) ||
    !EVIDENCE_LEVELS.has(evidence) ||
    !CLASSIFICATIONS.has(classification)
  ) return null;
  const change = toFiniteNumber(record.change);
  return {
    ...base,
    summary,
    priority,
    evidence,
    classification,
    ...optionalText(record.findingId, "findingId"),
    ...optionalText(record.metric, "metric"),
    ...(change === null ? {} : { change }),
    ...(normalizeStringList(record.limitations, 6).length
      ? { limitations: normalizeStringList(record.limitations, 6) }
      : {}),
  };
}

function normalizeScenarioBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const baseline = normalizeMetricValues(record.baseline);
  const result = normalizeMetricValues(record.result);
  const scenarioType = toText(record.scenarioType);
  const assumptions = normalizeStringList(record.assumptions);
  const limitations = normalizeStringList(record.limitations);
  if (
    !base.title ||
    baseline.length === 0 ||
    result.length === 0 ||
    !["pessimistic", "base", "optimistic", "custom"].includes(scenarioType) ||
    assumptions.length === 0 ||
    limitations.length === 0
  ) return null;
  return {
    ...base,
    scenarioType: scenarioType as NonNullable<AdminReportBlock["scenarioType"]>,
    status: "simulated",
    baseline,
    result,
    assumptions,
    limitations,
  };
}

function normalizeComparisonBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const options = toArray(record.options).flatMap((raw) => {
    const option = toRecord(raw);
    const name = toText(option.name);
    const description = toText(option.description);
    const evidence = toText(option.evidence) as AdminEvidenceLevel;
    const expectedDirection = toText(option.expectedDirection);
    if (!name || !description || !expectedDirection || !EVIDENCE_LEVELS.has(evidence)) return [];
    return [{
      name,
      description,
      evidence,
      advantages: normalizeStringList(option.advantages, 6),
      risks: normalizeStringList(option.risks, 6),
      expectedDirection,
      requirements: normalizeStringList(option.requirements, 6),
    } satisfies AdminComparisonOption];
  }).slice(0, 4);
  if (!base.title || options.length < 2) return null;
  return {
    ...base,
    options,
    ...optionalText(record.recommendedOption, "recommendedOption"),
    ...optionalText(record.recommendationReason, "recommendationReason"),
  };
}

function normalizeDiagramBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const diagramType = toText(record.diagramType);
  if (!base.title || !DIAGRAM_TYPES.has(diagramType)) return null;
  const nodes = toArray(record.nodes).flatMap((raw) => {
    const node = toRecord(raw);
    const id = toText(node.id);
    const label = toText(node.label);
    if (!id || !label) return [];
    const value = toFiniteNumber(node.value);
    const format = toText(node.format) as AdminReportValueFormat;
    const classification = toText(node.classification);
    const evidence = toText(node.evidence) as AdminEvidenceLevel;
    return [{
      id,
      label,
      ...(value === null ? {} : { value }),
      ...(VALUE_FORMATS.has(format) ? { format } : {}),
      ...(classification === "observed" || classification === "inference"
        ? { classification }
        : {}),
      ...(EVIDENCE_LEVELS.has(evidence) ? { evidence } : {}),
    } satisfies AdminDiagramNode];
  }).slice(0, 20);
  const ids = new Set(nodes.map((node) => node.id));
  // IDs repetidos vuelven ambiguas las relaciones y podrían hacer que un
  // diagrama apunte al nodo equivocado. Se rechaza el bloque completo.
  if (ids.size !== nodes.length) return null;
  const edges = toArray(record.edges).flatMap((raw) => {
    const edge = toRecord(raw);
    const from = toText(edge.from);
    const to = toText(edge.to);
    if (!ids.has(from) || !ids.has(to)) return [];
    const rate = toFiniteNumber(edge.rate);
    return [{
      from,
      to,
      ...optionalText(edge.label, "label"),
      ...(rate === null ? {} : { rate }),
    } satisfies AdminDiagramEdge];
  }).slice(0, 30);
  const requiresRelationship =
    diagramType === "flow" || diagramType === "cause-tree";
  return nodes.length >= 2 && (!requiresRelationship || edges.length > 0)
    ? {
        ...base,
        diagramType: diagramType as NonNullable<AdminReportBlock["diagramType"]>,
        nodes,
        edges,
      }
    : null;
}

function normalizeSegmentBlock(
  base: BlockBase,
  record: UnknownRecord,
): AdminReportBlock | null {
  const segmentType = toText(record.segmentType);
  const methodology = toText(record.methodology);
  if (!base.title || !SEGMENT_TYPES.has(segmentType) || !methodology) return null;
  const segmentItems = toArray(record.items).flatMap((raw) => {
    const item = toRecord(raw);
    const label = toText(item.label);
    const segment = toText(item.segment);
    const evidence = toText(item.evidence) as AdminEvidenceLevel;
    if (!label || !segment || !EVIDENCE_LEVELS.has(evidence)) return [];
    const score = toFiniteNumber(item.score);
    return [{
      label,
      segment,
      evidence,
      ...(score === null ? {} : { score }),
      metrics: normalizeMetricValues(item.metrics),
    } satisfies AdminSegmentItem];
  }).slice(0, 50);
  return segmentItems.length > 0
    ? {
        ...base,
        segmentType: segmentType as NonNullable<AdminReportBlock["segmentType"]>,
        methodology,
        thresholds: normalizeStringList(record.thresholds),
        segmentItems,
      }
    : null;
}

const BLOCK_NORMALIZERS: Record<
  AdminReportBlockType,
  (base: BlockBase, record: UnknownRecord) => AdminReportBlock | null
> = {
  text: normalizeTextBlock,
  warning: normalizeTextBlock,
  chart: normalizeChartBlock,
  forecast: normalizeForecastBlock,
  anomaly: normalizeAnomalyBlock,
  insight: normalizeInsightBlock,
  scenario: normalizeScenarioBlock,
  comparison: normalizeComparisonBlock,
  diagram: normalizeDiagramBlock,
  segment: normalizeSegmentBlock,
  kpis: (base, record) => {
    const items = normalizeKpis(record.items);
    return items.length > 0 ? { ...base, items } : null;
  },
  table: (base, record) => {
    const columns = normalizeColumns(record.columns);
    const rows = normalizeRows(record.rows, columns.length);
    return columns.length > 0 && rows.length > 0
      ? { ...base, columns, rows }
      : null;
  },
  recommendations: (base, record) => {
    const recommendations = normalizeRecommendations(record.recommendations);
    return recommendations.length > 0 ? { ...base, recommendations } : null;
  },
};

function normalizeBlock(raw: unknown): AdminReportBlock | null {
  const record = toRecord(raw);
  const type = toText(record.type) as AdminReportBlockType;
  if (!BLOCK_TYPES.has(type)) {
    return null;
  }

  const title = toText(record.title);
  const sourceIds = normalizeStringList(record.sourceIds, 8);
  return BLOCK_NORMALIZERS[type](
    {
      type,
      ...(title ? { title } : {}),
      ...(sourceIds.length > 0 ? { sourceIds } : {}),
    },
    record,
  );
}

/** Deduplica y limita las sugerencias para que sean acciones utiles. */
function normalizeSuggestedQuestions(value: unknown): string[] {
  const seen = new Set<string>();
  const questions: string[] = [];

  for (const raw of toArray(value)) {
    const question = toText(raw);
    const key = question.toLowerCase();

    if (question.length < 3 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    questions.push(question);

    if (questions.length >= MAX_SUGGESTED_QUESTIONS) {
      break;
    }
  }

  return questions;
}

export function normalizeAdminReport(raw: unknown): AdminReport | null {
  const record = toRecord(raw);
  const summary = toText(record.summary);
  if (!summary) {
    return null;
  }

  const blocks = toArray(record.blocks)
    .map(normalizeBlock)
    .filter((block): block is AdminReportBlock => block !== null);
  const suggestedQuestions = normalizeSuggestedQuestions(
    record.suggestedQuestions,
  );
  const sourceMetadata = toArray(record.sourceMetadata).flatMap((rawSource) => {
    const source = toRecord(rawSource);
    const id = toText(source.id);
    const label = toText(source.label);
    const observedAt = toText(source.observedAt);
    const freshness = toText(source.freshness);
    const coverage = toText(source.coverage);
    if (
      !id ||
      !label ||
      !observedAt ||
      !["fresh", "partial", "stale"].includes(freshness) ||
      !["complete", "partial"].includes(coverage)
    ) return [];
    return [{
      id,
      label,
      observedAt,
      freshness: freshness as AdminReportSource["freshness"],
      coverage: coverage as AdminReportSource["coverage"],
      ...optionalText(source.period, "period"),
      ...(normalizeStringList(source.filters, 8).length
        ? { filters: normalizeStringList(source.filters, 8) }
        : {}),
      ...optionalText(source.note, "note"),
    } satisfies AdminReportSource];
  }).filter(
    (source, index, sources) => sources.findIndex((candidate) => candidate.id === source.id) === index,
  ).slice(0, 24);
  const validSourceIds = new Set(sourceMetadata.map((source) => source.id));
  const tracedBlocks = blocks.map((block) => ({
    ...block,
    ...(block.sourceIds
      ? { sourceIds: block.sourceIds.filter((id) => validSourceIds.has(id)) }
      : {}),
  }));

  return {
    summary,
    confidence: normalizePriority(record.confidence, "media") ?? "media",
    blocks: tracedBlocks,
    ...(suggestedQuestions.length > 0 ? { suggestedQuestions } : {}),
    ...(sourceMetadata.length > 0 ? { sourceMetadata } : {}),
  };
}

export function normalizeAdminReportTrace(raw: unknown): AdminReportTrace {
  const record = toRecord(raw);

  return {
    toolsUsed: toArray(record.toolsUsed).map(String).filter(Boolean),
    toolCalls: toArray(record.toolCalls).map((rawCall) => {
      const call = toRecord(rawCall);
      return {
        toolName: toText(call.toolName) || "desconocida",
        durationMs: toFiniteNumber(call.durationMs) ?? 0,
        success: call.success !== false,
        resultSize: toFiniteNumber(call.resultSize) ?? 0,
        ...(toText(call.periodLabel)
          ? { periodLabel: toText(call.periodLabel) }
          : {}),
        ...(toText(call.errorMessage)
          ? { errorMessage: toText(call.errorMessage) }
          : {}),
      };
    }),
    investigationRounds: toFiniteNumber(record.investigationRounds) ?? 0,
    reachedToolLimit: record.reachedToolLimit === true,
    model: toText(record.model),
    durationMs: toFiniteNumber(record.durationMs) ?? 0,
    totalAgentDuration:
      toFiniteNumber(record.totalAgentDuration) ??
      toFiniteNumber(record.durationMs) ??
      0,
    geminiDuration: toFiniteNumber(record.geminiDuration) ?? 0,
    toolDuration: toFiniteNumber(record.toolDuration) ?? 0,
    numberOfToolCalls:
      toFiniteNumber(record.numberOfToolCalls) ?? toArray(record.toolCalls).length,
    slowestTools: toArray(record.slowestTools).flatMap((rawSlow) => {
      const slow = toRecord(rawSlow);
      const label = toText(slow.label);
      const durationMs = toFiniteNumber(slow.durationMs);
      return label && durationMs !== null
        ? [{ label, durationMs, success: slow.success !== false }]
        : [];
    }).slice(0, 3),
    sourceTimestamps: normalizeStringList(record.sourceTimestamps, 24),
    timeZone: toText(record.timeZone),
    forecasts: toArray(record.forecasts).map((rawForecast) => {
      const forecast = toRecord(rawForecast);
      return {
        metric: toText(forecast.metric) || "desconocida",
        method: toText(forecast.method) || "desconocido",
        observations: toFiniteNumber(forecast.observations) ?? 0,
        horizon: toFiniteNumber(forecast.horizon) ?? 0,
        quality: toText(forecast.quality) || "desconocida",
        mae: toFiniteNumber(forecast.mae),
      };
    }),
    anomaliesDetected: toFiniteNumber(record.anomaliesDetected) ?? 0,
  };
}

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

/**
 * Formatea celdas y KPIs. Los valores llegan sin formato desde el modelo;
 * si un texto no es numerico se muestra tal cual en lugar de "NaN".
 */
export function formatAdminReportValue(
  value: number | string,
  format: AdminReportValueFormat = "text",
): string {
  if (format === "text") {
    return String(value);
  }

  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return String(value);
  }

  if (format === "currency") {
    return currencyFormatter.format(numeric);
  }

  if (format === "percentage") {
    return `${numberFormatter.format(numeric)}%`;
  }

  return numberFormatter.format(numeric);
}

export function formatAdminReportChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${numberFormatter.format(change)}%`;
}
