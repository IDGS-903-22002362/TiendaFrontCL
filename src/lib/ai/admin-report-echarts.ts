/**
 * Convierte bloques chart/forecast del schema administrativo a opciones ECharts.
 * El contrato del informe no cambia: solo cambia el motor de dibujo.
 */

import type { EChartsOption } from "echarts";
import { formatAdminReportValue } from "@/lib/ai/admin-report";
import type {
  AdminReportBlock,
  AdminReportChartPoint,
  AdminReportValueFormat,
} from "@/lib/ai/admin-report-types";

export const ADMIN_CHART_COLORS = [
  "#0d4b38",
  "#c8a24c",
  "#198754",
  "#d49b22",
  "#5ca883",
] as const;

const AXIS_COLOR = "#847a6d";
const SPLIT_COLOR = "#d7d7d0";

export type AdminEchartsModel = {
  option: EChartsOption;
  height: number;
};

const seriesKeys = (data: AdminReportChartPoint[]): string[] => {
  const keys: string[] = [];
  for (const point of data) {
    for (const entry of point.series) {
      if (!keys.includes(entry.key)) keys.push(entry.key);
    }
  }
  return keys;
};

const valueAt = (point: AdminReportChartPoint, key: string): number =>
  point.series.find((entry) => entry.key === key)?.value ?? 0;

const truncate = (value: string, max = 28): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const axisText = {
  color: AXIS_COLOR,
  fontSize: 11,
};

const baseGrid = {
  left: 8,
  right: 16,
  top: 16,
  bottom: 8,
  containLabel: true,
};

const tooltipValue = (format: AdminReportValueFormat) => (value: unknown) =>
  formatAdminReportValue(
    typeof value === "number" ? value : Number(value),
    format,
  );

export function buildAdminChartModel(
  block: AdminReportBlock,
): AdminEchartsModel | null {
  const data = block.data ?? [];
  const keys = seriesKeys(data);
  const chartType = block.chartType ?? "bar";
  const format = block.valueFormat ?? "number";
  const labelByKey = new Map(
    (block.seriesLabels ?? []).map((entry) => [entry.key, entry.label]),
  );

  if (keys.length === 0 || data.length === 0) return null;

  if (chartType === "scatter") {
    const valueKey = keys[0];
    const points = data.flatMap((point) => {
      const x = Number(point.x);
      const y = valueAt(point, valueKey);
      if (!Number.isFinite(x)) return [];
      return [[x, y, point.label ?? point.x]];
    });
    if (points.length < 3) return null;

    return {
      height: 320,
      option: {
        animation: false,
        color: [...ADMIN_CHART_COLORS],
        grid: baseGrid,
        tooltip: {
          trigger: "item",
          formatter: (raw) => {
            const item = Array.isArray(raw) ? raw[0] : raw;
            const payload = item?.value as [number, number, string] | undefined;
            if (!payload) return "";
            const yLabel = String(labelByKey.get(valueKey) ?? valueKey);
            return `${payload[2]}<br/>${block.xLabel || "X"}: ${payload[0]}<br/>${yLabel}: ${formatAdminReportValue(payload[1], format)}`;
          },
        },
        xAxis: {
          type: "value",
          name: block.xLabel,
          axisLabel: axisText,
          splitLine: { lineStyle: { color: SPLIT_COLOR } },
        },
        yAxis: {
          type: "value",
          name: labelByKey.get(valueKey) ?? valueKey,
          axisLabel: {
            ...axisText,
            formatter: tooltipValue(format),
          },
          splitLine: { lineStyle: { color: SPLIT_COLOR } },
        },
        series: [
          {
            type: "scatter",
            symbolSize: 10,
            data: points,
          },
        ],
      },
    };
  }

  const categories = data.map((point) => point.x);
  const series = keys.map((key, index) => ({
    name: labelByKey.get(key) ?? key,
    color: ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length],
    values: data.map((point) => valueAt(point, key)),
  }));

  if (chartType === "pie") {
    const pieData = categories.map((name, index) => ({
      name,
      value: series[0]?.values[index] ?? 0,
      itemStyle: {
        color: ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length],
      },
    }));
    return {
      height: 320,
      option: {
        animation: false,
        tooltip: {
          trigger: "item",
          formatter: (raw) => {
            const item = Array.isArray(raw) ? raw[0] : raw;
            const name = item?.name ?? "";
            const value = formatAdminReportValue(Number(item?.value), format);
            const percent =
              typeof item?.percent === "number" ? ` (${item.percent.toFixed(1)}%)` : "";
            return `${name}: ${value}${percent}`;
          },
        },
        legend: {
          type: "scroll",
          bottom: 0,
          textStyle: axisText,
        },
        series: [
          {
            type: "pie",
            radius: ["42%", "68%"],
            center: ["50%", "44%"],
            avoidLabelOverlap: true,
            label: { show: false },
            data: pieData,
          },
        ],
      },
    };
  }

  if (chartType === "line") {
    return {
      height: 280,
      option: {
        animation: false,
        color: [...ADMIN_CHART_COLORS],
        grid: baseGrid,
        tooltip: {
          trigger: "axis",
          valueFormatter: tooltipValue(format),
        },
        legend: series.length > 1 ? { top: 0, textStyle: axisText } : undefined,
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: { ...axisText, hideOverlap: true },
          axisLine: { lineStyle: { color: SPLIT_COLOR } },
        },
        yAxis: {
          type: "value",
          axisLabel: { ...axisText, formatter: tooltipValue(format) },
          splitLine: { lineStyle: { color: SPLIT_COLOR } },
        },
        series: series.map((entry) => ({
          name: entry.name,
          type: "line",
          smooth: true,
          showSymbol: categories.length <= 12,
          data: entry.values,
        })),
      },
    };
  }

  const horizontal =
    categories.length > 5 || categories.some((label) => label.length > 16);
  const height = horizontal
    ? Math.min(560, Math.max(280, 72 + categories.length * 34))
    : 280;

  return {
    height,
    option: {
      animation: false,
      color: [...ADMIN_CHART_COLORS],
      grid: {
        ...baseGrid,
        left: horizontal ? 4 : 8,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: tooltipValue(format),
      },
      legend: series.length > 1 ? { top: 0, textStyle: axisText } : undefined,
      xAxis: horizontal
        ? {
            type: "value",
            axisLabel: { ...axisText, formatter: tooltipValue(format) },
            splitLine: { lineStyle: { color: SPLIT_COLOR } },
          }
        : {
            type: "category",
            data: categories.map((label) => truncate(label, 18)),
            axisLabel: { ...axisText, hideOverlap: true },
            axisLine: { lineStyle: { color: SPLIT_COLOR } },
          },
      yAxis: horizontal
        ? {
            type: "category",
            data: categories.map((label) => truncate(label)),
            inverse: true,
            axisLabel: axisText,
            axisLine: { show: false },
            axisTick: { show: false },
          }
        : {
            type: "value",
            axisLabel: { ...axisText, formatter: tooltipValue(format) },
            splitLine: { lineStyle: { color: SPLIT_COLOR } },
          },
      series: series.map((entry) => ({
        name: entry.name,
        type: "bar",
        data: entry.values,
        barMaxWidth: 28,
        itemStyle: { color: entry.color, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
      })),
    },
  };
}

export function buildForecastChartModel(
  block: AdminReportBlock,
): AdminEchartsModel | null {
  const historical = block.historical ?? [];
  const forecast = block.forecast ?? [];
  if (forecast.length === 0) return null;

  const format = block.valueFormat ?? "number";
  const categories: string[] = [];
  const historico: Array<number | null> = [];
  const proyeccion: Array<number | null> = [];

  for (const [index, point] of historical.entries()) {
    categories.push(point.date);
    historico.push(point.value);
    proyeccion.push(index === historical.length - 1 ? point.value : null);
  }
  for (const point of forecast) {
    categories.push(point.date);
    historico.push(null);
    proyeccion.push(point.value);
  }

  return {
    height: 280,
    option: {
      animation: false,
      color: [ADMIN_CHART_COLORS[0], ADMIN_CHART_COLORS[2]],
      grid: baseGrid,
      tooltip: {
        trigger: "axis",
        valueFormatter: tooltipValue(format),
      },
      legend: { top: 0, textStyle: axisText },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: { ...axisText, hideOverlap: true },
      },
      yAxis: {
        type: "value",
        axisLabel: { ...axisText, formatter: tooltipValue(format) },
        splitLine: { lineStyle: { color: SPLIT_COLOR } },
      },
      series: [
        {
          name: "Historico",
          type: "line",
          data: historico,
          connectNulls: false,
          showSymbol: false,
        },
        {
          name: "Proyeccion",
          type: "line",
          data: proyeccion,
          connectNulls: false,
          showSymbol: false,
          lineStyle: { type: "dashed" },
        },
      ],
    },
  };
}
