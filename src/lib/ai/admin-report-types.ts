/**
 * Contrato de bloques del Asistente Administrativo.
 * Espeja `admin-report.schema.ts` del backend: el modelo entrega datos,
 * el frontend decide como renderizarlos.
 */

export type AdminReportValueFormat =
  | "currency"
  | "number"
  | "percentage"
  | "text";

export type AdminReportTextKind =
  | "observacion"
  | "inferencia"
  | "recomendacion"
  | "prediccion"
  | "simulacion"
  | "conclusion"
  | "contexto";

export type AdminReportPriority = "alta" | "media" | "baja";

export type AdminReportKpiItem = {
  label: string;
  value: number;
  format: Exclude<AdminReportValueFormat, "text">;
  change?: number;
  hint?: string;
};

export type AdminReportTableColumn = {
  label: string;
  format?: AdminReportValueFormat;
};

export type AdminReportTableRow = {
  cells: string[];
};

export type AdminReportChartPoint = {
  x: string;
  /** Nombre legible del punto. En scatter identifica el producto. */
  label?: string;
  series: { key: string; value: number }[];
};

export type AdminReportChartType = "bar" | "line" | "pie" | "scatter";

/** Punto de una serie de pronostico. La banda solo existe en lo proyectado. */
export type AdminReportForecastPoint = {
  date: string;
  value: number;
  lower?: number;
  upper?: number;
};

export type AdminReportForecastError = {
  mae?: number;
  rmse?: number;
  mape?: number;
};

export type AdminReportRecommendation = {
  action: string;
  reason: string;
  evidence?: string;
  expectedImpact?: string;
  risk?: string;
  priority: AdminReportPriority;
};

export type AdminReportBlockType =
  | "text"
  | "kpis"
  | "table"
  | "chart"
  | "recommendations"
  | "warning"
  | "forecast"
  | "anomaly"
  | "insight"
  | "scenario"
  | "comparison"
  | "diagram"
  | "segment";

export type AdminInsightPriority =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "opportunity";

export type AdminEvidenceLevel = "high" | "medium" | "limited";
export type AdminInsightClassification =
  | "observed"
  | "inference"
  | "recommendation"
  | "prediction"
  | "simulation";

export type AdminReportMetricValue = {
  label: string;
  value: number;
  format?: AdminReportValueFormat;
  status?: "observed" | "forecast" | "simulated";
};

export type AdminComparisonOption = {
  name: string;
  description: string;
  evidence: AdminEvidenceLevel;
  advantages: string[];
  risks: string[];
  expectedDirection: string;
  requirements: string[];
};

export type AdminDiagramNode = {
  id: string;
  label: string;
  value?: number;
  format?: AdminReportValueFormat;
  classification?: "observed" | "inference";
  evidence?: AdminEvidenceLevel;
};

export type AdminDiagramEdge = {
  from: string;
  to: string;
  label?: string;
  rate?: number;
};

export type AdminSegmentItem = {
  label: string;
  segment: string;
  score?: number;
  evidence: AdminEvidenceLevel;
  metrics: AdminReportMetricValue[];
};

export type AdminReportSource = {
  id: string;
  label: string;
  period?: string;
  filters?: string[];
  observedAt: string;
  freshness: "fresh" | "partial" | "stale";
  coverage: "complete" | "partial";
  note?: string;
};

export type AdminReportBlock = {
  type: AdminReportBlockType;
  title?: string;
  content?: string;
  kind?: AdminReportTextKind;
  items?: AdminReportKpiItem[];
  columns?: AdminReportTableColumn[];
  rows?: AdminReportTableRow[];
  chartType?: AdminReportChartType;
  xLabel?: string;
  seriesLabels?: { key: string; label: string }[];
  data?: AdminReportChartPoint[];
  valueFormat?: AdminReportValueFormat;
  recommendations?: AdminReportRecommendation[];
  /** Bloques de pronostico y anomalia. */
  metric?: string;
  metricLabel?: string;
  horizon?: number;
  method?: string;
  quality?: AdminReportPriority;
  historical?: AdminReportForecastPoint[];
  forecast?: AdminReportForecastPoint[];
  error?: AdminReportForecastError;
  note?: string;
  severity?: AdminReportPriority;
  reference?: string;
  observed?: number;
  expected?: string;
  explanation?: string;
  /** Trazabilidad segura hacia report.sourceMetadata. */
  sourceIds?: string[];
  /** Bloque insight. */
  findingId?: string;
  summary?: string;
  classification?: AdminInsightClassification;
  priority?: AdminInsightPriority;
  evidence?: AdminEvidenceLevel;
  change?: number;
  limitations?: string[];
  /** Bloque scenario. */
  scenarioType?: "pessimistic" | "base" | "optimistic" | "custom";
  status?: "simulated";
  baseline?: AdminReportMetricValue[];
  result?: AdminReportMetricValue[];
  assumptions?: string[];
  /** Bloque comparison. */
  options?: AdminComparisonOption[];
  recommendedOption?: string;
  recommendationReason?: string;
  /** Bloque diagram. */
  diagramType?: "flow" | "funnel" | "cause-tree";
  nodes?: AdminDiagramNode[];
  edges?: AdminDiagramEdge[];
  /** Bloque segment. */
  segmentType?: "product" | "customer" | "cohort";
  methodology?: string;
  thresholds?: string[];
  segmentItems?: AdminSegmentItem[];
};

export type AdminReport = {
  summary: string;
  confidence: AdminReportPriority;
  blocks: AdminReportBlock[];
  /** Siguientes preguntas sugeridas segun lo que se acaba de analizar. */
  suggestedQuestions?: string[];
  sourceMetadata?: AdminReportSource[];
};

export type AdminReportToolCall = {
  toolName: string;
  durationMs: number;
  success: boolean;
  resultSize: number;
  periodLabel?: string;
  errorMessage?: string;
};

/** Trazabilidad del pronostico: que modelo estadistico se uso realmente. */
export type AdminReportForecastTrace = {
  metric: string;
  method: string;
  observations: number;
  horizon: number;
  quality: string;
  mae: number | null;
};

export type AdminReportTrace = {
  toolsUsed: string[];
  toolCalls: AdminReportToolCall[];
  investigationRounds: number;
  reachedToolLimit: boolean;
  model: string;
  durationMs: number;
  totalAgentDuration: number;
  geminiDuration: number;
  toolDuration: number;
  numberOfToolCalls: number;
  slowestTools: Array<{ label: string; durationMs: number; success: boolean }>;
  sourceTimestamps: string[];
  timeZone: string;
  forecasts?: AdminReportForecastTrace[];
  anomaliesDetected?: number;
};

export type AdminReportResult = {
  report: AdminReport;
  trace: AdminReportTrace;
};

export type AdminAssistantSession = {
  id: string;
  userId: string;
  title: string;
  turns: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminAssistantTurn = {
  id: string;
  sessionId: string;
  question: string;
  summary: string;
  report: AdminReport | null;
  trace: AdminReportTrace | null;
  success: boolean;
  createdAt: string | null;
};

export type AdminAssistantStreamHandlers = {
  onStatus?: (status: string) => void;
  onFinal?: (result: AdminReportResult) => void;
  onError?: (error: Error) => void;
};
