import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminChartModel,
  buildForecastChartModel,
} from "./admin-report-echarts";
import type { AdminReportBlock } from "./admin-report-types";

const productChart: AdminReportBlock = {
  type: "chart",
  chartType: "bar",
  title: "Ingresos por producto",
  xLabel: "Producto",
  valueFormat: "currency",
  seriesLabels: [{ key: "revenue", label: "Ingresos" }],
  data: [
    { x: "Jersey Leon Local cab", series: [{ key: "revenue", value: 8495 }] },
    { x: "Polo verde cha", series: [{ key: "revenue", value: 2847 }] },
    { x: "Gorra negro/blanco", series: [{ key: "revenue", value: 798 }] },
  ],
};

test("buildAdminChartModel maps ranking schema to horizontal echarts bars", () => {
  const model = buildAdminChartModel(productChart);
  assert.ok(model);
  assert.ok(model.height >= 280);
  const option = model.option;
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis;
  const series = option.series;
  assert.equal(yAxis?.type, "category");
  assert.ok(Array.isArray(series));
  assert.equal(series[0]?.type, "bar");
  assert.deepEqual(series[0]?.data, [8495, 2847, 798]);
});

test("buildAdminChartModel maps pie slices from the same schema", () => {
  const model = buildAdminChartModel({ ...productChart, chartType: "pie" });
  assert.ok(model);
  const series = model.option.series;
  assert.ok(Array.isArray(series));
  assert.equal(series[0]?.type, "pie");
  assert.deepEqual(
    (series[0]?.data as Array<{ name: string; value: number }>).map((slice) => [
      slice.name,
      slice.value,
    ]),
    [
      ["Jersey Leon Local cab", 8495],
      ["Polo verde cha", 2847],
      ["Gorra negro/blanco", 798],
    ],
  );
});

test("buildAdminChartModel maps line series for daily points", () => {
  const model = buildAdminChartModel({
    type: "chart",
    chartType: "line",
    valueFormat: "currency",
    data: [
      { x: "2026-08-24", series: [{ key: "revenue", value: 1250 }] },
      { x: "2026-08-25", series: [{ key: "revenue", value: 2100 }] },
    ],
  });
  assert.ok(model);
  const xAxis = Array.isArray(model.option.xAxis)
    ? model.option.xAxis[0]
    : model.option.xAxis;
  const series = model.option.series;
  assert.equal(xAxis?.type, "category");
  assert.ok(Array.isArray(series));
  assert.equal(series[0]?.type, "line");
  assert.deepEqual(series[0]?.data, [1250, 2100]);
});

test("buildAdminChartModel returns null without points", () => {
  assert.equal(
    buildAdminChartModel({ type: "chart", chartType: "bar", data: [] }),
    null,
  );
});

test("buildForecastChartModel keeps historical and projected series", () => {
  const model = buildForecastChartModel({
    type: "forecast",
    metric: "revenue",
    valueFormat: "currency",
    historical: [
      { date: "2026-08-24", value: 1000 },
      { date: "2026-08-25", value: 1200 },
    ],
    forecast: [{ date: "2026-08-26", value: 1100 }],
  });
  assert.ok(model);
  const series = model.option.series;
  assert.ok(Array.isArray(series));
  assert.equal(series[0]?.name, "Historico");
  assert.equal(series[1]?.name, "Proyeccion");
  assert.deepEqual(series[0]?.data, [1000, 1200, null]);
  assert.deepEqual(series[1]?.data, [null, 1200, 1100]);
});
