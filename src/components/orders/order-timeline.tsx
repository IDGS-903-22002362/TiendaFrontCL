import type { Orden, OrderStatusHistoryEntry } from "@/lib/types";
import {
  getShippingStatusLabel,
  PREPARATION_STATUS_LABEL,
} from "@/lib/orders/status";

type TimelineItem = {
  label: string;
  date?: string;
  note?: string;
};

function formatDateTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeHistoryEntry(entry: OrderStatusHistoryEntry): string {
  const to = entry.to || "";
  if (entry.type === "fulfillment_status_change") {
    return PREPARATION_STATUS_LABEL[to.toUpperCase()] ?? getShippingStatusLabel(to);
  }
  return getShippingStatusLabel(to);
}

/**
 * Linea de tiempo del pedido. Combina eventos base (creado, pago confirmado)
 * con el historial real de cambios de envio/preparacion del backend.
 */
export function OrderTimeline({ order }: { order: Orden }) {
  const items: TimelineItem[] = [];

  items.push({ label: "Pedido creado", date: order.createdAt });

  // Pago confirmado (si aplica)
  const paid = String(order.paymentStatus || "").toUpperCase() === "PAGADO";
  if (paid || order.estado === "CONFIRMADA" || order.estado === "ENTREGADA") {
    items.push({ label: "Pago confirmado" });
  }

  const history = Array.isArray(order.shippingHistory)
    ? [...order.shippingHistory].sort((a, b) => {
        const first = new Date(a.changedAt ?? 0).getTime();
        const second = new Date(b.changedAt ?? 0).getTime();
        return first - second;
      })
    : [];

  for (const entry of history) {
    items.push({
      label: describeHistoryEntry(entry),
      date: entry.changedAt,
      note: entry.note,
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay eventos registrados para este pedido.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="relative">
          <span className="absolute -left-[1.42rem] top-1 h-3 w-3 rounded-full border-2 border-primary bg-card" />
          <p className="text-sm font-medium text-foreground">{item.label}</p>
          {formatDateTime(item.date) ? (
            <p className="text-xs text-muted-foreground">
              {formatDateTime(item.date)}
            </p>
          ) : null}
          {item.note ? (
            <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
