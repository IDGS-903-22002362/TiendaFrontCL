import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAdminReportChange,
  formatAdminReportValue,
  normalizeAdminReport,
  normalizeAdminReportTrace,
} from "./admin-report";

test("normalizeAdminReport keeps renderable blocks and drops broken ones", () => {
  const report = normalizeAdminReport({
    summary: "  Las ventas bajaron 12% contra la semana previa.  ",
    confidence: "alta",
    blocks: [
      { type: "text", kind: "observacion", content: "Ingresos de 1,000 MXN." },
      { type: "text", content: "   " },
      { type: "kpis", items: [{ label: "Ingresos", value: 1000, format: "currency", change: -12 }] },
      { type: "kpis", items: [{ label: "", value: 5, format: "number" }] },
      { type: "table", columns: [{ label: "Producto" }], rows: [] },
      { type: "chart", chartType: "line", data: [] },
      { type: "unknown", content: "x" },
    ],
  });

  assert.ok(report);
  assert.equal(report.summary, "Las ventas bajaron 12% contra la semana previa.");
  assert.equal(report.confidence, "alta");
  assert.deepEqual(
    report.blocks.map((block) => block.type),
    ["text", "kpis"],
  );
  assert.equal(report.blocks[1].items?.[0].change, -12);
});

test("normalizeAdminReport pads table rows to the column count", () => {
  const report = normalizeAdminReport({
    summary: "Top de productos.",
    confidence: "media",
    blocks: [
      {
        type: "table",
        columns: [
          { label: "Producto" },
          { label: "Ingresos", format: "currency" },
          { label: "Unidades", format: "number" },
        ],
        rows: [
          { cells: ["Jersey local", "1500.5", "3", "sobrante"] },
          { cells: ["Jersey visita"] },
          { cells: [] },
        ],
      },
    ],
  });

  assert.ok(report);
  assert.deepEqual(report.blocks[0].rows, [
    { cells: ["Jersey local", "1500.5", "3"] },
    { cells: ["Jersey visita", "", ""] },
  ]);
});

test("normalizeAdminReport requires chart type and at least one point", () => {
  const invalid = normalizeAdminReport({
    summary: "Tendencia.",
    confidence: "baja",
    blocks: [
      { type: "chart", chartType: "donut", data: [{ x: "2026-03-01", series: [{ key: "revenue", value: 10 }] }] },
      { type: "chart", chartType: "bar", data: [{ x: "", series: [] }] },
    ],
  });

  assert.ok(invalid);
  assert.equal(invalid.blocks.length, 0);

  const valid = normalizeAdminReport({
    summary: "Tendencia.",
    confidence: "baja",
    blocks: [
      {
        type: "chart",
        chartType: "line",
        xLabel: "Dia",
        seriesLabels: [{ key: "revenue", label: "Ingresos" }],
        valueFormat: "currency",
        data: [
          { x: "2026-03-01", series: [{ key: "revenue", value: 100 }] },
          { x: "2026-03-02", series: [{ key: "revenue", value: "no-numero" }] },
        ],
      },
    ],
  });

  assert.ok(valid);
  assert.equal(valid.blocks.length, 1);
  assert.equal(valid.blocks[0].data?.length, 1);
});

test("normalizeAdminReport keeps forecast blocks with a projected series", () => {
  const report = normalizeAdminReport({
    summary: "Proyeccion de ingresos.",
    confidence: "media",
    blocks: [
      {
        type: "forecast",
        title: "Ingresos proyectados",
        metric: "revenue",
        metricLabel: "Ingresos",
        horizon: 7,
        method: "seasonal_naive",
        quality: "media",
        valueFormat: "currency",
        error: { mae: 120.5, mape: 8.2 },
        historical: [
          { date: "2026-08-10", value: 1000 },
          { date: "2026-08-11", value: "1200" },
          { date: "", value: 900 },
        ],
        forecast: [
          { date: "2026-08-12", value: 1100, lower: 900, upper: 1300 },
          { date: "2026-08-13", value: "no-numero" },
        ],
      },
      {
        type: "forecast",
        metric: "orders",
        historical: [{ date: "2026-08-10", value: 5 }],
        forecast: [],
      },
    ],
  });

  assert.ok(report);
  assert.equal(report.blocks.length, 1);

  const forecast = report.blocks[0];
  assert.equal(forecast.metric, "revenue");
  assert.equal(forecast.horizon, 7);
  assert.equal(forecast.quality, "media");
  assert.equal(forecast.error?.mae, 120.5);
  assert.equal(forecast.historical?.length, 2);
  assert.deepEqual(forecast.forecast, [
    { date: "2026-08-12", value: 1100, lower: 900, upper: 1300 },
  ]);
});

test("normalizeAdminReport keeps anomaly blocks with observed and expected values", () => {
  const report = normalizeAdminReport({
    summary: "Revisar conversion.",
    confidence: "alta",
    blocks: [
      {
        type: "anomaly",
        metric: "conversion",
        metricLabel: "Conversion",
        severity: "alta",
        observed: 0.4,
        expected: "entre 1.8% y 2.6%",
        explanation: "La conversion cayo por debajo del rango de las ultimas 4 semanas.",
        reference: "2026-08-19",
        valueFormat: "percentage",
      },
      {
        type: "anomaly",
        metric: "visitas",
        observed: 10,
        expected: "entre 20 y 40",
      },
    ],
  });

  assert.ok(report);
  assert.equal(report.blocks.length, 1);
  assert.equal(report.blocks[0].severity, "alta");
  assert.equal(report.blocks[0].observed, 0.4);
  assert.equal(report.blocks[0].reference, "2026-08-19");
});

test("normalizeAdminReport requires three points for scatter charts", () => {
  const point = (x: string, value: number) => ({
    x,
    label: `Producto ${x}`,
    series: [{ key: "units", value }],
  });

  const insufficient = normalizeAdminReport({
    summary: "Relacion vistas y ventas.",
    confidence: "baja",
    blocks: [
      { type: "chart", chartType: "scatter", data: [point("10", 1), point("20", 2)] },
    ],
  });

  assert.ok(insufficient);
  assert.equal(insufficient.blocks.length, 0);

  const valid = normalizeAdminReport({
    summary: "Relacion vistas y ventas.",
    confidence: "baja",
    blocks: [
      {
        type: "chart",
        chartType: "scatter",
        xLabel: "Vistas",
        data: [point("10", 1), point("20", 2), point("30", 4)],
      },
    ],
  });

  assert.ok(valid);
  assert.equal(valid.blocks.length, 1);
  assert.equal(valid.blocks[0].chartType, "scatter");
  assert.equal(valid.blocks[0].data?.[0].label, "Producto 10");
});

test("normalizeAdminReport dedupes and caps suggested questions", () => {
  const report = normalizeAdminReport({
    summary: "Resumen.",
    confidence: "media",
    blocks: [],
    suggestedQuestions: [
      "Comparar con el mes anterior",
      "comparar con el mes anterior",
      "  Analizar el funnel  ",
      "",
      "x",
      "Ver productos con mayor caida",
      "Proyectar los proximos 7 dias",
      "Revisar inventario",
      "Ver trafico por dia",
    ],
  });

  assert.ok(report);
  assert.deepEqual(report.suggestedQuestions, [
    "Comparar con el mes anterior",
    "Analizar el funnel",
    "Ver productos con mayor caida",
    "Proyectar los proximos 7 dias",
    "Revisar inventario",
  ]);
});

test("normalizeAdminReport rejects payloads without summary", () => {
  assert.equal(normalizeAdminReport({ blocks: [] }), null);
  assert.equal(normalizeAdminReport(null), null);
  assert.equal(normalizeAdminReport("texto libre"), null);
});

test("normalizeAdminReport keeps recommendations with action and reason", () => {
  const report = normalizeAdminReport({
    summary: "Acciones sugeridas.",
    confidence: "media",
    blocks: [
      {
        type: "recommendations",
        recommendations: [
          { action: "Revisar stock", reason: "Hay 3 productos agotados", priority: "urgente" },
          { action: "", reason: "sin accion", priority: "alta" },
        ],
      },
    ],
  });

  assert.ok(report);
  assert.equal(report.blocks[0].recommendations?.length, 1);
  assert.equal(report.blocks[0].recommendations?.[0].priority, "media");
});

test("normalizeAdminReportTrace exposes tools, periods and failures", () => {
  const trace = normalizeAdminReportTrace({
    toolsUsed: ["get_sales_summary", "get_inventory_health"],
    toolCalls: [
      { toolName: "get_sales_summary", durationMs: 120, success: true, resultSize: 300, periodLabel: "hoy" },
      { toolName: "get_inventory_health", success: false, errorMessage: "Firestore no disponible" },
    ],
    investigationRounds: 2,
    reachedToolLimit: false,
    model: "gemini-3.7-flash",
    durationMs: 4200,
    timeZone: "America/Mexico_City",
    forecasts: [
      {
        metric: "revenue",
        method: "damped_trend",
        observations: 90,
        horizon: 7,
        quality: "media",
        mae: 118.4,
      },
    ],
    anomaliesDetected: 2,
  });

  assert.deepEqual(trace.toolsUsed, ["get_sales_summary", "get_inventory_health"]);
  assert.equal(trace.toolCalls[0].periodLabel, "hoy");
  assert.equal(trace.toolCalls[1].success, false);
  assert.equal(trace.toolCalls[1].errorMessage, "Firestore no disponible");
  assert.equal(trace.investigationRounds, 2);
  assert.equal(trace.forecasts?.[0].method, "damped_trend");
  assert.equal(trace.forecasts?.[0].observations, 90);
  assert.equal(trace.anomaliesDetected, 2);
});

test("formatAdminReportValue applies the declared format", () => {
  assert.match(formatAdminReportValue(1500.5, "currency"), /1,500\.5/);
  assert.equal(formatAdminReportValue("12.5", "percentage"), "12.5%");
  assert.equal(formatAdminReportValue(1200, "number"), "1,200");
  assert.equal(formatAdminReportValue("Jersey local", "currency"), "Jersey local");
  assert.equal(formatAdminReportValue("Jersey local"), "Jersey local");
  assert.equal(formatAdminReportChange(-7.4), "-7.4%");
  assert.equal(formatAdminReportChange(7.4), "+7.4%");
});
