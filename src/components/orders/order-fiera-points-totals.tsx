import { formatCurrency } from "@/lib/storefront";
import {
  getFieraPointsEarnNote,
  getFieraPointsRedemptionDetail,
  getOrderCashPaidAmount,
  getOrderMerchandiseTotal,
  getOrderPaymentComposition,
} from "@/lib/orders/fiera-points";
import type { Orden } from "@/lib/types";

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className={emphasize ? "font-semibold text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={
          emphasize
            ? "text-right font-headline text-lg font-bold text-secondary"
            : "text-right font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function OrderFieraPointsTotals({
  order,
  shippingLabel,
  shippingValue,
  extraRows,
}: {
  order: Orden;
  shippingLabel: string;
  shippingValue: string;
  extraRows?: Array<{ label: string; value: string }>;
}) {
  const composition = getOrderPaymentComposition(order);
  const merchandiseTotal = getOrderMerchandiseTotal(order);
  const cashPaid = getOrderCashPaidAmount(order);
  const detail = getFieraPointsRedemptionDetail(order);
  const earnNote = getFieraPointsEarnNote(order);
  const paidLabel = composition
    ? cashPaid > 0
      ? "Pagado con tarjeta"
      : "Pagado con FieraPuntos"
    : "Total";

  return (
    <div className="space-y-2">
      <Row label="Subtotal" value={formatCurrency(order.subtotal ?? 0)} />
      {extraRows?.map((row) => (
        <Row key={row.label} label={row.label} value={row.value} />
      ))}
      <Row label={shippingLabel} value={shippingValue} />
      {composition ? (
        <>
          <Row
            label="Total de la compra"
            value={formatCurrency(merchandiseTotal)}
          />
          <Row
            label={`FieraPuntos (${composition.pointsUsed.toLocaleString("es-MX")} pts)`}
            value={`- ${formatCurrency(composition.pointsDiscountMinor / 100)}`}
          />
          {detail ? (
            <p className="rounded-[1rem] border border-[#D9A928]/35 bg-[#D9A928]/10 px-3 py-2 text-xs leading-5 text-[#073A26]">
              {detail}
            </p>
          ) : null}
          {earnNote ? (
            <p className="text-xs leading-5 text-muted-foreground">{earnNote}</p>
          ) : null}
        </>
      ) : null}
      <div className="my-2 h-px bg-border" />
      <Row
        label={paidLabel}
        value={formatCurrency(composition ? cashPaid : order.total)}
        emphasize
      />
    </div>
  );
}
