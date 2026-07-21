import type { StaffAssignmentHistoryRow } from "@/lib/api/loyalty";

export function buildStaffHistorySearchParams(params: {
  limit?: number;
  cursor?: string;
  search?: string;
  actorId?: string;
}): URLSearchParams {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 20));
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.actorId) query.set("empleadoId", params.actorId);
  return query;
}

export function getHistoryCustomerLabel(row: StaffAssignmentHistoryRow): {
  primary: string;
  secondary: string;
} {
  if (row.customerFullName?.trim()) {
    return {
      primary: row.customerFullName.trim(),
      secondary: `ID: ${row.memberId}`,
    };
  }
  return {
    primary: "Perfil no disponible",
    secondary: `Cliente ${row.memberId}`,
  };
}

export function getHistorySaleLabel(row: StaffAssignmentHistoryRow): string {
  return row.saleId?.trim() || "Folio no disponible";
}

export function formatHistoryAmount(amountMxn: number | null): string {
  if (amountMxn === null || !Number.isFinite(amountMxn)) {
    return "Monto no disponible";
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amountMxn);
}
