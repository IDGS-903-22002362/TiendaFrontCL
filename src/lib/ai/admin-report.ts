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
  "conclusion",
  "contexto",
]);

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

type BlockBase = Pick<AdminReportBlock, "type" | "title">;

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

const BLOCK_NORMALIZERS: Record<
  AdminReportBlockType,
  (base: BlockBase, record: UnknownRecord) => AdminReportBlock | null
> = {
  text: normalizeTextBlock,
  warning: normalizeTextBlock,
  chart: normalizeChartBlock,
  forecast: normalizeForecastBlock,
  anomaly: normalizeAnomalyBlock,
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
  return BLOCK_NORMALIZERS[type](
    { type, ...(title ? { title } : {}) },
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

  return {
    summary,
    confidence: normalizePriority(record.confidence, "media") ?? "media",
    blocks,
    ...(suggestedQuestions.length > 0 ? { suggestedQuestions } : {}),
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
