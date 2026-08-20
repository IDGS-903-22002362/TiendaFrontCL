"use client";

import * as React from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  ActivitySquare,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
  AdminReportChartPoint,
  AdminReportPriority,
  AdminReportTextKind,
} from "@/lib/ai/admin-report-types";
import { cn } from "@/lib/utils";

const TEXT_KIND_LABEL: Record<AdminReportTextKind, string> = {
  observacion: "Dato observado",
  inferencia: "Inferencia",
  conclusion: "Conclusion",
  contexto: "Contexto",
};

const CONFIDENCE_LABEL: Record<AdminReport["confidence"], string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

const CHART_COLORS = [
  "var(--chart-1, #1e5fa8)",
  "var(--chart-2, #16a34a)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #db2777)",
  "var(--chart-5, #6366f1)",
];

function seriesKeys(data: AdminReportChartPoint[]): string[] {
  const keys: string[] = [];
  for (const point of data) {
    for (const entry of point.series) {
      if (!keys.includes(entry.key)) {
        keys.push(entry.key);
      }
    }
  }
  return keys;
}

function toChartRows(data: AdminReportChartPoint[], keys: string[]) {
  return data.map((point) => {
    const row: Record<string, string | number> = { x: point.x };
    for (const key of keys) {
      const match = point.series.find((entry) => entry.key === key);
      row[key] = match ? match.value : 0;
    }
    return row;
  });
}

/**
 * En scatter el eje X es numerico (por ejemplo vistas) y la primera serie es el
 * eje Y (por ejemplo unidades vendidas). Los puntos sin X numerica se descartan
 * para no colapsar todos los productos sobre el cero.
 */
function toScatterRows(data: AdminReportChartPoint[], valueKey: string) {
  return data.flatMap((point) => {
    const x = Number(point.x);
    const match = point.series.find((entry) => entry.key === valueKey);

    if (!Number.isFinite(x) || !match) {
      return [];
    }

    return [{ x, [valueKey]: match.value, name: point.label ?? point.x }];
  });
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-foreground">{children}</h3>
  );
}

function TextBlock({ block }: { block: AdminReportBlock }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
        {block.kind ? (
          <Badge variant="outline" className="text-[11px] font-normal">
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
      className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-amber-600"
        aria-hidden
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-amber-700">
          {block.title || "Limitacion de los datos"}
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {block.items?.map((item) => {
          const positive = typeof item.change === "number" && item.change > 0;
          const negative = typeof item.change === "number" && item.change < 0;
          const ChangeIcon = positive ? ArrowUpRight : ArrowDownRight;

          return (
            <div
              key={item.label}
              className="flex flex-col gap-1 rounded-xl border border-border/80 bg-card px-4 py-3"
            >
              <p className="text-xs font-medium text-text-secondary">
                {item.label}
              </p>
              <p className="admin-tabular text-xl font-semibold text-foreground">
                {formatAdminReportValue(item.value, item.format)}
              </p>
              {typeof item.change === "number" ? (
                <p
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    positive && "text-emerald-600",
                    negative && "text-destructive",
                    !positive && !negative && "text-text-muted",
                  )}
                >
                  {positive || negative ? (
                    <ChangeIcon className="size-3" aria-hidden />
                  ) : null}
                  {formatAdminReportChange(item.change)}
                </p>
              ) : null}
              {item.hint ? (
                <p className="text-xs text-text-muted">{item.hint}</p>
              ) : null}
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
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={`${column.label}-${index}`}
                  className={cn(
                    "whitespace-nowrap",
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
              <TableRow key={`row-${rowIndex}`}>
                {row.cells.map((cell, cellIndex) => {
                  const format = columns[cellIndex]?.format ?? "text";
                  return (
                    <TableCell
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className={cn(
                        format !== "text" && "admin-tabular text-right",
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

type ChartRow = Record<string, string | number>;
type ValueFormatter = (value: number | string) => string;

function ValueTooltip({ formatter }: { formatter: ValueFormatter }) {
  return (
    <ChartTooltipContent formatter={(value) => formatter(value as number)} />
  );
}

function PieChartView({
  rows,
  valueKey,
  valueFormatter,
}: {
  rows: ChartRow[];
  valueKey: string;
  valueFormatter: ValueFormatter;
}) {
  return (
    <PieChart>
      <ChartTooltip content={<ValueTooltip formatter={valueFormatter} />} />
      <Pie data={rows} dataKey={valueKey} nameKey="x" outerRadius="75%">
        {rows.map((row, index) => (
          <Cell
            key={`slice-${row.x}`}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
          />
        ))}
      </Pie>
    </PieChart>
  );
}

function LineChartView({
  rows,
  keys,
  valueFormatter,
}: {
  rows: ChartRow[];
  keys: string[];
  valueFormatter: ValueFormatter;
}) {
  return (
    <LineChart data={rows} margin={{ left: 8, right: 8, top: 8 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="x"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={16}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={72}
        tickFormatter={(value) => valueFormatter(value as number)}
      />
      <ChartTooltip content={<ValueTooltip formatter={valueFormatter} />} />
      {keys.map((key) => (
        <Line
          key={key}
          dataKey={key}
          type="monotone"
          stroke={`var(--color-${key})`}
          strokeWidth={2}
          dot={false}
        />
      ))}
    </LineChart>
  );
}

function BarChartView({
  rows,
  keys,
  valueFormatter,
}: {
  rows: ChartRow[];
  keys: string[];
  valueFormatter: ValueFormatter;
}) {
  const crowded = rows.length > 6;

  return (
    <BarChart data={rows} margin={{ left: 8, right: 8, top: 8 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="x"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        interval={0}
        angle={crowded ? -30 : 0}
        textAnchor={crowded ? "end" : "middle"}
        height={crowded ? 64 : 32}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={72}
        tickFormatter={(value) => valueFormatter(value as number)}
      />
      <ChartTooltip content={<ValueTooltip formatter={valueFormatter} />} />
      {keys.map((key) => (
        <Bar
          key={key}
          dataKey={key}
          fill={`var(--color-${key})`}
          radius={[4, 4, 0, 0]}
        />
      ))}
    </BarChart>
  );
}

function ScatterChartView({
  rows,
  valueKey,
  valueName,
  xLabel,
  valueFormatter,
}: {
  rows: ChartRow[];
  valueKey: string;
  valueName: string;
  xLabel: string;
  valueFormatter: ValueFormatter;
}) {
  return (
    <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        type="number"
        dataKey="x"
        name={xLabel}
        tickLine={false}
        axisLine={false}
        tickMargin={8}
      />
      <YAxis
        type="number"
        dataKey={valueKey}
        name={valueName}
        tickLine={false}
        axisLine={false}
        width={72}
        tickFormatter={(value) => valueFormatter(value as number)}
      />
      <ZAxis dataKey="name" name="Elemento" />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelKey="name"
            formatter={(value) => valueFormatter(value as number)}
          />
        }
      />
      <Scatter data={rows} dataKey={valueKey} fill={`var(--color-${valueKey})`} />
    </ScatterChart>
  );
}

function ChartBlock({ block }: { block: AdminReportBlock }) {
  const data = block.data ?? [];
  const keys = seriesKeys(data);
  const rows = toChartRows(data, keys);
  const isScatter = block.chartType === "scatter";
  const scatterRows = isScatter ? toScatterRows(data, keys[0]) : [];
  const labelByKey = new Map(
    (block.seriesLabels ?? []).map((entry) => [entry.key, entry.label]),
  );

  // Un scatter con menos de tres puntos comparables no comunica relacion alguna.
  if (isScatter && scatterRows.length < 3) {
    return null;
  }

  const config: ChartConfig = Object.fromEntries(
    keys.map((key, index) => [
      key,
      {
        label: labelByKey.get(key) ?? key,
        color: CHART_COLORS[index % CHART_COLORS.length],
      },
    ]),
  );

  const valueFormatter: ValueFormatter = (value) =>
    formatAdminReportValue(value, block.valueFormat ?? "number");

  const charts: Record<string, React.ReactElement> = {
    scatter: (
      <ScatterChartView
        rows={scatterRows}
        valueKey={keys[0]}
        valueName={labelByKey.get(keys[0]) ?? keys[0]}
        xLabel={block.xLabel || "Eje X"}
        valueFormatter={valueFormatter}
      />
    ),
    pie: (
      <PieChartView
        rows={rows}
        valueKey={keys[0]}
        valueFormatter={valueFormatter}
      />
    ),
    line: (
      <LineChartView rows={rows} keys={keys} valueFormatter={valueFormatter} />
    ),
    bar: <BarChartView rows={rows} keys={keys} valueFormatter={valueFormatter} />,
  };

  return (
    <div className="flex flex-col gap-3">
      {block.title ? <BlockTitle>{block.title}</BlockTitle> : null}
      <ChartContainer
        config={config}
        className="aspect-[16/9] w-full min-h-[220px]"
      >
        {charts[block.chartType ?? "bar"] ?? charts.bar}
      </ChartContainer>
      {block.xLabel ? (
        <p className="text-xs text-text-muted">{block.xLabel}</p>
      ) : null}
    </div>
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

const FORECAST_CONFIG: ChartConfig = {
  historico: { label: "Historico", color: CHART_COLORS[0] },
  proyeccion: { label: "Proyeccion", color: CHART_COLORS[2] },
  rango: { label: "Rango estimado", color: CHART_COLORS[2] },
};

type ForecastRow = {
  x: string;
  historico?: number;
  proyeccion?: number;
  rango?: [number, number];
};

/**
 * Une historico y proyeccion en una sola serie temporal. El ultimo punto real se
 * repite como inicio de la proyeccion para que la linea no quede desconectada.
 */
function toForecastRows(block: AdminReportBlock): ForecastRow[] {
  const historical = block.historical ?? [];
  const forecast = block.forecast ?? [];
  const lastRealIndex = historical.length - 1;
  const rows: ForecastRow[] = historical.map((point, index) => ({
    x: point.date,
    historico: point.value,
    ...(index === lastRealIndex ? { proyeccion: point.value } : {}),
  }));

  for (const point of forecast) {
    rows.push({
      x: point.date,
      proyeccion: point.value,
      ...(typeof point.lower === "number" && typeof point.upper === "number"
        ? { rango: [point.lower, point.upper] as [number, number] }
        : {}),
    });
  }

  return rows;
}

function ForecastBlock({ block }: { block: AdminReportBlock }) {
  const rows = toForecastRows(block);
  const hasBand = rows.some((row) => row.rango !== undefined);
  const valueFormatter = (value: number | string) =>
    formatAdminReportValue(value, block.valueFormat ?? "number");

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <BlockTitle>
          <span className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" aria-hidden />
            {block.title || `Proyeccion de ${metricLabel}`}
          </span>
        </BlockTitle>
        {block.quality ? (
          <Badge variant="outline" className="text-[11px] font-normal">
            {QUALITY_LABEL[block.quality]}
          </Badge>
        ) : null}
        {block.horizon ? (
          <Badge variant="outline" className="text-[11px] font-normal">
            {block.horizon} dias
          </Badge>
        ) : null}
      </div>

      <ChartContainer
        config={FORECAST_CONFIG}
        className="aspect-[16/9] w-full min-h-[220px]"
      >
        <ComposedChart data={rows} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(value) => valueFormatter(value as number)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  Array.isArray(value)
                    ? `${valueFormatter(value[0] as number)} - ${valueFormatter(
                        value[1] as number,
                      )}`
                    : valueFormatter(value as number)
                }
              />
            }
          />
          {hasBand ? (
            <Area
              dataKey="rango"
              stroke="none"
              fill="var(--color-rango)"
              fillOpacity={0.18}
              connectNulls={false}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            dataKey="historico"
            type="monotone"
            stroke="var(--color-historico)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            dataKey="proyeccion"
            type="monotone"
            stroke="var(--color-proyeccion)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ChartContainer>

      <dl className="flex flex-col gap-1 text-xs text-text-muted">
        {block.method ? (
          <div className="flex flex-wrap gap-1">
            <dt className="font-medium">Modelo:</dt>
            <dd>{block.method}</dd>
          </div>
        ) : null}
        {block.historical && block.historical.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            <dt className="font-medium">Historial usado:</dt>
            <dd>{block.historical.length} observaciones</dd>
          </div>
        ) : null}
        {errorParts.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            <dt className="font-medium">Error historico:</dt>
            <dd>{errorParts.join(" · ")}</dd>
          </div>
        ) : null}
      </dl>

      <p className="text-xs text-text-muted">
        {block.note ||
          "La proyeccion es un escenario estimado a partir del historial, no un resultado garantizado."}
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
        "flex gap-3 rounded-xl border px-4 py-3",
        severity === "alta"
          ? "border-destructive/40 bg-destructive/5"
          : "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <ActivitySquare
        className={cn(
          "mt-0.5 size-4 shrink-0",
          severity === "alta" ? "text-destructive" : "text-amber-600",
        )}
        aria-hidden
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {block.title || `Anomalia en ${metricLabel}`}
          </p>
          <Badge
            variant={severity === "alta" ? "destructive" : "outline"}
            className="text-[11px] font-normal"
          >
            {SEVERITY_LABEL[severity]}
          </Badge>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-text-secondary sm:grid-cols-2">
          <div className="flex flex-wrap gap-1">
            <dt className="font-medium">Observado:</dt>
            <dd className="admin-tabular">
              {formatAdminReportValue(
                block.observed ?? 0,
                block.valueFormat ?? "number",
              )}
            </dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt className="font-medium">Esperado:</dt>
            <dd>{block.expected}</dd>
          </div>
          {block.reference ? (
            <div className="flex flex-wrap gap-1 sm:col-span-2">
              <dt className="font-medium">Periodo:</dt>
              <dd>{block.reference}</dd>
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
    <div className="flex flex-col gap-3">
      <BlockTitle>
        <span className="flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" aria-hidden />
          {block.title || "Recomendaciones"}
        </span>
      </BlockTitle>
      <ul className="flex flex-col gap-3">
        {block.recommendations?.map((item, index) => (
          <li
            key={`${item.action}-${index}`}
            className="rounded-xl border border-border/80 bg-card px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {item.action}
              </p>
              <Badge
                variant={item.priority === "alta" ? "default" : "outline"}
                className="text-[11px] font-normal"
              >
                Prioridad {item.priority}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{item.reason}</p>
            <dl className="mt-2 flex flex-col gap-1 text-xs text-text-muted">
              {item.evidence ? (
                <div className="flex gap-1">
                  <dt className="font-medium">Evidencia:</dt>
                  <dd>{item.evidence}</dd>
                </div>
              ) : null}
              {item.expectedImpact ? (
                <div className="flex gap-1">
                  <dt className="font-medium">Impacto esperado:</dt>
                  <dd>{item.expectedImpact}</dd>
                </div>
              ) : null}
              {item.risk ? (
                <div className="flex gap-1">
                  <dt className="font-medium">Riesgo:</dt>
                  <dd>{item.risk}</dd>
                </div>
              ) : null}
            </dl>
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
  /** Continua la conversacion con la sugerencia elegida, sin cambiar de vista. */
  onSuggestionSelect?: (question: string) => void;
  suggestionsDisabled?: boolean;
}) {
  const suggestions = report.suggestedQuestions ?? [];

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[11px] font-normal">
            {CONFIDENCE_LABEL[report.confidence]}
          </Badge>
        </div>
        <p className="text-base font-medium leading-relaxed text-foreground">
          {report.summary}
        </p>
      </header>

      {report.blocks.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Info className="size-4" aria-hidden />
          El analisis no genero bloques adicionales.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {report.blocks.map((block, index) => (
            <AdminReportBlockView key={`block-${index}`} block={block} />
          ))}
        </div>
      )}

      {suggestions.length > 0 && onSuggestionSelect ? (
        <section className="flex flex-col gap-2 border-t border-border/70 pt-4">
          <h3 className="text-xs font-medium text-text-secondary">
            Continuar el analisis
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                disabled={suggestionsDisabled}
                onClick={() => onSuggestionSelect(suggestion)}
                className="h-auto whitespace-normal py-1.5 text-left text-xs font-normal"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
