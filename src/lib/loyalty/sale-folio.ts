export const SALE_FOLIO_MAX_LENGTH = 80;

const SALE_FOLIO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._# -]*$/;

export function normalizeSaleFolio(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function getSaleFolioError(value: string, memberId: string): string | null {
  const normalized = normalizeSaleFolio(value);
  if (!normalized) return "El ID o folio de la venta es obligatorio.";
  if (normalized.length > SALE_FOLIO_MAX_LENGTH) {
    return `El folio no puede exceder ${SALE_FOLIO_MAX_LENGTH} caracteres.`;
  }
  if (!SALE_FOLIO_PATTERN.test(normalized)) {
    return "Usa solo letras, numeros, espacios, punto, guion, guion bajo o #.";
  }
  if (normalized.toLocaleLowerCase() === memberId.trim().toLocaleLowerCase()) {
    return "El folio de venta debe ser distinto del ID del cliente.";
  }
  return null;
}

export function buildStaffSaleIdempotencyKey(
  memberId: string,
  saleFolio: string,
): string {
  return `staff-sale:${memberId.trim()}:${normalizeSaleFolio(saleFolio)}`;
}

export function buildStaffSaleRequest(input: {
  memberId: string;
  saleFolio: string;
  amountCents: number;
  description?: string;
}) {
  const folioVenta = normalizeSaleFolio(input.saleFolio);
  return {
    idempotencyKey: buildStaffSaleIdempotencyKey(input.memberId, folioVenta),
    body: {
      dinero: input.amountCents / 100,
      folioVenta,
      descripcion: input.description?.trim() || `Venta ${folioVenta}`,
    },
  };
}
