export type PosCapability =
  | "pos.access"
  | "pos.sale.create"
  | "pos.sale.suspend"
  | "pos.sale.resume"
  | "pos.sale.cancel_unpaid"
  | "pos.sale.cancel_paid"
  | "pos.sale.discount_manual"
  | "pos.sale.refund"
  | "pos.ticket.read"
  | "pos.ticket.reprint"
  | "register.read_own"
  | "register.read_all"
  | "register.open"
  | "register.close"
  | "register.force_close"
  | "register.block"
  | "shift.start"
  | "shift.end_own"
  | "shift.handoff"
  | "shift.read_own"
  | "shift.read_all"
  | "cash_movement.create"
  | "cash_movement.approve"
  | "cash_drop.request"
  | "cash_drop.approve"
  | "cash_transfer.request"
  | "cash_transfer.confirm"
  | "cut.create_own"
  | "cut.read_own"
  | "cut.read_all"
  | "cut.review"
  | "cut.approve"
  | "cut.reject"
  | "cut.request_second_count"
  | "cut.reopen"
  | "incident.create"
  | "incident.resolve"
  | "daily_close.preview"
  | "daily_close.execute"
  | "daily_close.force"
  | "report.read_own"
  | "report.read_all"
  | "audit.read"
  | "pos.config.manage";

export type PosActor = {
  uid: string;
  name: string | null;
  email: string | null;
  baseRole: string;
  posRole: string;
  capabilities: PosCapability[];
};

export type PosSettings = {
  storeId: string;
  storeName: string;
  timezone: string;
  currency: string;
  denominationsMinor: number[];
  maxLinesPerSale: number;
  maxQuantityPerLine: number;
  maxNoteLength: number;
  maxSaleTotalMinor: number;
  cashMovementMaxMinor: number;
  openingFloatMaxMinor: number;
  suspendedSaleTtlMinutes: number;
  manualDiscountMaxPercent: number;
  ticketFooterLegend: string;
};

export type PosRegister = {
  id: string;
  code: string;
  name: string;
  status: "AVAILABLE" | "OPEN" | "BLOCKED" | "MAINTENANCE" | "ARCHIVED";
  config: {
    deviceId?: string | null;
    printerId?: string | null;
    terminalId?: string | null;
    allowCash: boolean;
    allowCardExternal: boolean;
  };
  activeSessionId: string | null;
  currentShiftId: string | null;
  currentCashierUid: string | null;
  blockedReason?: string | null;
};

export type PosShift = {
  id: string;
  sessionId: string;
  registerId: string;
  registerCode: string;
  operationalDate: string;
  cashierUid: string;
  cashierName?: string;
  status: string;
  receivedFloatMinor: number;
  totals: {
    salesCount: number;
    netSalesMinor: number;
    cashSalesMinor: number;
    cardSalesMinor: number;
  };
  startedAt: string;
};

export type PosSaleItem = {
  itemId: string;
  productoId: string;
  clave: string;
  descripcion: string;
  tallaId: string | null;
  tallaCodigo?: string | null;
  quantity: number;
  unitPriceOriginalMinor: number;
  unitPriceMinor: number;
  offerDiscountMinor: number;
  codeDiscountMinor: number;
  manualDiscountMinor: number;
  lineTotalMinor: number;
  returnedQuantity: number;
};

export type PosSale = {
  id: string;
  folio: string;
  registerId: string;
  registerCode: string;
  sessionId: string;
  shiftId: string;
  operationalDate: string;
  status:
    | "DRAFT"
    | "SUSPENDED"
    | "PAYMENT_PENDING"
    | "PAID"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED"
    | "VOIDED"
    | "CANCELLED";
  items: PosSaleItem[];
  totals: {
    subtotalOriginalMinor: number;
    offerDiscountMinor: number;
    codeDiscountMinor: number;
    manualDiscountMinor: number;
    discountMinor: number;
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
  };
  appliedCode: { codigo: string; discountMinor: number } | null;
  payment: {
    paidMinor: number;
    pendingMinor: number;
    cashMinor: number;
    cardMinor: number;
    changeMinor: number;
  };
  customerName?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PosCashMovement = {
  id: string;
  type: string;
  status: string;
  amountMinor: number;
  direction: "IN" | "OUT";
  reason: string;
  description?: string | null;
  createdAt: string;
};

export type PosTicket = {
  saleId: string;
  folio: string;
  issuedAt: string;
  store: { name: string; address?: string; phone?: string };
  register: { id: string; code: string };
  cashier: { uid: string; name?: string };
  items: Array<{
    clave: string;
    descripcion: string;
    tallaCodigo?: string | null;
    quantity: number;
    unitPriceMinor: number;
    discountMinor: number;
    lineTotalMinor: number;
  }>;
  totals: PosSale["totals"];
  payments: Array<{
    method: "CASH" | "CARD_EXTERNAL";
    amountMinor: number;
    receivedMinor: number | null;
    changeMinor: number | null;
    reference?: string | null;
  }>;
  receivedMinor: number;
  changeMinor: number;
  currency: string;
  legend: string;
};

export type PosContext = {
  actor: PosActor;
  operationalDate: string;
  appCheckVerified: boolean;
  activeShift: PosShift | null;
  register: {
    register: PosRegister;
    session: { id: string; status: string; openingFloatMinor: number } | null;
    shift: PosShift | null;
    expectedCashMinor: number | null;
  } | null;
  settings: PosSettings;
};

export type PosPage<T> = {
  items: T[];
  pagination: { nextCursor: string | null; hasMore: boolean };
};

export type PosShiftReportRow = {
  shiftId: string;
  operationalDate: string;
  registerId: string;
  registerCode: string;
  cashierUid: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  receivedFloatMinor: number;
  salesCount: number;
  netSalesMinor: number;
  cashSalesMinor: number;
  cardSalesMinor: number;
  cutId: string | null;
  cutFolio: string | null;
  cutStatus: string | null;
  classification: string | null;
  expectedCashMinor: number | null;
  countedCashMinor: number | null;
  differenceMinor: number | null;
};

export type PosShiftReport = {
  range: { from: string; to: string };
  rows: PosShiftReportRow[];
  totals: {
    shiftCount: number;
    salesCount: number;
    netSalesMinor: number;
    cashSalesMinor: number;
    cardSalesMinor: number;
    refundsMinor: number;
    expectedCashMinor: number | null;
    countedCashMinor: number | null;
    differenceMinor: number | null;
  };
  truncated: boolean;
};

export type PosDailySummaryRow = {
  operationalDate: string;
  status: string;
  registerCount: number;
  shiftCount: number;
  salesCount: number;
  netSalesMinor: number;
  refundsMinor: number;
  expectedCashMinor: number;
  countedCashMinor: number;
  differenceMinor: number;
  shortageMinor: number;
  overageMinor: number;
  forced: boolean;
  closedAt: string | null;
};

export type PosDailySummaryReport = {
  range: { from: string; to: string };
  rows: PosDailySummaryRow[];
  totals: {
    dayCount: number;
    closedDayCount: number;
    netSalesMinor: number;
    refundsMinor: number;
    differenceMinor: number;
  };
};

export type PosCutSummary = {
  id: string;
  folio: string;
  operationalDate: string;
  registerId: string;
  registerCode: string;
  shiftId: string | null;
  cashierUid: string | null;
  status: string;
  classification: string | null;
  scope: string;
  totals: {
    expectedCashMinor: number;
    countedCashMinor: number;
    differenceMinor: number;
    netSalesMinor?: number;
    salesCount?: number;
  } | null;
  blindForActor?: boolean;
  createdAt: string;
};

export type PosPaymentMethodBreakdown = {
  method: "CASH" | "CARD_EXTERNAL" | string;
  count: number;
  amountMinor: number;
  refundedMinor: number;
  netMinor: number;
};

export type PosCutTotals = {
  openingFloatMinor: number;
  salesCount: number;
  grossSalesMinor: number;
  discountMinor: number;
  netSalesMinor: number;
  cancelledCount: number;
  voidedMinor: number;
  returnsCount: number;
  refundsMinor: number;
  cashRefundsMinor: number;
  cardRefundsMinor: number;
  cashInMinor: number;
  cashOutMinor: number;
  securityDropsMinor: number;
  transfersInMinor: number;
  transfersOutMinor: number;
  adjustmentsMinor: number;
  paymentBreakdown: PosPaymentMethodBreakdown[];
  expectedCashMinor: number;
  countedCashMinor: number;
  differenceMinor: number;
};

export type PosCutDetail = {
  id: string;
  folio: string;
  storeId: string;
  scope: string;
  operationalDate: string;
  registerId: string;
  registerCode: string;
  sessionId: string;
  shiftId: string | null;
  cashierUid: string | null;
  status: string;
  classification: string | null;
  toleranceMinor: number;
  requiredApproverRole: string;
  totals: PosCutTotals | null;
  cashCountId: string | null;
  cashCountVersion: number;
  version: number;
  observations: string | null;
  rejectionReason?: string | null;
  escalationReason?: string | null;
  reopenReason?: string | null;
  incidentIds: string[];
  reviewerUid?: string | null;
  approverUid?: string | null;
  startedAt: string;
  endedAt: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  dailyCloseId?: string | null;
  createdAt: string;
  updatedAt: string;
  blindForActor?: boolean;
};

export type PosCashCount = {
  id: string;
  shiftId: string;
  version: number;
  status: string;
  blind: boolean;
  denominations: Array<{
    denominationMinor: number;
    pieces: number;
    subtotalMinor: number;
  }>;
  countedCashMinor: number | null;
  countedBy: string;
  note?: string | null;
  submittedAt?: string | null;
  blindForActor?: boolean;
};

export type PosCutPreview = {
  cut: PosCutDetail | null;
  shiftId: string;
  registerId: string;
  registerCode: string;
  sessionId: string;
  cashierUid: string;
  operationalDate: string;
  shiftStatus: string;
  startedAt: string;
  receivedFloatMinor: number;
  blocking: {
    pendingSales: number;
    unresolvedMovements: number;
    canStartOrContinue: boolean;
    messages: string[];
  };
  totals: PosCutTotals;
};

export type PosAuditEvent = {
  id: string;
  eventType: string;
  entity: string;
  entityId: string;
  actorUid: string;
  actorName?: string | null;
  operationalDate?: string | null;
  registerId?: string | null;
  sessionId?: string | null;
  shiftId?: string | null;
  reason?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: string;
};

export function describeCashDifference(differenceMinor: number): string {
  if (differenceMinor === 0) return "Cuadrado";
  if (differenceMinor < 0) {
    return `Faltante de ${formatDifferenceMoney(Math.abs(differenceMinor))}`;
  }
  return `Sobrante de ${formatDifferenceMoney(differenceMinor)}`;
}

function formatDifferenceMoney(minor: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function mapCutOperationalLabel(status: string): string {
  switch (status) {
    case "COUNTING":
      return "En conteo";
    case "DRAFT":
      return "Borrador";
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "SECOND_COUNT_REQUIRED":
    case "ESCALATED":
      return "En revisión";
    case "APPROVED":
    case "CLOSED":
      return "Cerrado";
    case "REJECTED":
      return "Rechazado";
    case "REOPENED":
      return "Reabierto";
    default:
      return status;
  }
}

export function mapCutReconciliationLabel(
  status: string,
  classification: string | null | undefined,
  differenceMinor: number | null | undefined,
): string {
  if (status === "APPROVED" || status === "CLOSED") {
    if (!differenceMinor) return "Cuadrado";
    if (classification === "WITHIN_TOLERANCE") return "Dentro de tolerancia";
    if (differenceMinor < 0) return "Faltante aceptado";
    return "Sobrante aceptado";
  }
  if (status === "COUNTING" || status === "DRAFT") return "Pendiente";
  if (status === "REJECTED") return "Revisión requerida";
  return "Pendiente de revisión";
}
